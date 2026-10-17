import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {serialize} from '../../src/persistence/snapshots.js';

if(process.argv.length>3)throw Error('Usage: node diagnose-active-farm-collapse.mjs [output-prefix]');
const output=process.argv[2]??'.cache/late-planting-diagnostic';
mkdirSync(dirname(output),{recursive:true});
const decisions=[];
let captured31=false,captured32=false;
const result=await simulateNativeCampaign({
 days:32,strategy:'good',seed:712,biome:'sabana',culture:'mapungubwe',
 reloadRaids:false,
 onDecision:decision=>{if(decision.day>=30)decisions.push(decision);},
 onTick:state=>{
  if(state.day===31&&!captured31){
   writeFileSync(output+'-day31-state.json',serialize(state));
   captured31=true;
  }
  if(state.day===32&&!captured32){
   writeFileSync(output+'-day32-state.json',serialize(state));
   captured32=true;
  }
 },
});
writeFileSync(output+'-report.json',JSON.stringify({
 result:result.result,completedNights:result.completedNights,reloads:result.reloads,
 plotSearch:result.plotSearch,defense:result.defense,expansion:result.expansion,
 daily:result.daily.filter(row=>row.day>=28),decisions,
},null,2));
console.log(JSON.stringify({result:result.result,completedNights:result.completedNights,
 reloads:result.reloads,decisions:decisions.length,output}));
