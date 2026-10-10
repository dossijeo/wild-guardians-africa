import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {DECLARED_HORDE_PILOT,hordeComparisonProvenance,retainHordeCase,auditHordeComparison} from './horde-defense-comparison.mjs';
import {simulateHordeSelfConsistentFarm} from './horde-defense-self-consistent-farm.mjs';
import {INITIAL_STAFFING_POLICY} from './horde-initial-staffing-policy.mjs';
import {ownedWallStateCounts} from './horde-defense-terminal-derivative.mjs';
export const DECLARED_SELF_CONSISTENT_PILOT=Object.freeze({...DECLARED_HORDE_PILOT,protocol:'horde-defense-self-consistent-comparison-v1',plantsPerWorker:6,initialStaffingPolicy:INITIAL_STAFFING_POLICY});
export function selfConsistentOptions(arm,onDay){assert.ok(['responsible','neglect'].includes(arm));return {...DECLARED_SELF_CONSISTENT_PILOT,arm,onDay};}
export function selfConsistentCurrentSources(args=[]){
 const provenance=hordeComparisonProvenance(args);for(const p of ['tools/horde-defense-self-consistent-comparison.mjs','tools/horde-defense-terminal-derivative.mjs','tools/horde-defense-self-consistent-farm.mjs','tools/horde-initial-staffing-policy.mjs'])provenance.sourceHashes[p]=createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex');return provenance;
}
export function selfConsistentProvenance(args){
 const original=JSON.parse(readFileSync(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/native-original/provenance.json',import.meta.url))),provenance=selfConsistentCurrentSources(args);
 for(const[p,h]of Object.entries(original.sourceHashes))assert.equal(provenance.sourceHashes[p],h,'Original production/strategy source changed: '+p);
 return {...provenance,scenario:DECLARED_SELF_CONSISTENT_PILOT,originalRuntimeSource:original.gitHead,unchangedOriginalSources:Object.keys(original.sourceHashes).length,scope:'Separate changed productive staffing policy in both arms, not replacement of twelve-policy evidence'};
}
export function selfConsistentAudit(report,days){assert.equal(report.initialStaffingPolicy,INITIAL_STAFFING_POLICY);assert.equal(report.initialHiringPlan.policy,INITIAL_STAFFING_POLICY);assert.equal(report.policy.plantsPerWorker,6);assert.equal(report.policy.middayHiring,false);assert.equal(report.policy.profile,'olderFemale');assert.equal(report.comparisonProtocol,DECLARED_SELF_CONSISTENT_PILOT.protocol);return auditHordeComparison(report,days);}
export async function runSelfConsistentComparison(output){
 assert.ok(output,'Specify NEW evidence directory');mkdirSync(output,{recursive:false});const provenance=selfConsistentProvenance(process.argv.slice(2)),started=performance.now(),results=[];
 writeFileSync(output+'/provenance.json',JSON.stringify(provenance,null,2)+'\n');writeFileSync(output+'/status.json',JSON.stringify({status:'running',pid:process.pid,startedAt:new Date().toISOString(),scenario:DECLARED_SELF_CONSISTENT_PILOT},null,2)+'\n');
 for(const arm of ['responsible','neglect']){
  const receipt=await retainHordeCase(output+'/'+arm,arm,provenance,{simulate:async options=>{const result=await simulateHordeSelfConsistentFarm(selfConsistentOptions(options.arm,options.onDay));return {...result,comparisonProtocol:DECLARED_SELF_CONSISTENT_PILOT.protocol,comparisonWallState:ownedWallStateCounts(result.state,result.defense?.built),comparisonScope:'Original centre-only wall fields remain untouched; comparisonWallState is an explicit native wall-status derivative'};},audit:selfConsistentAudit,readSources:()=>selfConsistentCurrentSources([]).sourceHashes});
  results.push(receipt);if(receipt.status==='incomplete')break;
 }
 const terminal={protocol:DECLARED_SELF_CONSISTENT_PILOT.protocol,status:results.length===2&&results.every(r=>r.status==='native-terminal-audited')?'paired-pilot-terminal':'incomplete',milliseconds:performance.now()-started,results,scope:'Twenty-night diagnostic only. Preserve every false global activity/defeat gate. Hundred-night acceptance and matrix remain pending.'};writeFileSync(output+'/status.json',JSON.stringify(terminal,null,2)+'\n');console.log(JSON.stringify(terminal));return terminal;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runSelfConsistentComparison(process.argv[2]).then(r=>{if(r.status==='incomplete')process.exitCode=2;},e=>{console.error(e);process.exitCode=2;});}
