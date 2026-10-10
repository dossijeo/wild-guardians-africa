// Pure, unintegrated candidate. No clock, state, command or damage mutations.
import {BALANCE as B} from './balance.js';
export const RAID_PRESSURE_CANDIDATE=Object.freeze({version:1,emaAlpha:1/3,referenceSpacing:1.5,referenceConeRadians:Math.PI/2,peripheralWeight:.5,qMeanMultiplier:1,activeWaveLimit:16});
const IDS=['warthog','hyena','buffalo','lion','rhino'],SHARES=[.25,.28,.23,.16,.08],CROP=[1,1,2,2,3],RADII=[.7,1.2,2,1.6,2.8];
const finite=(v,label)=>{if(!Number.isFinite(v)||v<0)throw Error('Invalid '+label);return v;};
const day=(d)=>{if(!Number.isSafeInteger(d)||d<1)throw Error('Invalid night');return d;};
const pressure=(p)=>{if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid pressure');return p;};
export function agriculturalRaidValue(plants,balance=B){
 let value=0;for(const p of plants)if(p.alive){const crop=balance.crops.find(c=>c.id===p.species);if(!crop)throw Error('Unknown crop');value+=crop.base_harvest_value;}
 return finite(value,'agricultural value');
}
export function validateRaidPressureMemory(memory){
 if(!memory||memory.version!==1)throw Error('Invalid pressure memory');day(memory.lastDay);finite(memory.ema,'EMA');finite(memory.sample,'sample');return memory;
}
export function updateRaidPressureMemory(previous,d,value,config=RAID_PRESSURE_CANDIDATE){
 day(d);finite(value,'agricultural value');if(!(config.emaAlpha>0&&config.emaAlpha<=1))throw Error('Invalid EMA alpha');
 if(previous){validateRaidPressureMemory(previous);if(d<previous.lastDay)throw Error('Cannot rewind pressure EMA');
  if(d===previous.lastDay)return {...previous};
  if(d!==previous.lastDay+1)throw Error('Missing night samples must not be invented');
 }
 return {version:1,lastDay:d,sample:value,ema:previous?previous.ema+config.emaAlpha*(value-previous.ema):value};
}
export function raidPressure(d,value){
 day(d);finite(value,'agricultural value');return Math.max(0,Math.min(1,.45*(d-1)/99+.55*Math.log1p(value/1000)/Math.log(26)));
}
export function raidPressureSummary(d,value,memory){
 day(d);finite(value,'agricultural value');validateRaidPressureMemory(memory);if(memory.lastDay!==d)throw Error('Plan requires current night EMA sample');
 // EMA is idempotent; caller owns/persists a selected plan, never rerolls it.
 const effectiveValue=Math.max(value,memory.ema),p=raidPressure(d,effectiveValue);
 return {night:d,observedValue:value,capturedValue:memory.sample,effectiveValue,pressure:p,targetAnimals:d<=5?1:Math.round(4+30*p),areaCap:1+Math.floor(6*p),introductory:d<=5};
}
export function raidSpeciesPressure(id,p,balance=B){
 pressure(p);const i=IDS.indexOf(id),a=balance.animals.find(a=>a.id===id);if(i<0||!a)throw Error('Unknown raid species');const extra=Math.floor(2*p);
 return {id,minHits:a.hit_budget_min+extra,maxHits:a.hit_budget_max+extra,cropDamage:CROP[i]+Math.floor(1.5*p),structureDamage:Math.round(a.structure_hit_damage*(1+.5*p)),attackRadius:RADII[i]*(1+.3*p),areaCap:1+Math.floor(6*p)};
}
export function raidCompositionWeights(p,unlocked){
 pressure(p);if(!Array.isArray(unlocked)||!unlocked.length||unlocked.some(id=>!IDS.includes(id)))throw Error('Invalid unlocked species');
 const values=IDS.map((id,i)=>unlocked.includes(id)?(i===0?1-p+p*SHARES[i]:p*SHARES[i]):0),total=values.reduce((n,v)=>n+v,0);
 if(!total)throw Error('Early weak mixture needs unlocked warthog');return values.map(v=>v/total);
}
export function raidCompositionCounts(n,p,unlocked){
 if(!Number.isSafeInteger(n)||n<1||n>34)throw Error('Invalid animal count');const weights=raidCompositionWeights(p,unlocked),counts=weights.map(w=>Math.floor(w*n));
 const fractions=weights.map((w,i)=>({i,remainder:w*n-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
 for(let left=n-counts.reduce((a,b)=>a+b,0),i=0;i<left;i++)counts[fractions[i].i]++;
 return Object.fromEntries(IDS.map((id,i)=>[id,counts[i]]));
}
// Reference crop centres on a1.5m lattice in a90-degree forward cone.
// Central crop contributes1; reachable peripheral centres contribute .5.
// This is a geometric envelope, never a runtime list of damaged plants.
export function referenceRaidArea(spec,config=RAID_PRESSURE_CANDIDATE){
 finite(config.referenceSpacing,'spacing');if(!config.referenceSpacing)throw Error('Zero spacing');
 if(!(config.referenceConeRadians>0&&config.referenceConeRadians<=Math.PI*2))throw Error('Invalid cone');
 if(!(config.peripheralWeight>=0&&config.peripheralWeight<=1))throw Error('Invalid peripheral weight');
 const r=finite(spec.attackRadius,'radius'),points=[];if(r>4||!Number.isSafeInteger(spec.areaCap)||spec.areaCap<1||spec.areaCap>7)throw Error('Unbounded reference geometry');
 const extent=Math.ceil(r/config.referenceSpacing),angle=config.referenceConeRadians/2;
 for(let x=-extent;x<=extent;x++)for(let z=-extent;z<=extent;z++){
  if(!x&&!z)continue;const dx=x*config.referenceSpacing,dz=z*config.referenceSpacing,d=Math.hypot(dx,dz);
  if(d<=r+1e-12&&Math.abs(Math.atan2(dx,dz))<=angle+1e-12)points.push({x:dx,z:dz,distance:d});
 }
 points.sort((a,b)=>a.distance-b.distance||a.x-b.x||a.z-b.z);const selected=points.slice(0,spec.areaCap-1);
 return {effective:1+selected.length*config.peripheralWeight,central:1,peripheral:selected.length,points:selected,scope:'Directional reference lattice only; actual occlusion/Shield/spacing require physical enumeration'};
}
export function raidProductEnvelope(counts,p,config=RAID_PRESSURE_CANDIDATE,balance=B){
 if(!counts||Object.keys(counts).some(id=>!IDS.includes(id)))throw Error('Unknown composition fields');
 const total=Object.values(counts).reduce((n,v)=>n+v,0);if(!Number.isSafeInteger(total)||total<1||total>34)throw Error('Unbounded product cohort');
 const rows=IDS.map(id=>{const count=counts[id]??0;if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid composition count');const s=raidSpeciesPressure(id,p,balance),area=referenceRaidArea(s,config);
  return {...s,count,area:area.effective,minProduct:count*s.minHits*s.cropDamage*area.effective,meanProduct:count*(s.minHits+s.maxHits)/2*s.cropDamage*area.effective,maxProduct:count*s.maxHits*s.cropDamage*area.effective,minStructureProduct:count*s.minHits*s.structureDamage,meanStructureProduct:count*(s.minHits+s.maxHits)/2*s.structureDamage,maxStructureProduct:count*s.maxHits*s.structureDamage};});
 const sum=k=>rows.reduce((n,r)=>n+r[k],0),mean=sum('meanProduct'),min=sum('minProduct');
 if(!(config.qMeanMultiplier>0&&config.qMeanMultiplier<=2))throw Error('Invalid Q multiplier');
 const q=Math.floor(mean*config.qMeanMultiplier*2)/2;
 return {rows,min,mean,max:sum('maxProduct'),structure:{min:sum('minStructureProduct'),mean:sum('meanStructureProduct'),max:sum('maxStructureProduct'),scope:'Alternative all-hits-on-structures envelope, not additive with agricultural damage'},q,feasible:q>=min,units:'Reference agricultural HP-points; no loss fraction or ledger debit'};
}
// Plan composition before drawing hits. Keep finite quotas and full native H ranges.
export function planRaidProductComposition(n,p,unlocked,config=RAID_PRESSURE_CANDIDATE,balance=B,explicitBudget=null){
 const referenceCounts=raidCompositionCounts(n,p,unlocked),reference=raidProductEnvelope(referenceCounts,p,config,balance),weights=raidCompositionWeights(p,unlocked);
 const caps=Object.fromEntries(IDS.map((id,i)=>[id,Math.ceil(n*weights[i])])),rows=reference.rows;
 const cost=row=>row.maxHits*row.cropDamage*row.area;
 const ordered=[...rows].sort((a,b)=>cost(a)-cost(b)||IDS.indexOf(a.id)-IDS.indexOf(b.id));
 const cheapest=Object.fromEntries(IDS.map(id=>[id,0]));let needed=n,minimumLegalWorstCase=0;
 for(const row of ordered){const count=Math.min(needed,caps[row.id]);cheapest[row.id]=count;needed-=count;minimumLegalWorstCase+=count*cost(row);}
 if(needed)throw Error('Composition caps cannot cover cohort');
 const requestedQ=reference.q,q=explicitBudget===null?Math.max(requestedQ,minimumLegalWorstCase):finite(explicitBudget,'explicit Q');
 const meta={referenceCounts,caps,requestedQ,q,minimumLegalWorstCase,qRaisedForRangeSafety:explicitBudget===null&&q>requestedQ,referenceEnvelope:reference};
 if(q+1e-9<minimumLegalWorstCase)return {...meta,status:'infeasible-budget',counts:null,envelope:null,adjustments:[]};
 const counts={...referenceCounts},adjustments=[];let maximum=reference.max;
 while(maximum>q+1e-9){
  let best=null;
  for(const from of rows)if(counts[from.id])for(const to of rows)if(counts[to.id]<caps[to.id]){
   const reduction=cost(from)-cost(to);if(reduction>1e-9&&(!best||reduction>best.reduction+1e-9))best={from:from.id,to:to.id,reduction};
  }
  if(!best)throw Error('Preselection feasibility invariant');
  counts[best.from]--;counts[best.to]++;maximum-=best.reduction;adjustments.push(best);
  if(adjustments.length>n*IDS.length)throw Error('Unbounded composition adjustment');
 }
 const envelope=raidProductEnvelope(counts,p,config,balance);
 return {...meta,status:'planned',counts,envelope:{...envelope,q},adjustments,maximumProduct:envelope.max};
}
function draw(rng){if(!Number.isInteger(rng)||rng<0||rng>4294967295)throw Error('Invalid RNG');rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return {rng:rng>>>0,value:(rng>>>0)/4294967296};}
export function selectBudgetedRaid({night,pressure:p,unlocked,rng,postgame=false,config=RAID_PRESSURE_CANDIDATE,balance=B,qBudget=null}){
 day(night);pressure(p);validateRaidPressureSource(balance);
 if(!Number.isInteger(rng)||rng<0||rng>4294967295)throw Error('Invalid RNG');
 if(postgame)return {status:'peaceful-postgame',actors:[],rng,draws:0};
 validateRaidPressureRuntimeConfig(config);
 if(night<=5){const a=balance.animals[night-1];return {introductory:true,actors:[{species:a.id,hits:a.hit_budget_min}],rng,draws:0,scope:'Existing introduction min-hits and actor; runtime intro cap remains authoritative'};}
 const targetAnimals=Math.round(4+30*p),plan=planRaidProductComposition(targetAnimals,p,unlocked,config,balance,qBudget);
 if(plan.status!=='planned')return {status:'infeasible-budget',targetAnimals,plan,rng,draws:0,actors:[]};
 const {counts,envelope}=plan,remaining={...counts},actors=[];let spentProduct=0,draws=0;
 for(let left=targetAnimals;left>0;left--){
  let r=draw(rng);rng=r.rng;draws++;let rank=Math.floor(r.value*left),row;
  for(const candidate of envelope.rows){if(rank<remaining[candidate.id]){row=candidate;break;}rank-=remaining[candidate.id];}
  r=draw(rng);rng=r.rng;draws++;const hits=row.minHits+Math.floor(r.value*(row.maxHits-row.minHits+1));
  const product=hits*row.cropDamage*row.area;
  actors.push({species:row.id,hits,cropDamage:row.cropDamage,structureDamage:row.structureDamage,attackRadius:row.attackRadius,areaCap:row.areaCap,referenceArea:row.area,product});
  remaining[row.id]--;spentProduct+=product;
 }
 if(spentProduct>plan.q+1e-9)throw Error('Full-range selection exceeds preplanned product budget');
 return {status:'selected',introductory:false,targetAnimals,counts,envelope,plan,actors,rng,draws,spentProduct,remainingProduct:plan.q-spentProduct,waves:Array.from({length:Math.ceil(actors.length/config.activeWaveLimit)},(_,i)=>actors.slice(i*config.activeWaveLimit,(i+1)*config.activeWaveLimit)),scope:'Descriptor selection only; composition fixed before full native-range rolls, no physical damage'};
}
export function validateRaidPressureRuntimeConfig(config){
 const keys=Object.keys(RAID_PRESSURE_CANDIDATE).sort();if(!config||Object.keys(config).sort().join('|')!==keys.join('|'))throw Error('Unknown or missing pressure config fields');
 for(const key of keys)if(config[key]!==RAID_PRESSURE_CANDIDATE[key])throw Error('Unreviewed pressure config drift: '+key);
 return config;
}
export function validateRaidPressureSource(balance=B){
 if(balance.crops?.length!==8)throw Error('Pressure source crop set drift');
 const crops=[['mijo',5,11],['girasol',18,36],['sorgo',6,13],['maiz',8,17],['batata',10,23],['algodon',100,178],['yuca',12,32],['platano',150,267]];
 if(balance.work_center?.cost!==800||balance.workers?.older_wage!==30||balance.workers?.young_wage!==40)throw Error('Pressure source price/wage drift');
 for(const [id,price,value] of crops){const crop=balance.crops?.find(c=>c.id===id);if(!crop||crop.plant_cost!==price||crop.base_harvest_value!==value)throw Error('Pressure source crop drift: '+id);}
 const ranges=[[2,4],[3,5],[4,6],[4,7],[5,8]],damage=[20,25,35,40,60],costs=[1,3,5,7,10];
 if(balance.animals?.length!==IDS.length)throw Error('Pressure source species drift');
 for(let i=0;i<IDS.length;i++){const a=balance.animals[i];if(a.id!==IDS[i]||a.hit_budget_min!==ranges[i][0]||a.hit_budget_max!==ranges[i][1]||a.structure_hit_damage!==damage[i]||a.threat_cost!==costs[i])throw Error('Pressure source animal drift: '+IDS[i]);}
 return balance;
}
function equalConfig(a,b){
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&equalConfig(a[k],b[k]));
}
export function validateRaidPressureConfiguration(json,balance=B){
 const expected={version:1,status:'pure-unintegrated-candidate',pressure:{dayWeight:.45,valueWeight:.55,valueScale:1000,logDenominator:26,firstNight:1,lastNight:100},ema:{alpha:1/3,nominalWindowNights:5,update:'once-per-night-plan',effective:'max(current agricultural value, EMA)'},composition:{initial:[1,0,0,0,0],final:SHARES,species:IDS,interpolation:'linear-pressure; renormalize native unlocked; Hamilton integer rounding'},reference:{spacing:1.5,coneRadians:Math.PI/2,centralWeight:1,peripheralWeight:.5},q:{meanMultiplier:1,unit:'reference agricultural HP points',round:'floor half-point',feasibility:'at least cheapest legal capped worst-case product',selection:'adjust composition before RNG; full native-range hit rolls'},waveActiveLimit:16,speciesCropBaseDamage:CROP,speciesBaseAttackRadii:RADII,structureRounding:'Math.round'};
 if(!equalConfig(json,expected))throw Error('Canonical pressure config/runtime drift');validateRaidPressureSource(balance);return json;
}
