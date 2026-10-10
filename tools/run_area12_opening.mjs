// Bounded native candidate diagnostic. Does not run when imported.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {selfConsistentCurrentSources,DECLARED_SELF_CONSISTENT_PILOT} from './horde-defense-self-consistent-comparison.mjs';
import {retainHordeCase} from './horde-defense-comparison.mjs';
import {simulateHordeSelfConsistentFarm} from './horde-defense-self-consistent-farm.mjs';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';
import {auditHordeStrikeEvidence} from './horde-strike-evidence.mjs';
export function candidateSources(){
 const p=selfConsistentCurrentSources([]);
 for(const name of ['tools/area12-expanding-defense-policy.mjs','tools/area12-repair-activity.mjs','tools/run_area12_opening.mjs'])p.sourceHashes[name]=createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex');
 return p;
}
export function auditArea12Opening(r,days){
 auditIntensiveFarm(r,{victory:false});
 const strikes=auditHordeStrikeEvidence(r),impacts=r.raidFacts.filter(e=>e.type==='AnimalLogicalHit'&&e.presentation.areaImpact);
 const cropHits=r.raidFacts.filter(e=>e.type==='CropHit'&&e.attackId),cropDestroyed=r.raidFacts.filter(e=>e.type==='CropDestroyed'&&e.attackId);
 for(const hit of impacts){
  const applied=hit.presentation.areaImpact.appliedTargets,ids=applied.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length<=8);
  const matching=cropHits.filter(e=>e.attackId===hit.attackId);assert.deepEqual(matching.map(e=>e.targetId),ids);
  for(const p of applied){assert.ok(p.postHits>=p.previousHits&&p.postHits<=2);assert.equal(cropDestroyed.filter(e=>e.attackId===hit.attackId&&e.targetId===p.id).length,p.destroyed?1:0);}
 }
 const allExit=r.raids.every(a=>a.terminalActors?.every(t=>t.status==='gone'&&t.exitDistance<1e-8));
 const meaningful=r.meaningfulObservedActivity;
 const meaningfulAvailable=Number.isFinite(meaningful?.unoccupiedFraction)&&meaningful.unoccupiedFraction>=0&&meaningful.unoccupiedFraction<=1;
 return {completedRequestedNights:r.completedNights>=days,allRaidsPhysicallyEnded:allExit,spentStrikes:strikes.spentStrikes,strikeBudgetExactlyMatched:true,areaImpactReceiptIdsMatched:true,areaImpactCount:impacts.length,damagedPlants:cropHits.length,areaDestroyedPlants:cropDestroyed.length,paidRepairEvidence:r.repairSettlements.status,actualInterceptionCount:r.raidFacts.filter(e=>e.type==='StructureHit').length,observedActivity:r.observedActivity,rawActivityBelow25:r.observedActivity.unoccupiedFraction<.25,meaningfulObservedActivity:meaningful??null,meaningfulActivityAvailable:meaningfulAvailable,strictActivityBelow25:meaningfulAvailable&&meaningful.unoccupiedFraction<.25,no100NightAcceptance:true};
}
export async function runArea12Opening(output,days=6){
 assert.ok(output);assert.ok(Number.isSafeInteger(days)&&days>=1&&days<=6,'Only1–6nights permitted before parent review');mkdirSync(output,{recursive:false});
 const provenance={...candidateSources(),baseline:'e040ea6f9edf62c7924e3b32bd34b28780c39e5f',scenario:{...DECLARED_SELF_CONSISTENT_PILOT,days,qaArea12:true,protocol:'qa-area12-opening-v1'},scope:'Bounded opening only; unchanged high-yield prices/individualdamage; new paid expanding defense strategy'};
 assert.equal(provenance.trackedChanges.length,0,'Commit and freeze candidate before launching');
 writeFileSync(output+'/provenance.json',JSON.stringify(provenance,null,2)+'\n');const start=performance.now(),results=[];
 for(const arm of ['responsible','neglect']){
  const receipt=await retainHordeCase(output+'/'+arm,arm,provenance,{simulate:options=>simulateHordeSelfConsistentFarm({...DECLARED_SELF_CONSISTENT_PILOT,qaArea12:true,days,arm,onDay:options.onDay}),audit:r=>auditArea12Opening(r,days),readSources:()=>candidateSources().sourceHashes});
  results.push(receipt);if(receipt.status==='incomplete')break;
 }
 const status={protocol:'qa-area12-opening-v1',milliseconds:performance.now()-start,results,status:results.length===2&&results.every(r=>r.status==='native-terminal-audited')?'paired-diagnostic-terminal':'incomplete',scope:'No20/100night approval; preserve negative activity/contact gates; no reroll'};
 writeFileSync(output+'/status.json',JSON.stringify(status,null,2)+'\n');return status;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runArea12Opening(process.argv[2],Number(process.argv[3]??6)).then(r=>{console.log(JSON.stringify(r));if(r.status==='incomplete')process.exitCode=2;},e=>{console.error(e);process.exitCode=2;});
