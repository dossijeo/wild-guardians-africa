import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {HordeEntryDriver} from './horde-entry-driver.mjs';
import {createRepairSettlementEvidence} from './repair-settlement-evidence.mjs';
import {observeRepairQueue,classifyRepairTransition} from './horde-repair-continuation-observation.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const own=['tools/continue_horde_repair_snapshot.mjs','tools/horde-repair-continuation-observation.mjs'];
export async function continueRepairSnapshot(inputDirectory,output){
 assert.ok(!existsSync(output),'New output directory required; never overwrite a prior attempt');mkdirSync(output,{recursive:true});
 const started=performance.now(),beganUTC=new Date().toISOString(),trace=[],events=[],newEventsSeen=new Set(),receipt=JSON.parse(readFileSync(inputDirectory+'/report.json')),input=readFileSync(inputDirectory+'/final-state.json.gz'),raw=gunzipSync(input).toString('utf8'),s=deserialize(raw);let driver,nav,status='running',reason=null,error=null;
 const provenance=JSON.parse(readFileSync(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/native-original/provenance.json',import.meta.url))),sourceHashes={...provenance.sourceHashes,...Object.fromEntries(own.map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))]))};
 const changed=()=>Object.keys(sourceHashes).filter(p=>hash(readFileSync(new URL('../'+p,import.meta.url)))!==sourceHashes[p]);
 const observer=createRepairSettlementEvidence(s),taskId=receipt.commands.repair.taskId,originalCommands=[...s.commandIds],originalHiring=s.hiringPaidDay;
 const statusRow=()=>({status,reason,error,pid:process.pid,startedUTC:beganUTC,day:s.day,time:s.time,elapsed:s.elapsed,taskId,frames:trace.length,milliseconds:performance.now()-started});
 writeFileSync(output+'/initial-state.json.gz',gzipSync(raw));writeFileSync(output+'/provenance.json',JSON.stringify({sourceHead:provenance.gitHead,inputSHA256:hash(input),inputSnapshotSHA256:hash(raw),sourceHashes,pid:process.pid,startedUTC:beganUTC,scope:'One continuation of legal day21 fixture, maximum time300; no hire/request or strategy/campaign'},null,2)+'\n');writeFileSync(output+'/status.json',JSON.stringify(statusRow(),null,2)+'\n');
 try{
  assert.deepEqual(changed(),[]);assert.equal(hash(raw),receipt.finalSnapshotSHA256);assert.equal(serialize(s),raw);assert.equal(s.day,21);assert.equal(s.time,1);assert.equal(s.result,null);assert.equal(s.pauses.length,0);assert.ok(s.tasks.some(t=>t.id===taskId));
  const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);driver=new HordeEntryDriver(nav);
  let lastEvent=s.events.at(-1)?.id;trace.push(observeRepairQueue(s,taskId));
  while(s.time<300&&s.day===21&&!s.result&&!s.pauses.length){
   await driver.advancePresentation(s);if(Game.nightEntryPending(s)&&s.time>=600)throw Error('Continuation exceeded daylight boundary');
   const before=observeRepairQueue(s,taskId),began=performance.now();Game.tick(s,Math.min(.25,300-s.time),nav);const stepMilliseconds=performance.now()-began;
   const index=lastEvent?s.events.findIndex(e=>e.id===lastEvent):-1;if(lastEvent&&index<0)throw Error('Native event window lost; cannot infer task disappearance');
   const fresh=s.events.slice(index+1);for(const e of fresh){assert.ok(!newEventsSeen.has(e.id));newEventsSeen.add(e.id);events.push(structuredClone(e));}lastEvent=s.events.at(-1)?.id??lastEvent;observer.observe(s);
   const after=observeRepairQueue(s,taskId),transition=classifyRepairTransition(taskId,before,after,fresh);trace.push({...after,stepMilliseconds,transition});
   assert.ok(s.time<=300&&s.day===21,'Never enter a subsequent night or day');assert.deepEqual(s.commandIds,originalCommands,'Continuation issued a player command');assert.equal(s.hiringPaidDay,originalHiring);
   if(transition.status!=='pending'){status=transition.status;reason=transition;break;}
   if(trace.length%40===0)writeFileSync(output+'/status.json',JSON.stringify(statusRow(),null,2)+'\n');
  }
  if(status==='running'){status=s.result?'native-result':s.pauses.length?'blocking-pause':s.time>=300?'daylight-ended-repair-pending':'incomplete';reason={result:s.result,pauses:[...s.pauses],time:s.time};}
 }catch(e){status='incomplete';error={name:e.name,message:e.message,stack:e.stack};}
 finally{
  try{await driver?.dispose();}catch(e){status='incomplete';error??={message:e.message,stack:e.stack};}
  const final=serialize(s);writeFileSync(output+'/final-state.json.gz',gzipSync(final));writeFileSync(output+'/trace.json.gz',gzipSync(JSON.stringify(trace)));writeFileSync(output+'/events.json.gz',gzipSync(JSON.stringify(events)));
  const sourceChanged=changed();if(sourceChanged.length){status='incomplete';error={message:'Sources changed',sourceChanged,precedingError:error};}
  let settlement;try{settlement=observer.report(s);}catch(e){settlement={status:'incomplete',error:e.message};status='incomplete';}
  const report={...statusRow(),sourceChanged,inputSnapshotSHA256:hash(raw),finalSnapshotSHA256:hash(final),initial:trace[0]??null,final:trace.at(-1)??null,repairSettlements:settlement,transport:driver?.report()??null,eventsRecorded:events.length,noNewCommands:JSON.stringify(s.commandIds)===JSON.stringify(originalCommands),scope:'This legal continuation may explain its own repair outcome only, never reconstruct the original fourteen requests or approve balance'};
  writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');writeFileSync(output+'/status.json',JSON.stringify(statusRow(),null,2)+'\n');
 }
 return JSON.parse(readFileSync(output+'/report.json'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=await continueRepairSnapshot(process.argv[2],process.argv[3]);console.log(JSON.stringify({status:r.status,time:r.time,frames:r.frames,paidRepairs:r.repairSettlements.paidRepairs,error:r.error}));if(r.status==='incomplete'||r.status==='disappeared-unexplained')process.exitCode=2;}
