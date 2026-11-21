import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmAuthoritySave as save} from './helpers/native-farm-authority-save.js';
import {nativeProductionAuthority as fixture,untilProduction as until} from './helpers/native-production-authority.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';

for(const profile of PROFILES)for(const mode of ['pending','moving','held'])for(const approach of [false,true])test(`${profile.id} ordinary authority restores ${mode} Farm then automatically produces23→${approach?'22→21':'21'}`,async()=>{
 const saved=save({profile:profile.id,mode,approach}),old=saved.worker;const f=await fixture(saved.state,{attach:false});try{
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');const before=f.snapshot().workers[0];assert.equal(before.nativeRouteAdmission,'pending-farm-arrival-resources');assert.equal(f.records.length,0);
  for(const k of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(before[k],old[k],k);
  await f.attach();await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));await f.present();const farm=f.records[0],q=farm.resources.sourceRequest,first=f.snapshot();assert.equal(q.bodyId,1);assert.notEqual(q.authorityEpoch,saved.oldEpoch);assert.equal(first.workers[0].nativeRouteAdmission,'native-farm-arrival');
  for(const k of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(first.workers[0][k],old[k],k);assert.equal(q.pose.yaw,old.heading);assert(Math.abs(first.workers[0].heading-farm.resources.rows[5])<1e-12,'acquired heading comes from the actual native motion row');
  for(let i=0;i<350&&!f.records.some(r=>r.kind==='idle-cycle'&&r.committed);i++){f.advance();await f.present();}
  await until(f,()=>f.records.some(r=>r.kind==='idle-cycle'&&r.committed));const end=f.snapshot();assert.equal(end.workers[0].nativeRouteAdmission,'native-idle');assert.equal(end.rng,first.rng);assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.kind),['farm-arrival',...(approach?['idle-stroll']:[]),'idle-cycle']);assert.equal(f.records.filter(r=>r.kind==='farm-arrival').length,1);
  for(const r of f.records)assert.equal((r.resources.nativeFarmArrival?.bodyId??r.resources.nativeIdleStroll?.bodyId??r.resources.nativeIdleCycle?.sourceBody.bodyId),1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const profile of PROFILES)test(`${profile.id} pending restored Farm crosses its contract boundary before attaching resources and produces Home instead of23`,async()=>{
 const saved=save({profile:profile.id,configureState(state){state.time=profile.end-.01;}}),f=await fixture(saved.state,{attach:false});try{
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');const start=f.snapshot().workers[0],next=f.advance(.05).workers[0];assert.equal(next.nativeRouteAdmission,'pending-home-resources');assert.equal(next.status,'returning');assert.equal(next.x,start.x);assert.equal(next.z,start.z);await f.attach();await until(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));assert.equal(f.records.filter(r=>r.kind==='farm-arrival').length,0);assert.equal(f.records[0].resources.bodyId,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('a restored Farm mixed with an unsupported legacy mover still rejects native activation',async()=>{
 const saved=save(),worker=saved.state.workers[0];saved.state.workers.push({...structuredClone(worker),id:'worker-900012',z:worker.z+6,nativeRouteAdmission:undefined,status:'idle'});const f=await fixture(saved.state);try{assert.equal(f.authority.nativeIntentProductionStatus().phase,'unsupported-cohort');assert.equal(f.records.length,0);assert.deepEqual(f.faults,[]);}finally{await f.close();}
});

test('a blocked saved Farm anchor cannot acquire an approach or move the terminal body',async()=>{
 const saved=save({mode:'moving',approach:true,anchorOffset:-5}),f=await fixture(saved.state);try{
  await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));let end;
  for(let i=0;i<180;i++){end=f.advance();await f.present();if(f.authority.nativeIntentProductionStatus().last?.kind==='idle-stroll')break;}
  assert.equal(f.authority.nativeIntentProductionStatus().last?.status,'unsupported');const actor=structuredClone(end.workers[0]);
  for(let i=0;i<3;i++){const next=f.advance();await f.present();for(const k of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(next.workers[0][k],actor[k]);}
  assert.equal(f.records.filter(r=>r.kind!=='farm-arrival').length,0);assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'native-farm-arrival');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const profile of PROFILES)for(const home of [false,true])test(`${profile.id} ordinary moving Farm produces24 then ${home?'Home18':'Task14'} from its original body`,async()=>{
 const saved=save({profile:profile.id,configureState(state){if(home)state.time=profile.end-.01;else state.plants[0].growth=999999;}}),f=await fixture(saved.state);try{
  await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
  const clocks=[],post=f.controlPort.postMessage.bind(f.controlPort);f.controlPort.postMessage=m=>{if(m.type==='IntentClock')clocks.push(m.clockSequence);post(m);};
  if(!home)assert.equal(f.command({kind:'harvest',id:'farm-authority-harvest',targetId:saved.state.plants[0].id}).value,true);
  const kind=home?'home-route':'task-start';
  for(let i=0;i<160&&!f.records.some(r=>r.kind===kind&&r.committed);i++){const live=f.advance();if(home&&i===0){assert.equal(live.workers[0].nativeRouteAdmission,'native-farm-arrival');assert.throws(()=>serialize(live),/Invalid native farm arrival/);assert.equal(JSON.parse(serializeConfirmedState(live)).workers[0].nativeRouteAdmission,'native-farm-arrival');}await f.present();}
  await until(f,()=>f.records.some(r=>r.kind===kind&&r.committed));assert.deepEqual(f.records.filter(r=>r.committed).slice(0,3).map(r=>r.kind),['farm-arrival','farm-arrival-stop',kind]);assert.equal(f.records.filter(r=>r.kind==='idle-cycle'||r.kind==='idle-stroll').length,0);const state=f.snapshot();assert.equal(state.workers[0].nativeRouteAdmission,home?'native-home':'native-task');assert(clocks.length>1);for(let i=1;i<clocks.length;i++)assert.equal(clocks[i],clocks[i-1]+1,'every committed native clock is published in order');assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('closing ordinary authority during first Farm preparation cannot publish a late23',async()=>{
 let release;const waiting=new Promise(r=>release=r),f=await fixture(save().state,{async onPrepare(){await waiting;}});try{
  await until(f,()=>f.records.length===1);f.authority.dispose();release();await f.present();assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.equal(f.records.filter(r=>r.committed).length,0);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a first Farm preparation failure is terminal and cannot become a repeated production loop',async()=>{
 const f=await fixture(save().state,{onPrepare(){throw Error('Farm authority preparation rejected');}});try{
  for(let i=0;i<1000&&f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await new Promise(r=>setImmediate(r));assert.equal(f.authority.nativeIntentProductionStatus().phase,'failed');assert.match(f.authority.nativeIntentProductionStatus().fault,/Farm authority preparation rejected/);assert.equal(f.records.length,1);assert.equal(f.records[0].committed,false);assert.throws(()=>f.snapshot(),/production failed/);assert.equal(f.records.length,1);
 }finally{await f.close();}
});

test('restored Farm waits for its ordinary terrain publisher and keeps one body across repeated snapshots',async()=>{
 let manifest=null;const saved=save(),f=await fixture(saved.state,{getTerrainManifest:()=>manifest});try{
  const first=f.snapshot();for(let i=0;i<3;i++){f.snapshot();await f.present();}assert.equal(f.records.length,0);assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');manifest={epoch:'existing-publisher-became-ready',chunks:[]};f.snapshot();await until(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const q=f.records[0].resources.sourceRequest;assert.equal(q.bodyId,1);assert.equal(q.pose.x,first.workers[0].x);assert.equal(q.pose.z,first.workers[0].z);assert.equal(f.records.length,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
