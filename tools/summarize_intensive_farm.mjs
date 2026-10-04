// Analyse finished native simulations without rerunning or changing their strategy.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {deserialize} from '../src/persistence/snapshots.js';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';

export function summarizeIntensiveFarm(report){
  auditIntensiveFarm(report,{victory:report.result==='victory'});
  const state=report.state,bySpecies={},picked=new Set(state.crates.map(crate=>crate.sourcePlantId));
  const species=id=>bySpecies[id]??=({planted:0,living:0,picked:0,destroyed:0,delivered:0,inTransit:0,income:'0'});
  for(const plant of state.plants){
    const row=species(plant.species);row.planted++;
    if(plant.alive)row.living++;
    else if(picked.has(plant.id))row.picked++;
    else row.destroyed++;
  }
  for(const crate of state.crates){
    const row=species(crate.species);
    if(crate.delivered){row.delivered++;row.income=String(BigInt(row.income)+BigInt(state.ledger.entries['deliver:'+crate.id].n));}
    else row.inTransit++;
  }
  const days=report.daily.length,daylight=days*300;
  const idle=Object.fromEntries(['budget','space','shift-end','incursion','night'].map(reason=>[reason,report.daily.reduce((total,row)=>total+(row.idle[reason]??0),0)]));
  const unoccupied=idle.budget+idle.space+idle['shift-end'];
  return {
    biome:report.biome,culture:report.culture,seed:report.seed,result:report.result,
    provenance:report.provenance??null,
    policy:report.policy,
    campaign100:report.result==='victory'&&report.completedNights===100?'verified':'unverified',
    completedNights:report.completedNights,daysObserved:days,money:report.money,
    maximumLiving:report.maximumLiving,speciesObserved:Object.keys(bySpecies).length,bySpecies,
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
