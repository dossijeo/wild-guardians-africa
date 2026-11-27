import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

const opening=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-native-pending-home.json.gz',import.meta.url))).toString();
const isRetreat=record=>record.kind==='animal-crop-route'&&record.resources.reference.purpose==='retreat';
const pose=({x,z,heading,motionPhase})=>[x,z,heading,motionPhase];
const advance=(f,steps,nightFastForward=false)=>f.command({kind:'advance',seconds:.05,steps,nightFastForward});

test('a public save while the ordinary Retreat awaits READY keeps the exact WASM corridor',{timeout:45000},async()=>{
 const initial=JSON.parse(opening),options=savedNativeAuthorityOptions(opening);
 let holdRetreat,holdRestored,restored;
 const ready=new Promise(resolve=>{holdRetreat=resolve;});
 const restoredReady=new Promise(resolve=>{holdRestored=resolve;});
 const source=await nativeProductionAuthority(initial,{...options,onReady:record=>isRetreat(record)?ready:undefined});
 try{
  await source.command({kind:'setNavigationView',view:options.navigationView});
  let proposed=null,events=[];
  for(let i=0;i<620&&!proposed;i++){
   const p=await advance(source,8,true);
   events.push(...p.events);
   for(const key of p.residency?.missing??[])await source.command({kind:'addChunk',key});
   await source.present();
   proposed=source.records.find(record=>isRetreat(record)&&record.packet);
  }
  assert(proposed);
  const at=source.snapshot(),[animal]=at.raid.animals;
  assert.equal(animal.status,'retreating');
  assert.equal(animal.path,null);
  assert.equal(animal.hitsRemaining,0);
  assert.equal(at.structures[0].hp,560);
  assert.equal(proposed.resources.reference.bodyId,2);
  assert.equal(proposed.committed,false);
  assert.equal(events.filter(event=>event.type==='AnimalLogicalHit').length,2);
  const command={kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true};
  const returned=await source.command(command);
  const disk=prepareWorkerCheckpoint(returned,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  const persisted=serialize(disk.state),saved=savedNativeAuthorityOptions(persisted);
  assert.equal(saved.nativeWorkerLifecycle,true,'pending Retreat must preserve its native profile');
  assert.equal(JSON.parse(returned.liveSnapshot).raid.animals[0].path,null);
  assert.equal(proposed.committed,false);
  assert.deepEqual(pose(disk.state.raid.animals[0]),pose(animal));
  const ref=proposed.resources.reference,points=disk.state.raid.animals[0].path;
  assert(points.length>1);
  assert.deepEqual(points.at(-1),{x:Math.fround(ref.targetX),z:Math.fround(ref.targetZ)});
  if(process.env.QA_PENDING_RETREAT_SAVE)writeFileSync(process.env.QA_PENDING_RETREAT_SAVE,persisted+'\n');
  restored=await nativeProductionAuthority(disk.state,{...saved,onReady:record=>isRetreat(record)?restoredReady:undefined});
  await restored.command({kind:'setNavigationView',view:saved.navigationView});
  await untilProduction(restored,()=>restored.records.some(record=>isRetreat(record)&&record.packet));
  const reacquired=restored.records.find(isRetreat),newRef=reacquired.resources.reference;
  assert.equal(newRef.actorId,ref.actorId);
  assert.notEqual(newRef.worldBoundary.authorityEpoch,ref.worldBoundary.authorityEpoch);
  const before=proposed.resources,after=reacquired.resources;
  assert.equal(after.rowWidth,before.rowWidth);
  assert.equal(after.rows.length,before.rows.length);
  assert.equal(after.startTime,disk.state.elapsed);
  for(let offset=0;offset<before.rows.length;offset+=before.rowWidth){
   assert(Math.abs((after.rows[offset]-after.startTime)-(before.rows[offset]-before.startTime))<=1e-9,
    'cold staging preserves the timing relative to its new origin');
   assert.deepEqual(after.rows.slice(offset+1,offset+after.rowWidth),before.rows.slice(offset+1,offset+before.rowWidth),
    'cold staging preserves every non-time value');
  }
  await advance(restored,2);
  assert.deepEqual(pose(restored.snapshot().raid.animals[0]),pose(animal));
  const heldAgain=await restored.command(command);
  assert.equal(heldAgain.nativeAuthorityCheckpoint.workerLifecycle,1);
  assert.deepEqual(JSON.parse(heldAgain.snapshot).raid.animals[0].path,points);
  assert.equal(reacquired.committed,false);
  holdRestored();
  await untilProduction(restored,()=>reacquired.committed);
  await restored.present();await reacquired.packet.presented;
  let final=restored.snapshot();
  events=[];
  for(let i=0;i<360&&final.raid;i++){
   const step=await advance(restored,2);
   events.push(...step.events);final=JSON.parse(step.snapshot);
   await restored.present();
  }
  assert.equal(final.raid,null);
  assert.equal(final.structures[0].hp,560);
  assert.deepEqual(final.ledger,at.ledger);
  assert.equal(events.filter(event=>event.type==='AnimalLogicalHit').length,0);
  assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
  assert.equal(proposed.committed,false);
  assert.deepEqual(source.faults,[]);
  assert.deepEqual(restored.faults,[]);
 }finally{
  holdRestored();
  // Close the source without giving that old native ticket a GO.
  const closing=source.close();holdRetreat();
  try{await closing;}finally{await restored?.close();}
 }
});
