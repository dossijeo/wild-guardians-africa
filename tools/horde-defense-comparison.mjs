import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {simulateHordeDefenseFarm} from './horde-defense-farm.mjs';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
export const DECLARED_HORDE_PILOT=Object.freeze({protocol:'horde-defense-comparison-v1',days:20,biome:'gran-canon',culture:'saheliana',seed:712,profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true});
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function hordeComparisonProvenance(args=[]){
 const provenance=intensiveRunProvenance(args);
 for(const path of ['tools/horde-defense-comparison.mjs','tools/horde-defense-farm.mjs','tools/horde-defense-actions.mjs','tools/horde-entry-driver.mjs','tools/node-raid-entry-transport.mjs','tools/node-raid-entry-worker.mjs','tools/repair-settlement-evidence.mjs','content/balance/player_revisions.json'])provenance.sourceHashes[path]=hash(readFileSync(new URL('../'+path,import.meta.url)));
 return {...provenance,scenario:DECLARED_HORDE_PILOT};
}
export function auditHordeComparison(report,requestedDays){
 auditIntensiveFarm(report,{victory:requestedDays===100});
 if(report.repairSettlements.status!=='verified')throw Error('Repair receipt coverage incomplete');
 const observed=report.observedActivity;
 const completed=report.completedNights>=requestedDays;
 const hiringPayments=report.commands.filter(c=>c.kind==='hire').map(c=>({...c,paid:-Number(report.state.ledger.entries[c.id]?.n??0)}));
 const eachDayStaffAndDelivery=report.daily.length===requestedDays&&report.daily.every(r=>r.staff>0&&r.wages>0&&r.delivered>0&&hiringPayments.some(c=>c.day===r.day&&c.paid===r.wages));
 const terminalRaids=report.raids.filter(r=>r.terminalActors);
 const allRaidsPhysicallyEnded=terminalRaids.length===(report.counts.RaidSpawned??0)&&terminalRaids.length===(report.counts.RaidEnded??0)&&terminalRaids.every(r=>r.terminalActors.every(a=>a.status==='gone'&&a.exitDistance<1e-8));
 const spentStrikes=report.raids.reduce((sum,r)=>sum+r.initialHitBudgets.reduce((a,b)=>a+b,0)-(r.terminalActors??r.lastAnimals??[]).reduce((a,b)=>a+b.hitsRemaining,0),0);
 const strikeEvidenceMatches=spentStrikes===(report.counts.AnimalLogicalHit??0)+(report.counts.AnimalLogicalMiss??0);
 if(!strikeEvidenceMatches)throw Error('Actual spent strike budgets do not reconcile with native hit/miss events');
 const activityPass=observed.unoccupiedFraction!==null&&observed.unoccupiedFraction<.25;
 const incomePaid=report.state.crates.filter(c=>c.delivered).length;
 return {actualHiringPayments:hiringPayments,allRaidsPhysicallyEnded,spentStrikes,strikeEvidenceMatches,ledgerHydrationMaturityCrateReceipts:true,repairSettlements:true,completedRequestedNights:completed,everyWorkdayPaidStaffAndPhysicalDelivery:eachDayStaffAndDelivery,strictGlobalActivityBelow25:activityPass,physicalPaidDeliveries:incomePaid,responsible100Accepted:requestedDays===100&&completed&&eachDayStaffAndDelivery&&activityPass&&allRaidsPhysicallyEnded&&report.result==='victory',nativeNeglectDefeat:report.policy.arm==='neglect'&&report.result==='defeat'&&(report.counts.GameOver??0)>0,scope:'20-night pilot is not100-night acceptance; paid crate audit does not independently prove temporal route/FIFO traversal'};
}
// Evidence boundary; controlled tests supply failure functions. The production
// CLI always uses the ordinary simulation and strict native auditors below.
export async function retainHordeCase(caseOutput,arm,provenance,{simulate=simulateHordeDefenseFarm,audit=auditHordeComparison,summarize=summarizeIntensiveFarm,readSources=()=>hordeComparisonProvenance([]).sourceHashes}={}){
 mkdirSync(caseOutput,{recursive:false});let result,status='incomplete',error=null;
 const persistRaw=()=>{
  const {state,nav,...nativeReport}=result;
  if(state)writeFileSync(`${caseOutput}/native-state.json.gz`,gzipSync(serialize(state)));
  writeFileSync(`${caseOutput}/native-report.json.gz`,gzipSync(JSON.stringify({...nativeReport,provenance})));
 };
 try{
  result=await simulate({...DECLARED_HORDE_PILOT,arm,onDay:row=>{writeFileSync(`${caseOutput}/progress.json`,JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify({arm,...row}));}});
  persistRaw();result.provenance=provenance;result.gates=audit(result,DECLARED_HORDE_PILOT.days);result.summary=summarize(result);status='native-terminal-audited';
 }catch(failure){
  error={name:failure.name,message:failure.message,stack:failure.stack};
  if(!result){result=failure.partialReport??{scope:'Failure before native state available'};persistRaw();}
 }
 const sourcesNow=readSources();const changed=Object.keys(provenance.sourceHashes).filter(path=>provenance.sourceHashes[path]!==sourcesNow[path]);
 if(changed.length){status='incomplete';error={message:'Source changed during case',files:changed,...(error?{precedingError:error}:{})};}
 const {state,nav,...report}=result;report.status=status;report.error=error;report.provenance=provenance;
 if(state)writeFileSync(`${caseOutput}/state.json.gz`,gzipSync(serialize(state)));
 writeFileSync(`${caseOutput}/report.json.gz`,gzipSync(JSON.stringify(report)));
 const payloadHashes={};for(const file of ['report.json.gz','native-report.json.gz',...(state?['state.json.gz','native-state.json.gz']:[])])payloadHashes[file]=hash(readFileSync(`${caseOutput}/${file}`));
 const receipt={arm,status,error,result:state?.result??null,completedNights:state?.completedNights??null,gates:report.gates??null,payloadHashes,sourceUnchanged:!changed.length};
 writeFileSync(`${caseOutput}/status.json`,JSON.stringify(receipt,null,2)+'\n');return receipt;
}
export async function runHordeComparison(output){
 if(!output)throw Error('Specify a NEW evidence directory');mkdirSync(output,{recursive:false});
 const provenance=hordeComparisonProvenance(process.argv.slice(2)),started=performance.now(),results=[];
 writeFileSync(`${output}/provenance.json`,JSON.stringify(provenance,null,2)+'\n');
 writeFileSync(`${output}/status.json`,JSON.stringify({status:'running',pid:process.pid,startedAt:new Date().toISOString(),scenario:DECLARED_HORDE_PILOT},null,2)+'\n');
 for(const arm of ['responsible','neglect']){
  const receipt=await retainHordeCase(`${output}/${arm}`,arm,provenance);results.push(receipt);
  if(receipt.status==='incomplete')break; // Preserve failure, never replace/retry it.
 }
 const terminal={protocol:DECLARED_HORDE_PILOT.protocol,status:results.length===2&&results.every(r=>r.status==='native-terminal-audited')?'paired-pilot-terminal':'incomplete',milliseconds:performance.now()-started,results,acceptance:'No100night or matrix30 acceptance inferred; inspect every activity/physical/defense/neglect gate'};
 writeFileSync(`${output}/status.json`,JSON.stringify(terminal,null,2)+'\n');console.log(JSON.stringify(terminal));return terminal;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runHordeComparison(process.argv[2]).then(r=>{process.exitCode=r.status==='incomplete'?2:0;},error=>{console.error(error);process.exitCode=2;});}
