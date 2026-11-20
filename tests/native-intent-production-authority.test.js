import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {createPlant} from '../src/simulation/crops.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeActionSave} from './helpers/native-task-action-restoration.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';

for(const profile of PROFILES)test(`${profile.id} ordinary authority binds a restored22 once and admits it automatically through both existing ports`,async()=>{
 const saved=nativeIdleStrollGameSave({profile:profile.id}),old=structuredClone(saved.state.workers[0]);const f=await nativeProductionAuthority(saved.state,{attach:false});try{
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');const before=f.snapshot();assert.equal(before.workers[0].nativeRouteAdmission,'pending-stroll-resources');assert.equal(f.records.length,0);
  await f.attach();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));await f.present();
  const state=f.snapshot(),record=f.records[0];assert.equal(record.kind,'idle-stroll');assert.equal(record.resources.bodyId,1);assert(record.minSequence>=1);assert.equal(state.workers[0].nativeRouteAdmission,'native-idle-stroll');
  for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(state.workers[0][key],old[key]);assert(Math.abs(state.workers[0].heading-old.heading)<1e-12);assert.deepEqual(state.workers[0].idleState,old.idleState);
  const moved=f.advance();assert.notDeepEqual([moved.workers[0].x,moved.workers[0].z],[old.x,old.z]);assert.equal(moved.rng,state.rng);assert.equal(f.records.filter(r=>r.kind==='idle-stroll').length,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('authority produces restored20, watch21, WALK22 and arrival REST21 without direct commits',async()=>{
 const source=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:1,peer:false});let f;try{
  f=await nativeProductionAuthority(source.state);await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));await f.present();assert.equal(f.records.length,1,'next family waits for a real Game publication');f.snapshot();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-cycle'&&r.committed));
  assert.deepEqual(f.records.map(r=>r.kind),['initial-idle-body','idle-cycle']);assert.equal(f.snapshot().workers[0].idleState.mode,'watch');
  assert(f.records[1].minSequence>f.records[0].minSequence);
  f.advance();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));assert.equal(f.snapshot().workers[0].idleState.mode,'walk');
  for(let i=0;i<150&&f.records.filter(r=>r.kind==='idle-cycle').length<2;i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.filter(r=>r.kind==='idle-cycle'&&r.committed).length===2);const state=f.snapshot();assert.equal(state.workers[0].idleState.mode,'rest');assert.equal(state.workers[0].nativeRouteAdmission,'native-idle');assert.equal(state.rng,source.state.rng);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();source.close();}
});

test('a genuine harvest command replaces a pending restored WALK and production uses the new Task request',async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0],target=createPlant(`plant-${saved.state.nextId++}`,'mijo',worker.x+1,worker.z,worker.centerId);target.growth=999999;saved.state.plants.push(target);let release;const waiting=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved.state,{async onPrepare(record){if(record.kind==='idle-stroll')await waiting;}});try{
  await untilProduction(f,()=>f.records.length===1);assert.equal(f.command({kind:'harvest',id:'production-harvest',targetId:target.id}).value,true);const pending=f.advance();assert.equal(pending.workers[0].nativeRouteAdmission,'pending-resources');assert.equal(pending.tasks.find(t=>t.id===pending.workers[0].taskId).targetId,target.id);
  release();await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const state=f.advance();assert.equal(state.workers[0].nativeRouteAdmission,'native-task');assert.equal(f.records.filter(r=>r.kind==='idle-stroll'&&r.committed).length,0);assert.equal(f.host.inspect().failed,false);assert.equal(f.host.inspect().preparationRecoveryRequired,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('authority automatically acquires fresh Home and its prepared absence at the real endpoint',async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0];Object.assign(worker,{status:'returning',nativeRouteAdmission:'pending-home-resources',idleState:null,destinationId:null});saved.state.villages.find(v=>v.id===worker.villageId).entry={x:worker.x+6,z:worker.z};
 const f=await nativeProductionAuthority(saved.state);try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));
  for(let i=0;i<200&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));const state=f.snapshot();assert.equal(state.workers[0].status,'home');assert.equal(state.workers[0].nativeRouteAdmission,undefined);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('restored harvest action produces Carry and genuine settlement through ordinary authority boundaries',async()=>{
 const saved=nativeActionSave().saved,worker=saved.workers[0];saved.workers=[worker];saved.tasks=saved.tasks.filter(t=>t.workerId===worker.id);saved.plants=saved.plants.filter(p=>p.id===saved.tasks[0].targetId);
 // Same authored clear-corridor checkpoint as nativeTaskConsequenceFixture;
 // configure before constructing the fresh authority, never mutate live goals.
 const center=saved.structures.find(s=>s.id===worker.centerId);center.x=worker.x-6;center.z=worker.z+6;
 const f=await nativeProductionAuthority(saved);try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-action'&&r.committed));
  for(let i=0;i<400&&!f.records.some(r=>r.kind==='task-settlement');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-settlement'&&r.committed));const state=f.snapshot();assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.kind),['task-action','task-consequence','task-settlement']);assert.equal(state.crates.length,1);assert.equal(state.crates[0].delivered,true);assert.equal(state.workers[0].crateId,null);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const kind of ['initial','water'])test(`completed ${kind} stays on its admitted body without dispatching a Harvest delivery`,async()=>{
 const {saved,oldBinding}=nativeActionSave({kind}),worker=saved.workers[0];
 saved.workers=[worker];saved.tasks=saved.tasks.filter(task=>task.workerId===worker.id);
 const plant=saved.plants.find(plant=>plant.id===saved.tasks[0].targetId);
 Object.assign(plant,createPlant(plant.id,plant.species,plant.x,plant.z,plant.centerId));
 if(kind==='water'){
  plant.water[0].status='manual';plant.water[1].status='due';plant.growth=plant.water[1].at;
 }
 saved.plants=[plant];
 const f=await nativeProductionAuthority(saved);try{
  await untilProduction(f,()=>f.records.some(record=>record.kind==='task-action'&&record.committed));
  const admitted=f.records[0],duration=oldBinding.reference.request.duration;
  for(let i=0;i<200&&f.snapshot().workers[0].nativeTaskAction.elapsed<duration;i++){
   f.advance();await f.present();
  }
  await f.present();const state=f.snapshot(),current=state.workers[0];
  assert.equal(current.nativeTaskAction.elapsed,duration);
  assert.equal(current.nativeRouteAdmission,'native-action');
  assert.equal(current.taskId,saved.tasks[0].id);
  assert.deepEqual([current.x,current.z],[worker.x,worker.z]);
  assert.equal(state.plants[0].water[kind==='initial'?0:1].status,'due');
  assert.equal(state.crates.length,0);
  assert.deepEqual(f.records,[admitted]);
  assert.equal(f.authority.nativeIntentProductionStatus().last.kind,'task-action');
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('closing the authority aborts its one pending preparation without publishing a late WALK',async()=>{
 const saved=nativeIdleStrollGameSave();let release;const waiting=new Promise(resolve=>{release=resolve;});const f=await nativeProductionAuthority(saved.state,{async onPrepare(){await waiting;}});try{
  await untilProduction(f,()=>f.records.length===1);f.authority.dispose();release();await f.present();assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.equal(f.records.filter(r=>r.committed).length,0);assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
});

test('a preparation failure is observable and cannot turn into a repeated failed production loop',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{onPrepare(){throw Error('production fixture failure');}});try{
  for(let i=0;i<1000&&f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'failed');assert.match(f.authority.nativeIntentProductionStatus().fault,/production fixture failure/);assert.equal(f.records.length,1);assert.throws(()=>f.snapshot(),/production failed/);assert.equal(f.records.length,1);
 }finally{await f.close();}
});

test('a mixed legacy roster keeps native activation closed until every mover has a source projection',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0];saved.state.workers.push({...structuredClone(a),id:'worker-900012',z:a.z+6,nativeRouteAdmission:undefined,idleState:null,destinationId:null});
 const f=await nativeProductionAuthority(saved.state);try{assert.equal(f.authority.nativeIntentProductionStatus().phase,'unsupported-cohort');f.snapshot();await f.present();assert.equal(f.records.length,0);assert.deepEqual(f.faults,[]);}finally{await f.close();}
});

test('real authority Home peer advances while restored WALK waits for resource preparation',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0],peer={...structuredClone(a),id:'worker-900012',x:a.x,z:a.z+6,status:'returning',idleState:null,destinationId:null,nativeRouteAdmission:'pending-home-resources'};
 saved.state.workers=[peer,a];saved.state.villages.find(v=>v.id===a.villageId).entry={x:a.x+12,z:a.z+6};let release;const waiting=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(saved.state,{async onPrepare(record){if(record.kind==='idle-stroll')await waiting;}});try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'));assert(f.records[0].committed);const before=f.snapshot(),next=f.advance();assert.equal(next.workers[0].nativeRouteAdmission,'native-home');assert.notDeepEqual([next.workers[0].x,next.workers[0].z],[before.workers[0].x,before.workers[0].z]);assert.deepEqual(next.workers[1],before.workers[1]);assert.equal(f.authority.nativeResourcePreparationStatus().pending,1);
  release();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));await f.present();const acquired=f.snapshot();assert.equal(acquired.workers[1].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.records[1].resources.bodyId,2);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('a Home missing resident data does not starve the next ready restored stroll',async()=>{
 const saved=nativeIdleStrollGameSave(),a=saved.state.workers[0],peer={...structuredClone(a),id:'worker-900012',x:a.x,z:a.z+6,status:'returning',idleState:null,destinationId:null,nativeRouteAdmission:'pending-home-resources'};saved.state.workers=[peer,a];saved.state.villages.find(v=>v.id===a.villageId).entry={x:10000,z:10000};
 const f=await nativeProductionAuthority(saved.state);try{
  await untilProduction(f,()=>f.authority.nativeIntentProductionStatus().last?.kind==='home-route');assert.equal(f.records.length,0);const before=f.snapshot();
  await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));const state=f.snapshot();assert.equal(state.workers[1].nativeRouteAdmission,'native-idle-stroll');assert.deepEqual(state.workers[0],before.workers[0]);assert.equal(state.workers[0].nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('changed ordinary run urgency cancels a pending Task14 even when its request handle is unchanged',async()=>{
 const source=createNativeTaskGameFixture(),state=source.state,worker=state.workers[0];state.workers=[worker];state.tasks=state.tasks.filter(t=>t.workerId===worker.id);state.plants=state.plants.filter(p=>p.id===state.tasks[0].targetId);
 const targets=Array.from({length:3},(_,i)=>{const p=createPlant(`plant-${state.nextId++}`,'mijo',worker.x+i+1,worker.z-3.3,worker.centerId);p.growth=999999;return p;});state.plants.push(...targets);let release;const waiting=new Promise(resolve=>{release=resolve;});let f;
 try{
  f=await nativeProductionAuthority(state,{async onPrepare(record){if(record.kind==='task-start'&&f.records.filter(r=>r.kind==='task-start').length===1)await waiting;}});
  await untilProduction(f,()=>f.records.length===1);assert.equal(f.records[0].resources.runDistance,0);const request=f.records[0].resources.sourceRequestHandle;assert(request);
  for(const target of targets)assert.equal(f.command({kind:'harvest',id:`urgency-${target.id}`,targetId:target.id}).value,true);
  release();await untilProduction(f,()=>f.records.filter(r=>r.kind==='task-start').length===2&&f.records[1].committed);
  assert.deepEqual(f.records[1].resources.sourceRequestHandle,request);assert(f.records[1].resources.runDistance>0);assert.equal(f.records[0].committed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f?.close();source.close();}
});


test('ordinary native production waits for the terrain publisher and forwards its exact current manifest',async()=>{
 let manifest=null,reads=0;const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{getTerrainManifest(){reads++;return manifest;}});try{
  f.snapshot();await f.present();assert.equal(f.records.length,0);assert.equal(f.authority.nativeIntentProductionStatus().phase,'idle');assert(reads>0);
  manifest={epoch:'real-publisher-test',chunks:[{cx:0,cz:0,revision:7}]};f.snapshot();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));
  assert.deepEqual(f.records[0].terrainManifest,manifest);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
