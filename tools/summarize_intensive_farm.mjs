// Analyse finished native simulations without rerunning or changing their strategy.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {deserialize} from '../src/persistence/snapshots.js';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';
import {cropSpec} from '../src/simulation/rules.js';
import assert from 'node:assert/strict';

export function summarizeIntensiveFarm(report){
  auditIntensiveFarm(report,{victory:report.result==='victory'});
  const state=report.state,bySpecies={},picked=new Set(state.crates.map(crate=>crate.sourcePlantId));
  const species=id=>bySpecies[id]??=({planted:0,living:0,picked:0,destroyed:0,lostBeforeFirstWater:0,lostWithPendingWater:0,delivered:0,inTransit:0,income:'0',seedCosts:'0',livingSeedCosts:'0',pickedSeedCosts:'0',destroyedSeedCosts:'0'});
  for(const plant of state.plants){
    const row=species(plant.species),cost=BigInt(cropSpec(plant.species).plant_cost);row.planted++;
    row.seedCosts=String(BigInt(row.seedCosts)+cost);
    const allocation=plant.alive?'living':picked.has(plant.id)?'picked':'destroyed';
    row[allocation]++;row[allocation+'SeedCosts']=String(BigInt(row[allocation+'SeedCosts'])+cost);
    if(allocation==='destroyed'){if(plant.water[0].status==='due')row.lostBeforeFirstWater++;if(plant.water.some(w=>w.status==='due'))row.lostWithPendingWater++;}
  }
  for(const crate of state.crates){
    const row=species(crate.species);
    if(crate.delivered){row.delivered++;row.income=String(BigInt(row.income)+BigInt(state.ledger.entries['deliver:'+crate.id].n));}
    else row.inTransit++;
  }
  const days=report.daily.length,daylight=days*300;
  const idle=Object.fromEntries(['budget','space','shift-end','incursion','night'].map(reason=>[reason,report.daily.reduce((total,row)=>total+(row.idle[reason]??0),0)]));
  const unoccupied=idle.budget+idle.space+idle['shift-end'];
  const cash={harvestIncome:0n,seedCosts:0n,wageCosts:0n,repairCosts:0n,centreCosts:0n,otherNet:0n};
  for(const [id,entry] of Object.entries(state.ledger.entries)){
    const amount=BigInt(entry.n);
    if(id.startsWith('deliver:'))cash.harvestIncome+=amount;
    else if(id.startsWith('intensive-plant-'))cash.seedCosts-=amount;
    else if(id.startsWith('intensive-hire-'))cash.wageCosts-=amount;
    else if(id.startsWith('repair:'))cash.repairCosts-=amount;
    else if(id==='center')cash.centreCosts-=amount;
    else cash.otherNet+=amount;
  }
  // Historical snapshots do not retain the purchase command ID on each plant.
  // Only attribute current species prices after reconciling their total with
  // the actual recorded seed debits. A balance change must not silently rewrite
  // the economics of an older campaign.
  assert.equal(Object.values(bySpecies).reduce((total,row)=>total+BigInt(row.seedCosts),0n),cash.seedCosts,'Species seed prices do not reconcile with recorded purchase debits');
  for(const row of Object.values(bySpecies))row.harvestMinusSeedCosts=String(BigInt(row.income)-BigInt(row.seedCosts));
  const operatingCashFlow=cash.harvestIncome-cash.seedCosts-cash.wageCosts-cash.repairCosts+cash.otherNet;
  return {
    biome:report.biome,culture:report.culture,seed:report.seed,result:report.result,
    provenance:report.provenance??null,
    policy:report.policy,
    additionalHiring:report.additionalHiring??null,
    campaign100:report.result==='victory'&&report.completedNights===100?'verified':'unverified',
    completedNights:report.completedNights,daysObserved:days,money:report.money,
    maximumLiving:report.maximumLiving,speciesObserved:Object.keys(bySpecies).length,bySpecies,
    cashflow:{openingBalance:'1500',...Object.fromEntries(Object.entries(cash).map(([key,value])=>[key,String(value)])),operatingCashFlow:String(operatingCashFlow),endingBalance:state.ledger.balance.n},
    activity:{daylightSeconds:daylight,unoccupiedSeconds:unoccupied,unoccupiedFraction:daylight?unoccupied/daylight:null,idleSecondsByReason:idle,longestIdle:report.activity.longestIdle,p90LongestIdle:report.activity.p90LongestIdle},
    daily:report.daily.map(({day,money,staff,planted,delivered,destroyed,living,centerHp,longestIdle,idle})=>({day,money,staff,planted,delivered,destroyed,living,centerHp,longestIdle,idle})),
    scope:'Recorded domain strategy and simulated time; not physical player activity, GPU frametime or complete biome/culture acceptance. Dead unpicked plants are losses in this strategy, which never removes crops manually.'
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const reportPath=process.argv[2];
  if(!reportPath)throw Error('Usage: node tools/summarize_intensive_farm.mjs REPORT.json [STATE.json]');
  const statePath=process.argv[3]??reportPath.replace(/\.json$/,'-state.json');
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  report.state=deserialize(readFileSync(statePath,'utf8'));
  console.log(JSON.stringify(summarizeIntensiveFarm(report),null,2));
}
