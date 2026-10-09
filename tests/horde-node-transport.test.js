import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNodeRaidEntryWorker} from '../tools/node-raid-entry-transport.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize} from '../src/persistence/snapshots.js';
import {Worker} from 'node:worker_threads';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
test('QA Node transport computes a whole native group on a real worker and terminates',async()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:[...group],done:false};
 const before=serialize(s);let worker;
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker=createNodeRaidEntryWorker()});
 let timeout;try{
  assert.ok(worker.threadId>0,'Must use a real independent Node thread');
  const receive=worker.onmessage,received=new Promise(resolve=>{worker.onmessage=event=>{receive(event);resolve(event.data);};});
  preparer.update(s);
  const reply=await Promise.race([received,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Worker preflight did not complete within bounded observation')),7000))]);
  assert.equal(reply.error,undefined);assert.equal(reply.entry.entries.length,12);assert.equal(serialize(s),before);assert.equal(preparer.stats.accepted,1);
  assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');assert.equal(preparer.stats.used,1);assert.equal(s.raid.animals.length,12);
 }finally{clearTimeout(timeout);preparer.dispose();await worker.closed;}
 assert.equal(worker.threadId,-1);assert.equal(worker.failure,null);assert.equal(nav.preparedRaidEntry,undefined);
});
test('Unexpected real worker exit zero before a reply supplies actionable failure',async()=>{
 const worker=createNodeRaidEntryWorker({createThread:()=>new Worker('process.exit(0)',{eval:true})});let failure;
 worker.onerror=error=>failure=error;await worker.closed;assert.match(failure.message,/unexpectedly exited with code 0/);assert.equal(worker.failure,failure);
});
test('Real worker error is retained once and explicit termination is not failure',async()=>{
 const worker=createNodeRaidEntryWorker({createThread:()=>new Worker("throw Error('native-test-failure')",{eval:true})});let calls=0;
 worker.onerror=()=>calls++;await worker.closed;assert.equal(calls,1);assert.match(worker.failure.message,/native-test-failure/);
 const cancelled=createNodeRaidEntryWorker();let failures=0;cancelled.onerror=()=>failures++;await cancelled.terminate();await cancelled.closed;assert.equal(failures,0);assert.equal(cancelled.failure,null);
});
