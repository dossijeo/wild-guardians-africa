import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from '../tests/helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from '../tests/helpers/native-production-authority.js';
import {rational} from '../src/simulation/money.js';
import {createPlant} from '../src/simulation/crops.js';
import {centerServicePoint} from '../src/world/centers.js';

async function setup(options={}){const source=nativeFarmArrivalRouteFixture({peer:false});let f;try{
 const state=structuredClone(source.state),[repairer]=state.workers;
 const farmer={...structuredClone(repairer),id:'worker-900012',profile:'youngFemale'};state.workers.push(farmer);
 const center=state.structures.find(row=>row.id===repairer.centerId),service=centerServicePoint(center,state,.8);
 center.x+=-14-service.x;center.z+=3.2-service.z;
 state.villages.find(row=>row.id===repairer.villageId).entry={x:-14,z:14.5};
 const wall=state.structures.find(row=>row.kind==='wall'&&row.status==='intact'&&row.material==='zarzas'&&!row.gate);
 Object.assign(wall,{x:-14,z:8.2},{hp:0,status:'ruined',collapseRemaining:0,yaw:0});
 state.tasks=[];
 for(const worker of state.workers)Object.assign(worker,{taskId:null,destinationId:null,nativeRouteAdmission:undefined,path:null,taskApproach:null,nativeTaskAction:undefined,actionRemaining:0});
 Object.assign(repairer,{x:-11.8,z:8.2},{status:'idle',nativeRouteAdmission:'pending-idle-resources',idleState:{anchorId:'farm-plant-900098',mode:'rest',elapsed:0,remaining:12,rng:1656692718,approachRetry:0}});
 Object.assign(farmer,{x:-14,z:11.8},{status:'arriving',nativeRouteAdmission:'pending-farm-arrival-resources',idleState:null});
 const anchor=createPlant('plant-900098','mijo',repairer.x,repairer.z,repairer.centerId);
 for(const slot of anchor.water)slot.status='manual';
 state.plants=[anchor];state.ledger.balance=rational(100000);
 const chunkKeys=[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'];
 f=await nativeProductionAuthority(state,{chunkKeys,...options});
 const acquired=kind=>f.records.find(row=>row.kind===kind&&row.committed);
 await untilProduction(f,()=>acquired('farm-arrival')&&acquired('initial-idle-body'));

 assert.equal(f.command({kind:'requestRepair',id:'active-farm-ruin',targetId:wall.id}).value,true);return {f,wall,repairer,farmer,async close(){await f.close();source.close();}};}catch(e){await f?.close();source.close();throw e;}}
const acquired=(f,kind)=>f.records.filter(r=>r.kind===kind&&r.committed);
async function advanceUntil(f,done){for(let i=0;i<350&&!done();i++){f.advance(.02);await f.present();}assert(done(),JSON.stringify(f.authority.nativeIntentProductionStatus()));}
test('Repair stops affected Farm once, retains both bodies through READY and replans around the acquired wall',async()=>{
 let ready,stopReady,continueReady,receipt,count=0;const held=new Promise(r=>{ready=r;}),stopHeld=new Promise(r=>{stopReady=r;}),continuation=new Promise(r=>{continueReady=r;});
 const x=await setup({onReady:r=>r.kind==='barrier-addition'?held:r.kind==='farm-arrival-stop'?stopHeld:undefined,onPrepare:r=>r.kind==='farm-arrival'&&++count===2?continuation:undefined,onCommit:(r,data)=>{if(r.kind==='barrier-addition')receipt=data.nativeBarrierAdditionBinding;}}),{f,wall,repairer,farmer}=x;
 try{
  const barriers=()=>f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.barriers;
  const originalBarriers=barriers();
  const original=acquired(f,'farm-arrival')[0].resources.nativeFarmArrival;
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival-stop'&&r.packet));
  const movingBefore=f.snapshot().workers.find(w=>w.id===farmer.id);
  for(let i=0;i<3;i++){f.advance(.05);await f.present();}
  const movingAfter=f.snapshot().workers.find(w=>w.id===farmer.id);
  assert.equal(acquired(f,'farm-arrival-stop').length,0);assert.equal(movingAfter.nativeRouteAdmission,'native-farm-arrival');
  assert.notDeepEqual([movingBefore.x,movingBefore.z],[movingAfter.x,movingAfter.z]);
  assert.equal(f.records.some(r=>r.kind==='barrier-addition'),false);stopReady();
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'&&r.packet));
  assert.equal(acquired(f,'farm-arrival-stop').length,1);const stopped=f.snapshot(),worker=()=>f.snapshot().workers.find(w=>w.id===farmer.id),pose=w=>[w.x,w.z,w.heading];
  assert.equal(worker().nativeRouteAdmission,'native-farm-arrival-held');const location=pose(worker());
  for(let i=0;i<6;i++){f.advance(.05);await f.present();assert.deepEqual(pose(worker()),location);}
  assert.equal(f.snapshot().structures.find(s=>s.id===wall.id).hp,0);assert.deepEqual(f.snapshot().ledger.balance,rational(100000));
  assert.deepEqual(barriers(),originalBarriers);
  ready();await untilProduction(f,()=>acquired(f,'barrier-addition').length===1);await advanceUntil(f,()=>count===2);
  await f.present();await acquired(f,'barrier-addition')[0].packet.presented;
  assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary,receipt.reference.worldBoundary);
  assert.equal(barriers().length,originalBarriers.length+1);assert.equal(receipt.nativeIds.length,1);
  for(let i=0;i<5;i++){f.advance(.05);await f.present();assert.deepEqual(pose(worker()),location);assert.equal(worker().nativeRouteAdmission,'native-farm-arrival-held');}
  continueReady();await advanceUntil(f,()=>acquired(f,'farm-arrival').length===2&&f.snapshot().workers.find(w=>w.id===repairer.id).nativeRouteAdmission==='native-idle');
  const replacement=acquired(f,'farm-arrival')[1].resources.nativeFarmArrival;assert.equal(replacement.bodyId,original.bodyId);assert.deepEqual([replacement.sourceHeld.pose.x,replacement.sourceHeld.pose.z],location.slice(0,2));
  for(let i=0;i<8;i++){f.advance(.05);await f.present();}assert.notDeepEqual(pose(worker()).slice(0,2),location.slice(0,2));
  const state=f.snapshot();assert.equal(state.structures.find(s=>s.id===wall.id).hp,wall.maxHp);assert.equal(state.events.filter(e=>e.type==='RepairApplied').length,1);assert.deepEqual(state.ledger.balance,rational(100000-wall.cost));assert.equal(acquired(f,'farm-arrival-stop').length,1);assert.deepEqual(f.errors,[]);assert.deepEqual(f.faults,[]);
  const action=acquired(f,'task-action')[0].resources.request;
  const idle=acquired(f,'initial-idle-body').findLast(r=>r.resources.nativeInitialIdleBody.bodyId===action.bodyId);
  assert(idle&&idle!==acquired(f,'initial-idle-body')[0]);
 }finally{ready();stopReady();continueReady();await x.close();}
});

test('a competing structure owner invalidates Repair after Stop24; cancellation keeps the held body and ordinary continuation',async()=>{
 let release,releaseContinuation,count=0;
 const held=new Promise(r=>{release=r;}),continuation=new Promise(r=>{releaseContinuation=r;});
 const x=await setup({onReady:r=>r.kind==='barrier-addition'?held:undefined,onPrepare:r=>r.kind==='farm-arrival'&&++count===2?continuation:undefined}),{f,wall,farmer}=x;
 const command={kind:'buildWallChain',id:'competing-empty-build',material:'zarzas',points:[],options:{smooth:false,snap:false}};
 let prepared=false;
 try{
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='barrier-addition'&&r.packet));
  const old=f.records.find(r=>r.kind==='barrier-addition'),original=acquired(f,'farm-arrival')[0].resources.nativeFarmArrival;
  const worker=()=>f.snapshot().workers.find(w=>w.id===farmer.id),pose=w=>[w.x,w.z,w.heading],position=pose(worker());
  assert.equal(acquired(f,'farm-arrival-stop').length,1);assert.equal(worker().nativeRouteAdmission,'native-farm-arrival-held');
  let completed=false,error;
  const pending=f.authority.prepareNativeStructureCommand(command).then(()=>{completed=true;prepared=true;},e=>{completed=true;error=e;});
  release();await untilProduction(f,()=>completed);await pending;if(error)throw error;
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  assert.equal(old.committed,false);assert.equal(old.aborted,true);
  assert.equal(f.snapshot().structures.find(s=>s.id===wall.id).hp,0);assert.deepEqual(f.snapshot().ledger.balance,rational(100000));
  assert.equal(f.snapshot().events.some(e=>e.type==='RepairApplied'),false);
  for(let i=0;i<4;i++){f.advance(.05);await f.present();assert.deepEqual(pose(worker()),position);}
  await f.authority.finishNativeStructureCommand(command);prepared=false;
  await untilProduction(f,()=>count===2);assert.deepEqual(pose(worker()),position);
  const replacement=f.records.findLast(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  assert.equal(replacement.bodyId,original.bodyId);assert.deepEqual([replacement.sourceHeld.pose.x,replacement.sourceHeld.pose.z],position.slice(0,2));
  releaseContinuation();await untilProduction(f,()=>acquired(f,'farm-arrival').length===2);
  assert.equal(acquired(f,'farm-arrival-stop').length,1);assert.equal(old.committed,false);
  assert.deepEqual(f.errors,[]);assert.deepEqual(f.faults,[]);
 }finally{release();releaseContinuation();if(prepared)await f.authority.finishNativeStructureCommand(command);await x.close();}
});

for(const boundary of ['farm-arrival-stop','barrier-addition'])test(`disposal during ${boundary} READY cannot publish Repair or resurrect the retired route`,async()=>{
 let release;const held=new Promise(r=>{release=r;}),x=await setup({onReady:r=>r.kind===boundary?held:undefined}),{f,wall,farmer}=x;
 try{
  await advanceUntil(f,()=>f.records.some(r=>r.kind===boundary&&r.packet));
  const pending=f.records.find(r=>r.kind===boundary),before=f.snapshot();
  assert.equal(before.structures.find(s=>s.id===wall.id).hp,0);assert.deepEqual(before.ledger.balance,rational(100000));
  assert.equal(acquired(f,'farm-arrival-stop').length,boundary==='barrier-addition'?1:0);
  assert.equal(before.workers.find(w=>w.id===farmer.id).nativeRouteAdmission,boundary==='barrier-addition'?'native-farm-arrival-held':'native-farm-arrival');
  f.authority.dispose();release();for(let i=0;i<8;i++)await f.present();
  assert.equal(pending.committed,false);assert.equal(acquired(f,'barrier-addition').length,0);assert.equal(acquired(f,'farm-arrival').length,1);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.deepEqual(f.faults,[]);
 }finally{release();await x.close();}
});
