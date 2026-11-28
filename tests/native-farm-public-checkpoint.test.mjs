import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmAuthoritySave} from './helpers/native-farm-authority-save.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {confirmedStateSaveAvailable,serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {serialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createWorkerSaveCoordinator} from '../src/persistence/worker-save.js';

const poseKeys=['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'];
const pose=worker=>Object.fromEntries(poseKeys.map(k=>[k,worker[k]]));
function checkpoint(state,{claim=confirmedStateSaveAvailable(state)}={}){
 return prepareWorkerCheckpoint({sequence:1,saveAvailable:claim,snapshot:serializeConfirmedState(state),raidWaitBindings:[]},{slotId:state.slotId,policy:{},savedAt:123});
}
async function until(f,predicate){for(let i=0;i<300;i++){await f.present();if(predicate())return;}throw Error('Native producer did not reach required boundary');}

for(const mode of ['pending','moving','held'])test(`public checkpoint accepts validated ${mode} Farm semantics and restores without old permissions`,()=>{
 const {state,worker,oldEpoch}=nativeFarmAuthoritySave({mode});let f;
 try{
  assert.equal(confirmedStateSaveAvailable(state),true);const saved=checkpoint(state);assert.equal(saved.saved,true);assert.deepEqual(pose(saved.state.workers[0]),pose(worker));
  const json=serialize(saved.state);for(const token of ['expectedRouteHandle','native-farm-arrival-route-reference','native-farm-arrival-route-attestation','workerPhysicsCheckpoint'])assert.equal(json.includes(token),false,token);
  f=restoreNativeActionGame(saved.state,{bindBodies:false,admitPeer:false});assert.deepEqual(pose(f.worker),pose(worker));assert.equal(f.worker.nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(f.worker.running,false);assert.equal(f.worker.gateWaiting,false);
  const declaration=f.planner.nativeFarmArrivalDeclarationReference(Number(worker.id.split('-').at(-1)));assert.notEqual(declaration.authorityEpoch,oldEpoch);assert.equal(declaration.bodyId,undefined);assert.equal(f.w.spatial_body_count(),0);
 }finally{f?.close();}
});

for(const expiry of ['day','profile'])test(`expired moving Farm (${expiry}) remains unsavable; only held pose can request fresh Home`,()=>{
 for(const mode of ['moving','held']){
  const {state}=nativeFarmAuthoritySave({mode});const worker=state.workers[0];if(expiry==='day')worker.contractDay=state.day-1;else state.time=PROFILES.find(p=>p.id===worker.profile).end;
  let f;try{
   if(mode==='moving'){
    assert.equal(confirmedStateSaveAvailable(state),false);assert.equal(checkpoint(state).reason,'physics-active');assert.throws(()=>checkpoint(state,{claim:true}),/Invalid native farm arrival/);continue;
   }
   const saved=checkpoint(state);assert.equal(saved.saved,true);const original=pose(worker);f=restoreNativeActionGame(saved.state,{bindBodies:false,admitPeer:false});assert.deepEqual(pose(f.worker),original);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeFarmArrivalRouteBinding(Number(worker.id.split('-').at(-1))),null);
  }finally{f?.close();}
 }
});

test('checkpoint strict validation still rejects incompatible Farm pose or owner even with a save claim',()=>{
 const {state}=nativeFarmAuthoritySave({mode:'held'});
 for(const change of [w=>w.path=[],w=>w.running=true,w=>w.taskId='task-123',w=>w.heading=NaN,w=>w.centerId='structure-999999']){
  const broken=structuredClone(state);change(broken.workers[0]);assert.throws(()=>checkpoint(broken,{claim:true}));
 }
});

test('ordinary moving Farm checkpoint reaccredits fresh resources before movement, preserving topology and pose',async()=>{
 const {state}=nativeFarmAuthoritySave({mode:'pending'});let producer,restored,release;const held=new Promise(resolve=>release=resolve);
 try{
  producer=await nativeProductionAuthority(state);await until(producer,()=>producer.records.some(r=>r.kind==='farm-arrival'&&r.committed));
  producer.advance(.05);producer.command({kind:'pause',reason:'tutorial-action'});
  const current=producer.snapshot(),worker=current.workers[0];assert.equal(worker.nativeRouteAdmission,'native-farm-arrival');
  const saved=prepareWorkerCheckpoint(producer.command({kind:'snapshot',nativeAuthorityCheckpoint:true}),{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:123});assert.equal(saved.saved,true);
  assert.deepEqual(pose(saved.state.workers[0]),pose(worker));const options=savedNativeAuthorityOptions(serialize(saved.state));const before=structuredClone(saved.state.workerNativeAuthorityCheckpoint.spatialState);
  restored=await nativeProductionAuthority(saved.state,{...options,onReady:r=>r.kind==='farm-arrival'?held:undefined});
  await until(restored,()=>restored.records.some(r=>r.kind==='farm-arrival'&&r.packet));const pending=restored.snapshot();assert.equal(pending.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');assert.deepEqual(pose(pending.workers[0]),pose(worker));assert.equal(restored.records.some(r=>r.committed),false);
  const cold=restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint;assert.deepEqual(cold.spatialState,before);
  release();await until(restored,()=>restored.records.some(r=>r.kind==='farm-arrival'&&r.committed));const acquired=restored.snapshot();assert.equal(acquired.workers[0].nativeRouteAdmission,'native-farm-arrival');assert.deepEqual(pose(acquired.workers[0]),pose(worker));
  const old=producer.records.find(r=>r.kind==='farm-arrival').resources,newRecord=restored.records.find(r=>r.kind==='farm-arrival').resources;assert.notEqual(newRecord.worldBoundary.authorityEpoch,old.worldBoundary.authorityEpoch);assert.deepEqual(restored.faults,[]);
 }finally{release?.();await restored?.close();await producer?.close();}
});

test('expired held Farm restores through ordinary Home preparation without granting another Farm route',async()=>{
 const {state}=nativeFarmAuthoritySave({mode:'held'});state.workers[0].contractDay=state.day-1;
 const saved=checkpoint(state);assert.equal(saved.saved,true);let f,release;const held=new Promise(r=>release=r);
 try{
  f=await nativeProductionAuthority(saved.state,{onReady:r=>r.kind==='home-route'?held:undefined});await until(f,()=>f.records.some(r=>r.kind==='home-route'&&r.packet));
  assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'pending-home-resources');assert.deepEqual(pose(f.snapshot().workers[0]),pose(state.workers[0]));assert.equal(f.records.some(r=>r.kind==='farm-arrival'||r.committed),false);
  release();await until(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'native-home');assert.deepEqual(f.faults,[]);
 }finally{release?.();await f?.close();}
});

test('public coordinator saves partial gate opening and Farm crosses after cold readmission',async()=>{
 const source=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(source.state);source.close();
 const worker=state.workers[0],start={x:-14,z:11.8},goal={x:-14,z:3.2},center=state.structures.find(c=>c.id===worker.centerId),service=centerServicePoint(center,state,.8);
 Object.assign(worker,start);state.villages.find(v=>v.id===worker.villageId).entry={...start};center.x+=goal.x-service.x;center.z+=goal.z-service.z;
 const gate={id:'structure-1000000',created:29207,kind:'wall',material:'zarzas',gate:true,x:-14,z:8.2,yaw:0,maxHp:60,hp:60,status:'intact',villageId:'village-1',cost:10,collapseRemaining:0};state.structures.push(gate);state.nextId=1000001;
 const chunkKeys=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];let old,f,saved,release;const held=new Promise(r=>release=r);
 try{
  old=await nativeProductionAuthority(state,{chunkKeys});let current;
  for(let i=0;i<200;i++){current=old.advance(.025);await old.present();const opening=current.structures.find(g=>g.id===gate.id).gateOpen;if(current.workers[0].nativeRouteAdmission==='native-farm-arrival'&&opening>.2&&opening<.65)break;}
  const opening=current.structures.find(g=>g.id===gate.id).gateOpen;assert(opening>.2&&opening<.65);
  old.command({kind:'pause',reason:'qa-gate-save'});
  const save=createWorkerSaveCoordinator({runtime:{submit:c=>old.command(c)},repository:{async save(value){saved=structuredClone(value);}},slotId:state.slotId,checkpointPolicy:{nativeAuthority:true},now:()=>123});
  assert.equal((await save.request()).saved,true);assert.equal(saved.structures.find(g=>g.id===gate.id).gateOpen,opening);
  f=await nativeProductionAuthority(saved,{...savedNativeAuthorityOptions(serialize(saved)),onReady:r=>r.kind==='farm-arrival'?held:undefined});await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.packet));
  const cold=f.snapshot();assert.deepEqual(pose(cold.workers[0]),pose(saved.workers[0]));assert.equal(cold.structures.find(g=>g.id===gate.id).gateOpen,opening);assert.equal(f.records.some(r=>r.committed),false);
  release();await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));f.command({kind:'resume',reason:'qa-gate-save'});
  for(let i=0;i<350;i++){current=f.advance(.025);await f.present();if(current.workers[0].nativeRouteAdmission==='native-idle')break;}
  assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');assert(current.workers[0].z<gate.z-.45);assert.equal(current.structures.find(g=>g.id===gate.id).gateOpen,1);assert.equal(current.structures.find(g=>g.id===gate.id).hp,60);assert.deepEqual(f.faults,[]);
 }finally{release?.();await f?.close();await old?.close();}
});
