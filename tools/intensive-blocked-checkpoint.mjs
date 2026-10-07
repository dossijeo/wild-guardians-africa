// Offline QA snapshots, at heartbeat boundaries only. The clock and commands
// of the simulation remain untouched. Keep the first and the greatest backlog.
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {mkdirSync,writeFileSync,renameSync,readFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {contractExpired,PROFILES} from '../src/simulation/workforce.js';

export function createBlockedCheckpoint({capture,minBlocked=128,intervalMs=300000,now=()=>performance.now()}={}){
 if(typeof capture!=='function'||!Number.isSafeInteger(minBlocked)||minBlocked<1||!Number.isFinite(intervalMs)||intervalMs<=0)throw Error('Invalid blocked checkpoint options');
 let next=0,peak=0,sequence=0;
 return (state,nav,live)=>{
  const wall=now();if(wall<next||state.result||state.raid||state.pauses.length)return null;
  if(live.tasks.blocked<minBlocked||live.tasks.blocked<=peak)return null;
  const idle=state.workers.filter(w=>w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state)&&state.time<(PROFILES.find(p=>p.id===w.profile)?.end??0));
  if(!idle.length)return null;
  const payload={state:serialize(state),context:{sequence:sequence+1,observedWallMs:wall,policy:{minBlocked,intervalMs},day:state.day,time:state.time,
   blocked:live.tasks.blocked,idleEligible:idle.map(w=>w.id),
   navigation:structuredClone({config:nav.config,profile:nav.profile,activeBounds:nav.activeBounds??null,raidView:nav.raidView??null}),
   limitation:'Navigation caches and controller strategy cursor are not saved. This is a cold-navigation gameplay checkpoint, not an exact hot-cache performance replay.'}};
  const receipt=capture(payload,sequence===0?'first':'latest');
  sequence++;peak=live.tasks.blocked;next=wall+intervalMs;
  return {sequence,peak,receipt};
 };
}

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function createBlockedCheckpointWriter(directory,key,provenance){
 if(!/^[a-z0-9-]+$/.test(key))throw Error('Invalid checkpoint key');
 const root=resolve(directory);mkdirSync(root,{recursive:true});
 return ({state,context},slot)=>{
  if(!['first','latest'].includes(slot))throw Error('Invalid checkpoint slot');
  deserialize(state);const bytes=gzipSync(Buffer.from(state));
  const name=`${key}-blocked-${slot}-state.json.gz`,receiptName=`${key}-blocked-${slot}.json`;
  const receipt={...context,snapshot:name,snapshotSha256:hash(bytes),stateSha256:hash(state),provenance};
  // A receipt is committed last. Readers verify hashes and reject an
  // interrupted replacement rather than pairing old metadata with new state.
  for(const [file,data] of [[name,bytes],[receiptName,JSON.stringify(receipt,null,2)+'\n']]){
   const path=join(root,file);writeFileSync(path+'.pending',data);renameSync(path+'.pending',path);
  }
  return receiptName;
 };
}

export function readBlockedCheckpoint(path){
 const receipt=JSON.parse(readFileSync(path,'utf8'));
 if(!/^[a-z0-9-]+-state\.json\.gz$/.test(receipt.snapshot))throw Error('Invalid checkpoint snapshot name');
 const bytes=readFileSync(join(dirname(resolve(path)),receipt.snapshot));
 if(hash(bytes)!==receipt.snapshotSha256)throw Error('Checkpoint snapshot hash mismatch');
 const text=gunzipSync(bytes).toString('utf8');
 if(hash(text)!==receipt.stateSha256)throw Error('Checkpoint state hash mismatch');
 return {state:deserialize(text),receipt};
}
