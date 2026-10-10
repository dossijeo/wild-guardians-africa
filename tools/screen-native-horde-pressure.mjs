// Analytical proposal only. No production configuration writes or campaigns.
import {estimateNativeHorde} from './estimate-native-horde-budgets.mjs';
import {BALANCE as B} from '../src/simulation/balance.js';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function intervalCapacity(min,max,species){
 const rows=Array.from({length:max-min+1},(_,i)=>estimateNativeHorde(min+i,species));
 const mean=k=>rows.reduce((n,r)=>n+r[k],0)/rows.length;
 return {min,max,species,budgets:rows.length,meanAnimals:mean('meanAnimals'),meanRolledHits:mean('meanRolledHits'),meanFreshKillsIfEveryHitReachesHealthyCrop:mean('meanRolledHits')/2,maxAnimals:Math.max(...rows.map(r=>r.maxAnimals)),maxHits:Math.max(...rows.map(r=>r.maxHits)),maximumCompositionsAtOneBudget:Math.max(...rows.map(r=>r.compositions)),rows};
}
export function proposedCapacity(){
 const ranges=[[1,2],[3,4],[6,9],[12,18],[24,36]];
 const tiers=B.threat_tiers.map((t,i)=>({attractionMin:t.attraction_min,current:intervalCapacity(t.threat_min,t.threat_max,t.unlocked_species),proposal:intervalCapacity(...ranges[i],t.unlocked_species)}));
 const all=B.threat_tiers.at(-1).unlocked_species;
 return {scope:'Exact uniform-budget then uniform-composition averages; capacity, never actual damage. Calendar ranges are an unimplemented hypothesis. Introductions1-5 remain original.',tiers,topCalendar:[{nights:'6-15',...intervalCapacity(24,36,all)},{nights:'16-30',...intervalCapacity(48,72,all)},{nights:'31-100',...intervalCapacity(72,96,all)}]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=process.argv[2];if(!out)throw Error('Output folder required');mkdirSync(out,{recursive:true});
 const inputs=['src/simulation/balance.js','src/simulation/rules.js','src/simulation/raids.js','tools/estimate-native-horde-budgets.mjs','tools/screen-native-horde-pressure.mjs'];
 const r=proposedCapacity();r.sourceHashes=Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
 writeFileSync(out+'/capacity-screen.json',JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({tiers:r.tiers.map(t=>({attraction:t.attractionMin,current:t.current.meanRolledHits,proposed:t.proposal.meanRolledHits})),calendar:r.topCalendar.map(t=>({nights:t.nights,meanAnimals:t.meanAnimals,meanHits:t.meanRolledHits,freshEnvelope:t.meanFreshKillsIfEveryHitReachesHealthyCrop,maxAnimals:t.maxAnimals,maxHits:t.maxHits,ways:t.maximumCompositionsAtOneBudget}))}));
}
