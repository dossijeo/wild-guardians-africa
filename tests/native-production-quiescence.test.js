import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createPlant} from '../src/simulation/crops.js';

test('a suspended authority can attach both ports and publish without starting its pending native request',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{attach:false});
 try{
  const waiting=f.authority.quiesceNativeIntentProduction(),receipt=await waiting;
  assert.equal(f.authority.quiesceNativeIntentProduction(),waiting);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  await f.attach();f.snapshot();await f.present();
  assert.equal(f.records.length,0);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  assert.equal(f.authority.resumeNativeIntentProduction(receipt),true);
  await untilProduction(f,()=>f.records.some(r=>r.committed));
  assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'native-idle-stroll');
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

for(const stage of ['onPrepare','onReady'])test(`quiescence waits through ${stage} and actual commit before certifying a stable source`,async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{[stage]:()=>gate});
 try{
  await untilProduction(f,()=>f.records.length===1);
  let settled=false;const waiting=f.authority.quiesceNativeIntentProduction();waiting.then(()=>{settled=true;},()=>{});
  assert.equal(f.authority.quiesceNativeIntentProduction(),waiting);
  await f.present();assert.equal(settled,false);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'quiescing');
  assert.throws(()=>f.authority.resumeNativeIntentProduction({}),/quiescen|suspend|receipt/i);
  release();await untilProduction(f,()=>f.records[0].committed);const receipt=await waiting;
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  assert.equal(f.authority.nativeResourcePreparationStatus().pending,0);
  assert.equal(f.authority.nativeResourcePreparationStatus().retained,0);
  assert.equal(f.records[0].committed,true);
  const source=f.command({kind:'snapshot',visualTerrain:true}),boundary=source.terrainCheckpoint.nativeWorldBoundary;assert(boundary?.ticket>0);assert.deepEqual(f.authority.nativeIntentControlStatus().current.worldBoundary,boundary);assert.equal(JSON.parse(source.snapshot).workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.authority.nativeIntentProductionStatus().last.status,'committed');await f.present();assert.equal(f.records.length,1);
  f.authority.resumeNativeIntentProduction(receipt);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a consumed or previous suspension receipt cannot release a newer hold at the same publication',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{attach:false});
 try{
  const first=await f.authority.quiesceNativeIntentProduction();
  assert(Object.isFrozen(first));assert.throws(()=>f.authority.resumeNativeIntentProduction({...first}),/receipt|quiescen|suspend/i);
  f.authority.resumeNativeIntentProduction(first);
  assert.throws(()=>f.authority.resumeNativeIntentProduction(first),/receipt|quiescen|suspend/i);
  const second=await f.authority.quiesceNativeIntentProduction();assert.notEqual(first,second);
  assert.throws(()=>f.authority.resumeNativeIntentProduction(first),/receipt|quiescen|suspend/i);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  f.authority.resumeNativeIntentProduction(second);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

test('a real command still invalidates active work while quiescing and its replacement waits for resume',async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0],target=createPlant(`plant-${saved.state.nextId++}`,'mijo',worker.x+1,worker.z,worker.centerId);
 target.growth=999999;saved.state.plants.push(target);
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved.state,{onPrepare:record=>record.kind==='idle-stroll'?gate:undefined});
 try{
  await untilProduction(f,()=>f.records.length===1);
  const waiting=f.authority.quiesceNativeIntentProduction();waiting.catch(()=>{});
  assert.equal(f.command({kind:'harvest',id:'quiescence-harvest',targetId:target.id}).value,true);
  const before=f.advance();assert.equal(before.workers[0].nativeRouteAdmission,'pending-resources');
  release();await f.present();const receipt=await waiting;
  assert.equal(f.records[0].committed,false);
  f.snapshot();await f.present();assert.equal(f.records.length,1);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  f.authority.resumeNativeIntentProduction(receipt);
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  assert.equal(f.advance().workers[0].nativeRouteAdmission,'native-task');
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('a real preparation failure rejects pending quiescence and cannot be revived by a suspension receipt',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{async onPrepare(){await gate;throw Error('quiescence fixture preparation failed');}});
 try{
  await untilProduction(f,()=>f.records.length===1);
  const waiting=f.authority.quiesceNativeIntentProduction();
  const rejected=assert.rejects(waiting,/quiescence fixture preparation failed/);rejected.catch(()=>{});
  release();await f.present();await rejected;
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'failed');
  assert.throws(()=>f.authority.resumeNativeIntentProduction({}),/failed|unavailable/i);
  await assert.rejects(f.authority.quiesceNativeIntentProduction(),/failed|unavailable/i);
  assert.throws(()=>f.snapshot(),/production failed/);
  assert.equal(f.records.length,1);
 }finally{release();await f.close();}
});

test('disposing an authority during quiescence rejects the waiter and prevents a late commit',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{onPrepare:()=>gate});
 try{
  await untilProduction(f,()=>f.records.length===1);
  const waiting=f.authority.quiesceNativeIntentProduction(),rejected=assert.rejects(waiting,/closed|disposed|unavailable/i);rejected.catch(()=>{});
  f.authority.dispose();release();await f.present();await rejected;
  assert.equal(f.records.some(r=>r.committed),false);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');
  assert.throws(()=>f.authority.resumeNativeIntentProduction({}),/closed|disposed|unavailable/i);
 }finally{release();await f.close();}
});

for(const mode of ['inactive','unsupported-cohort'])test(`quiescence never enables an ${mode} authority cohort`,async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0];
 if(mode==='inactive')delete worker.nativeRouteAdmission;
 else saved.state.workers.push({...structuredClone(worker),id:'worker-900012',z:worker.z+6,nativeRouteAdmission:undefined,idleState:null,destinationId:null});
 const f=await nativeProductionAuthority(saved.state);
 try{
  const receipt=await f.authority.quiesceNativeIntentProduction();assert.equal(receipt,null);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,mode);
  assert.throws(()=>f.authority.resumeNativeIntentProduction({}),/receipt|quiescen/i);
  assert.equal(f.authority.resumeNativeIntentProduction(receipt),true);
  f.snapshot();await f.present();assert.equal(f.records.length,0);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,mode);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});
