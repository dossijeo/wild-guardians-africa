// Observe and stop a native campaign before an indicated night's first impact.
// No world, strategy, RNG, damage, money or actor position is overridden.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance,runNativeCampaignCase,calibrationStop} from './run_native_campaign.mjs';
export function nightEntryReady(s,night){
 return Boolean(s.day===night&&s.raid?.id===`raid-${night}-night`);
}
export function nightEntryUnhit(s,night){
 return nightEntryReady(s,night)&&s.raid.animals.length>0&&s.raid.animals.every(a=>a.attackId==null&&a.hitApplied!==true);
}
export function nightFramePending(s,night,dt){
 return s.day===night&&!s.raid&&s.nightPlan?.night===night&&
  Number.isFinite(s.nightPlan.at)&&Number.isFinite(dt)&&dt>0&&
  s.time>=300&&s.time<600&&s.time+dt>=s.nightPlan.at;
}
export async function captureNativeNightEntry(night,options){
 assert.ok(Number.isSafeInteger(night)&&night>0&&night<=options.days);
 let captured=false;
 const result=await runNativeCampaignCase(options,{
  provenance:o=>({...nativeCampaignProvenance(o),captureObserver:{night,
   sourceSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
   scope:'Observer stops before the unchanged native update spanning scheduled night spawn. Actors are not spawned yet; not campaign completion.'}}),
  run:o=>simulateNativeCampaign({...o,onBeforeTick:(s,nav,dt)=>{
   if(!nightFramePending(s,night,dt))return;
   captured=true;throw calibrationStop(`Captured native frame before night ${night} spawn and impacts`);
  }})
 });
 assert.ok(captured,`Requested pre-spawn frame was not captured: ${result.receipt.message??result.receipt.status}`);
 assert.equal(result.receipt.status,'stopped-early-calibration');
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=await captureNativeNightEntry(Number(process.argv[2]),parseNativeCampaignArgs(process.argv.slice(3)));
  console.log(JSON.stringify(result.receipt));
 }catch(error){console.error(error.stack);process.exitCode=1;}
}
