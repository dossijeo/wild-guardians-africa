// Historical, fixed-output economics. This is not a rerun or a balance approval.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const ceil=(n,d)=>(n+d-1n)/d;
const integer=v=>{assert.match(String(v),/^-?\d+$/);return BigInt(v);};
const natural=v=>{const n=integer(v);assert.ok(n>=0n);return n;};
const amount=v=>{assert.equal(v.d,'1');return integer(v.n);};
const hash=b=>createHash('sha256').update(b).digest('hex');

export function loadMarginCampaign(directory,balancePath,prefix=''){
 const root=pathToFileURL(directory.replace(/[\\/]$/,'')+'/');
 assert.match(prefix,/^[\w-]*$/);
 const report=JSON.parse(readFileSync(new URL(prefix+'report.json',root),'utf8'));
 const raw=readFileSync(new URL(prefix+'state.json.gz',root)),state=JSON.parse(gunzipSync(raw).toString('utf8'));
 const storedSource=readFileSync(balancePath),source=balancePath.endsWith('.gz')?gunzipSync(storedSource):storedSource;
 const match=source.toString('utf8').match(/export const BALANCE = (\{[\s\S]*\});\s*$/);
 assert.ok(match,'Expected a generated JSON balance, never executable input');
 assert.equal(hash(source),report.provenance.sourceHashes['src/simulation/balance.js'],'Historical balance hash mismatch');
 return {report,state,balance:JSON.parse(match[1]),evidence:{balanceSha256:hash(source),stateGzipSha256:hash(raw),stateSha256:hash(gunzipSync(raw))}};
}

export function analyzeFarmMargin({report,state,balance,evidence=null},{targetMarginPercent=20}={}){
 assert.ok(Number.isSafeInteger(targetMarginPercent)&&targetMarginPercent>=0&&targetMarginPercent<=100);
 const specs=new Map(balance.crops.map(c=>[c.id,c]));
 assert.equal(report.completedNights,state.completedNights);
 assert.equal(report.result,state.result);
 assert.equal(specs.size,balance.crops.length);
 for(const c of specs.values()){assert.ok(natural(c.plant_cost)>0n);assert.ok(natural(c.base_harvest_value)>0n);}
 const plants=new Map(state.plants.map(p=>[p.id,p]));assert.equal(plants.size,state.plants.length);
 const rows=Object.fromEntries([...specs.keys()].map(id=>[id,{planted:0,living:0,picked:0,destroyed:0,delivered:0,inTransit:0,lostBeforeFirstWater:0,seedCosts:0n,income:0n}]));
 const picked=new Set();let income=0n,seeds=0n,wages=0n,repairs=0n,centres=0n,other=0n,ledger=natural(balance.initial_money);
 for(const [id,v] of Object.entries(state.ledger.entries)){
  const n=amount(v);ledger+=n;
  if(id.startsWith('deliver:')){assert.ok(n>=0n);income+=n;}
  else if(id.startsWith('intensive-plant-')){assert.ok(n<0n);seeds-=n;}
  else if(id.startsWith('intensive-hire-')){assert.ok(n<=0n);wages-=n;}
  else if(id.startsWith('repair:')){assert.ok(n<=0n);repairs-=n;}
  else if(id==='center'){assert.ok(n<0n);centres-=n;}
  else other+=n;
 }
 assert.equal(amount(state.ledger.balance),ledger,'Ledger does not reconcile');
 assert.equal(BigInt(state.plants.length),BigInt(Object.keys(state.ledger.entries).filter(id=>id.startsWith('intensive-plant-')).length));
 for(const crate of state.crates){
  const p=plants.get(crate.sourcePlantId),spec=specs.get(crate.species);
  assert.ok(p&&!p.alive&&!picked.has(p.id)&&spec);assert.equal(p.species,crate.species);picked.add(p.id);
  assert.ok(p.growth>=spec.growth_seconds&&p.water.every(w=>['manual','magic'].includes(w.status)),'Harvest lacked completed growth/watering');
  assert.ok(natural(crate.value.n)>0n&&natural(crate.value.d)>0n);
  const row=rows[crate.species],credit=state.ledger.entries['deliver:'+crate.id];
  if(crate.delivered){assert.ok(credit);assert.equal(amount(credit),ceil(natural(crate.value.n),natural(crate.value.d)));row.delivered++;row.income+=amount(credit);}
  else{assert.equal(credit,undefined);row.inTransit++;}
 }
 for(const p of plants.values()){
  const row=rows[p.species];assert.ok(row);row.planted++;row.seedCosts+=natural(specs.get(p.species).plant_cost);
  const allocation=p.alive?'living':picked.has(p.id)?'picked':'destroyed';row[allocation]++;
  if(allocation==='destroyed'&&p.water[0].status==='due')row.lostBeforeFirstWater++;
 }
 assert.equal(Object.values(rows).reduce((n,r)=>n+r.seedCosts,0n),seeds,'Historical seed prices do not reconcile');
 assert.equal(Object.values(rows).reduce((n,r)=>n+r.income,0n),income,'Delivered credits do not reconcile');
 const costs=seeds+wages+repairs,profit=income-costs+other;
 const targetProfit=ceil(costs*BigInt(targetMarginPercent),100n),targetIncome=costs+targetProfit-other;
 const simulatePrices=prices=>{
  let nextIncome=0n;const speciesIncome=Object.fromEntries([...specs.keys()].map(id=>[id,0n]));
  // Reprice the original rational crate value, not its already rounded credit.
  // Retain recorded profile, spells and agricultural bonuses in that value.
  for(const crate of state.crates)if(crate.delivered){
   const value=ceil(natural(crate.value.n)*natural(prices[crate.species]),natural(crate.value.d)*natural(specs.get(crate.species).base_harvest_value));
   nextIncome+=value;speciesIncome[crate.species]+=value;
  }
  const attraction=state.plants.filter(p=>p.alive).reduce((n,p)=>n+natural(prices[p.species]),0n);
  const tier=balance.threat_tiers.find(t=>attraction>=BigInt(t.attraction_min)&&(t.attraction_max_exclusive===null||attraction<BigInt(t.attraction_max_exclusive)));
  return {income:nextIncome,operatingProfit:nextIncome-costs+other,endingBalance:ledger+nextIncome-income,speciesIncome,finalAttraction:attraction,finalThreatTier:tier?{index:balance.threat_tiers.indexOf(tier),attractionMin:tier.attraction_min,threatMin:tier.threat_min,threatMax:tier.threat_max}:null};
 };
 const priceTable=permille=>Object.fromEntries([...specs].map(([id,c])=>[id,Number(ceil(natural(c.base_harvest_value)*BigInt(permille),1000n))]));
 let minimum=null;
 if(income>0n){
  let low=1000,high=1000;
  while(simulatePrices(priceTable(high)).income<targetIncome){high*=2;assert.ok(high<=1024000,'Target is outside diagnostic range');}
  while(low<high){const mid=Math.floor((low+high)/2);if(simulatePrices(priceTable(mid)).income>=targetIncome)high=mid;else low=mid+1;}
  minimum={factorPermille:low,prices:priceTable(low),...simulatePrices(priceTable(low))};
 }
 const daylight=report.daily.length*balance.clock.day_seconds;
 const idle=Object.fromEntries(['budget','space','shift-end'].map(reason=>[reason,report.daily.reduce((n,r)=>n+(r.idle[reason]??0),0)]));
 const speciesBreakEven=id=>{
  const crates=state.crates.filter(c=>c.delivered&&c.species===id),r=rows[id];if(!crates.length)return null;
  const revenue=value=>crates.reduce((n,c)=>n+ceil(natural(c.value.n)*value,natural(c.value.d)*natural(specs.get(id).base_harvest_value)),0n);
  let low=1n,high=1n;while(revenue(high)<r.seedCosts)high*=2n;
  while(low<high){const mid=(low+high)/2n;if(revenue(mid)>=r.seedCosts)high=mid;else low=mid+1n;}return low;
 };
 const result={schema:'wg-fixed-output-margin-1',evidence,baseline:{biome:report.biome,culture:report.culture,completedNights:report.completedNights,result:report.result,policy:report.policy,prices:priceTable(1000),income,seeds,wages,repairs,centres,other,operatingCosts:costs,operatingProfit:profit,endingBalance:ledger,activity:{daylightSeconds:daylight,idleSecondsByReason:idle,unoccupiedFraction:daylight?Object.values(idle).reduce((n,v)=>n+v,0)/daylight:null},finalAttraction:simulatePrices(priceTable(1000)).finalAttraction},bySpecies:Object.fromEntries(Object.entries(rows).map(([id,r])=>[id,{...r,harvestMinusSeedCosts:r.income-r.seedCosts,seedOnlyBreakEvenHarvest:speciesBreakEven(id)}])),target:{marginPercentOfOperatingCosts:targetMarginPercent,profit:targetProfit,income:targetIncome,minimumUniformIncrease:minimum},scenarios:[1000,1100,1250,1500,2000].map(factorPermille=>({factorPermille,prices:priceTable(factorPermille),...simulatePrices(priceTable(factorPermille))})),scope:'Fixed recorded deliveries, labour, losses, bonuses and repair costs. No resimulation, no predicted idle reduction, campaign outcome or approval of prices. Higher yields change attraction, planting, wages and raid behaviour; responsible and poor-management native campaigns remain required. Species break-even covers recorded seeds only, not wages, repairs or future survival.'};
 return JSON.parse(JSON.stringify(result,(_key,v)=>typeof v==='bigint'?String(v):v));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [directory,balancePath,prefix='']=process.argv.slice(2);if(!directory||!balancePath)throw Error('Usage: node tools/analyze_farm_margin.mjs CAMPAIGN_DIRECTORY HISTORICAL_BALANCE.js [FILE_PREFIX]');
 console.log(JSON.stringify(analyzeFarmMargin(loadMarginCampaign(directory,balancePath,prefix)),null,2));
}
