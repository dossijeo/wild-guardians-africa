import assert from 'node:assert/strict';
import test from 'node:test';
import {plant} from '../src/simulation/game.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

const view={bounds:[24,-48,144,48],eye:{x:76,z:30},target:{x:75,z:-4}};
const pose=({x,z,heading,runPhase,walkPhase,carryPhase,runRemaining})=>({x,z,heading,runPhase,walkPhase,carryPhase,runRemaining});
const step=(fixture,steps=10)=>fixture.command({kind:'advance',seconds:.05,steps,nightFastForward:false});

test('ordinary Idle22 saves pending and moving poses and reacquires the same destination',{timeout:45000},async()=>{
 const opening=await createSpatialCampaignOpening({seed:714});
 const {state,nav}=opening,chunkKeys=[...opening.loaded.keys()];
 try{
  state.tutorial.step='plant';
  const center=state.structures.find(s=>s.kind==='center');
  assert(plant(state,'idle22-crop','platano',center.x+4,center.z-7,nav));
 }finally{opening.dispose();}
 let releaseSource;
 const hold=new Promise(resolve=>{releaseSource=resolve;});
 const source=await nativeProductionAuthority(state,{chunkKeys,nativeWorkerLifecycle:true,onReady:record=>record.kind==='idle-stroll'?hold:undefined});
 const command={kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true};
 function checkpoint(result){
  const saved=prepareWorkerCheckpoint(result,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert.equal(saved.saved,true,JSON.stringify(saved));
  assert.equal(saved.state.workerNativeAuthorityCheckpoint.workerLifecycle,1);
  return saved.state;
 }
 async function restore(saved,prior){
  let release;
  const ready=new Promise(resolve=>{release=resolve;});
  const restored=await nativeProductionAuthority(saved,{...savedNativeAuthorityOptions(serialize(saved)),onReady:record=>record.kind==='idle-stroll'?ready:undefined});
  try{
   await restored.command({kind:'setNavigationView',view});
   await untilProduction(restored,()=>restored.records.some(record=>record.kind==='idle-stroll'&&record.packet));
   const record=restored.records.find(record=>record.kind==='idle-stroll'),before=saved.workers[0];
   assert.notEqual(record.resources.worldBoundary.authorityEpoch,prior.resources.worldBoundary.authorityEpoch);
   assert.equal(record.committed,false);
   assert.deepEqual(record.resources.nativeIdleStroll.destination,{x:before.idleState.destination.x,z:before.idleState.destination.z});
   await step(restored,3);
   const current=restored.snapshot();
   assert.equal(current.workers[0].nativeRouteAdmission,'pending-stroll-resources');
   assert.deepEqual(pose(current.workers[0]),pose(before));
   assert.deepEqual(current.workers[0].idleState,before.idleState);
   assert.deepEqual(current.ledger,saved.ledger);
   const pending=checkpoint(await restored.command(command));
   assert.equal(pending.workers[0].nativeRouteAdmission,'pending-stroll-resources');
   assert.deepEqual(pose(pending.workers[0]),pose(before));
   assert.deepEqual(pending.workers[0].idleState,before.idleState);
   release();
   await untilProduction(restored,()=>record.committed);
   await restored.present();
   await record.packet.presented;
   await step(restored,3);
   const moved=restored.snapshot().workers[0];
   assert.equal(moved.nativeRouteAdmission,'native-idle-stroll');
   assert(moved.walkPhase>before.walkPhase);
   assert.deepEqual(restored.faults,[]);
  }finally{release();await restored.close();}
 }
 try{
  await source.command({kind:'setNavigationView',view});
  await source.command({kind:'openInitialHiring'});
  await source.command({kind:'hire',id:'idle22-hire',selection:{youngMale:1}});
  let idle;
  for(let i=0;i<240&&!idle;i++){
   const result=await step(source);
   for(const key of result.residency?.missing??[])await source.command({kind:'addChunk',key});
   await source.present();
   idle=source.records.find(record=>record.kind==='idle-stroll'&&record.packet);
  }
  assert(idle,'seed 714 must produce an ordinary selected stroll');
  const before=source.snapshot().workers[0];
  assert.equal(idle.committed,false);
  releaseSource();
  await untilProduction(source,()=>idle.committed);
  await source.present();
  await idle.packet.presented;
  await step(source,3);
  const moving=checkpoint(await source.command(command));
  assert.equal(moving.workers[0].nativeRouteAdmission,'native-idle-stroll');
  assert(moving.workers[0].walkPhase>before.walkPhase);
  const selected=moving.workers[0].idleState;
  const wrongDestination=structuredClone(moving);
  wrongDestination.workers[0].idleState.destination.x+=100;
  assert.equal(confirmedStateSaveAvailable(wrongDestination),false);
  const wrongOwner=structuredClone(moving);
  wrongOwner.workers[0].idleState.anchorId='farm-plant-999999';
  if(selected.anchorId===selected.destination.id){
   wrongOwner.workers[0].idleState.destination.id='farm-plant-999999';
   wrongOwner.workers[0].destinationId='farm-plant-999999';
  }
  assert.equal(confirmedStateSaveAvailable(wrongOwner),false);
  await restore(moving,idle);
  assert.deepEqual(source.faults,[]);
 }finally{releaseSource();await source.close();}
});
