import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {createRepairSettlementEvidence} from './repair-settlement-evidence.mjs';
import {continueRepairSnapshot} from './continue_horde_repair_snapshot.mjs';
import {staffingRepairPlan} from './horde-staffing-repair-plan.mjs';
import {observeRepairQueue,classifyRepairTransition} from './horde-repair-continuation-observation.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const own=['tools/compare_horde_staffing_repair.mjs','tools/horde-staffing-repair-plan.mjs','tools/continue_horde_repair_snapshot.mjs','tools/horde-repair-continuation-observation.mjs'];
export async function compareStaffingRepair(inputPath,output){
 assert.ok(!existsSync(output),'New output directory required; no retry overwrites');mkdirSync(output,{recursive:true});const began=performance.now(),startedUTC=new Date().toISOString();let s,report,error,status='running';
 const provenance=JSON.parse(readFileSync(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/native-original/provenance.json',import.meta.url))),sources={...provenance.sourceHashes,...Object.fromEntries(own.map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))]))},changed=()=>Object.keys(sources).filter(p=>hash(readFileSync(new URL('../'+p,import.meta.url)))!==sources[p]);
 const writeStatus=()=>writeFileSync(output+'/status.json',JSON.stringify({status,error,pid:process.pid,startedUTC,milliseconds:performance.now()-began},null,2)+'\n');writeStatus();writeFileSync(output+'/provenance.json',JSON.stringify({runtimeSource:provenance.gitHead,sources,pid:process.pid,startedUTC,scope:'One day21 ratio6 staffing comparison, no campaign or game parameter edits'},null,2)+'\n');
 try{
  assert.deepEqual(changed(),[]);const input=readFileSync(inputPath),raw=gunzipSync(input).toString();assert.equal(hash(input),hash(readFileSync(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/native-original/responsible/state.json.gz',import.meta.url))),'Use exact original time0 native snapshot');s=deserialize(raw);assert.equal(serialize(s),raw);writeFileSync(output+'/original-state.json.gz',gzipSync(raw));
  const plan=staffingRepairPlan(s),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile,nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);const observer=createRepairSettlementEvidence(s);
  Game.hire(s,'staffing6-diagnostic-hire',plan.selection);observer.observe(s);assert.equal(s.pauses.length,0);assert.equal(s.workers.length,plan.count);assert.equal(s.ledger.entries['staffing6-diagnostic-hire'].n,String(-plan.paidCoins));
  const preceding=structuredClone(s.tasks),beforeRequest=serialize(s),ledgerAtRequest=JSON.stringify(s.ledger);writeFileSync(output+'/after-hire-state.json.gz',gzipSync(beforeRequest));Game.requestRepair(s,'staffing6-diagnostic-repair',plan.centerId);observer.observe(s);assert.equal(JSON.stringify(s.ledger),ledgerAtRequest);const repair=s.tasks.find(t=>t.kind==='repair'&&t.targetId===plan.centerId);assert.ok(repair);assert.deepEqual(s.tasks.filter(t=>t.id!==repair.id),preceding);writeFileSync(output+'/after-request-state.json.gz',gzipSync(serialize(s)));
  const preparation=output+'/preparation';mkdirSync(preparation);writeFileSync(preparation+'/before-request-state.json.gz',gzipSync(beforeRequest));
  // Reuse frozen continuation contracts: the first second is ordinary .25
  // ticks, exactly like the original106 case. No clock or worker assignment.
  const warmup=[],warmupTrace=[observeRepairQueue(s,repair.id)];let preparationOutcome=null,lastEvent=s.events.at(-1)?.id;for(let i=0;i<4;i++){const before=observeRepairQueue(s,repair.id);Game.tick(s,.25,nav);const index=s.events.findIndex(e=>e.id===lastEvent);assert.ok(index>=0,'First-second event coverage lost');const fresh=s.events.slice(index+1);warmup.push(...fresh.map(e=>structuredClone(e)));lastEvent=s.events.at(-1)?.id;observer.observe(s);const after=observeRepairQueue(s,repair.id),transition=classifyRepairTransition(repair.id,before,after,fresh);warmupTrace.push({...after,transition});if(transition.status!=='pending'){preparationOutcome=transition;break;}}
  const final=serialize(s);writeFileSync(preparation+'/final-state.json.gz',gzipSync(final));writeFileSync(preparation+'/warmup-events.json.gz',gzipSync(JSON.stringify(warmup)));writeFileSync(preparation+'/warmup-trace.json.gz',gzipSync(JSON.stringify(warmupTrace)));const preparationReport={plan,preparationOutcome,scope:'Legal originaltime0 preparation up to1s or earliest actual repair outcome; all commands and payments native',inputSHA256:hash(input),initialSnapshotSHA256:hash(raw),finalSnapshotSHA256:hash(final),commands:{hire:{id:'staffing6-diagnostic-hire',count:plan.count,paidCoins:plan.paidCoins},repair:{id:'staffing6-diagnostic-repair',taskId:repair.id,targetId:repair.targetId,noChargeAtRequest:true}},precedingTasks:preceding.length,firstSecondRepairSettlements:observer.report(s)};writeFileSync(preparation+'/report.json',JSON.stringify(preparationReport,null,2)+'\n');writeStatus();
  if(preparationOutcome){report={status:preparationOutcome.status,reason:preparationOutcome,repairSettlements:observer.report(s),day:s.day,time:s.time,scope:'Actual outcome before1s; no continuation required'};status=report.status;}else{report=await continueRepairSnapshot(preparation,output+'/continuation');status=report.status;}
 }catch(e){status='incomplete';error={message:e.message,stack:e.stack};}
 finally{
  if(s)writeFileSync(output+'/preparation-final-state.json.gz',gzipSync(serialize(s)));const differences=changed();if(differences.length){status='incomplete';error={message:'Source changed',files:differences,precedingError:error};}
  writeFileSync(output+'/report.json',JSON.stringify({status,error,sourceChanged:differences,pid:process.pid,startedUTC,milliseconds:performance.now()-began,continuation:report??null,scope:'Changed staffing policy, no original106 evidence replaced; no campaign or balance acceptance'},null,2)+'\n');writeStatus();
 }
 return {status,error};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await compareStaffingRepair(process.argv[2],process.argv[3]);console.log(JSON.stringify(r));if(['incomplete','disappeared-unexplained'].includes(r.status))process.exitCode=2;}
