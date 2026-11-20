import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {tick} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';

async function runAdmission({corrupt=false,afterCommit}={}){
 const f=createNativeTaskGameFixture(),{port1,port2}=new MessageChannel(),session='task25-admission';
 let source,control,proposed,retained,release,homeEvent,stagedBody,abortCount=0;
 try{
  port2.onmessage=({data:m})=>{
   const reply={session,authorityEpoch:m.authorityEpoch,accepted:true};
   if(m.type==='IntentBaseline'){
    control=createNativeRouteControl({authorityEpoch:m.authorityEpoch,initialSequence:m.sequence,initialTime:m.effectiveTime,routes:m.routes});
    control.acceptClock(m.clock,{baseline:true});
    control.installStartedRoutes(m.worldBoundary,m.nativeStartedRoutes,{bootstrap:true});
    port2.postMessage({...reply,type:'intent-control-applied',sequence:m.sequence,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
   }else if(m.type==='IntentClock'){
    control.acceptClock(m);
    port2.postMessage({...reply,type:'intent-clock-applied',clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough});
   }
   else if(m.type==='IntentMutationQuiesce'){
    const ack={...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeTaskRouteStopVersion:1};
    if(corrupt)ack.preparedFarmArrivalStopTemplate={};
    port2.postMessage(ack);
   }else if(m.type==='IntentMutationRelease'){
    if(m.committed)control.installTaskRouteStops(m.worldBoundary,m.nativeTaskRouteStops);
    release=m;
   }else if(m.type!=='IntentControlClosed'){
    if(m.homeRequest){
     const forged=structuredClone(m);
     forged.homeRequest.pose.x+=.01;
     assert.throws(()=>control.accept(forged),/actual stopped worker body/);
     homeEvent=m;
    }
    control.accept(m);
    port2.postMessage({...reply,type:'intent-control-applied',sequence:m.sequence});
   }
  };
  source=createNativeIntentControlPublication({port:port1,session,observe:f.planner.observeNativeIntentControl,timeoutMs:1000});
  await source.ready;
  tick(f.state,.1,f.nav);
  const actorId=f.state.workers[0].id,secondBody=f.body(3);
  const result=await f.planner.stopNativeTaskRouteAfterGpuQuiescence({
   actorId,getPublication:()=>source,
   prepareResources({resources,proposedWorldBoundary,deferredStart}){
    assert.equal(deferredStart,true);
    assert.equal(resources.kind,25);
    assert.deepEqual(resources.chunks,[]);
    proposed=resources.nativeStop;
    tick(f.state,.13,f.nav);
    stagedBody=f.body(1);
    let active=true;
    return {preparedWorldBoundary:proposedWorldBoundary,preparedTaskRouteStopTemplate:proposed,valid:()=>active,commit(value){active=false;retained=value;return true;},abort(){if(active){active=false;abortCount++;}}};
   },
  });
  if(corrupt){
   assert.equal(result.status,'control-failed',JSON.stringify(result));
   assert(f.planner.nativeTaskExecution(actorId));
   assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
   assert.deepEqual(f.body(1),stagedBody);
   assert.equal(retained,undefined);
   assert.equal(abortCount,1);
   return;
  }
  for(let i=0;!release&&i<100;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(result.status,'committed',JSON.stringify(result));
  assert(result.timeTranslation.sameResourceOwners);
  assert.equal(result.receipt.nativeTaskRouteStopVersion,1);
  assert.deepEqual(result.receipt.preparedTaskRouteStopTemplate,proposed);
  assert.deepEqual(retained.nativeTaskRouteStopBinding,result.nativeTaskRouteStopBinding);
  assert.deepEqual(release.nativeTaskRouteStops,[result.nativeTaskRouteStopBinding]);
  assert.equal(release.nativeFarmArrivalStops,undefined);
  assert.deepEqual(f.body(1),stagedBody);
  assert.notDeepEqual(f.body(3),secondBody);
  assert.equal(abortCount,0);
  await afterCommit?.(f,result,{control,homeEvent:()=>homeEvent});
 }finally{source?.dispose();port2.close();control?.dispose();f.close();}
}

test('Task25 acquires its retimed pose through the ordinary authority admission transaction',()=>runAdmission());
test('Task25 rejects a mixed-family quiescence receipt before touching the body',()=>runAdmission({corrupt:true}));

test('Game releases only the expired Task and submits Home from its confirmed retained body',()=>runAdmission({
 async afterCommit(f,result,{control,homeEvent}){
  const worker=f.state.workers[0],peer=f.state.workers[1],task=f.state.tasks.find(value=>value.id===worker.taskId);
  const village=f.state.villages.find(value=>value.id===worker.villageId);
  village.entry=f.point(-8,0);
  const held=f.planner.nativeSuspendedGateRoute(result.nativeTaskRouteStopBinding.reference.sourceRoute.actorId);
  const body=f.body(1),peerTask=peer.taskId,count=f.w.spatial_body_count(),ledger=structuredClone(f.state.ledger);
  const request=proof=>f.planner.requestNativeStoppedTaskHome(f.state,worker,proof);
  const binding=result.nativeTaskRouteStopBinding,selector={kind:'native-task-route-stopped-body',version:1,stop:binding.preparedReference,actorId:held.actorId};
  const lease=control.admitTaskRouteStoppedBody(selector);
  assert(lease.isCurrent());
  assert.throws(()=>request(result.nativeTaskRouteStopBinding),/finished contract|expired/);
  assert.equal(task.workerId,worker.id);
  f.state.time=PROFILES.find(value=>value.id===worker.profile).end;
  assert.throws(()=>request({...result.nativeTaskRouteStopBinding,kind:'native-farm-arrival-stop-attestation'}),/Task stop|Task25/);
  assert.equal(task.workerId,worker.id);
  const home=request(result.nativeTaskRouteStopBinding);
  assert.equal(home.bodyId,held.bodyId);
  assert.deepEqual(home.home,{villageId:Number(village.id.split('-').at(-1)),...village.entry});
  for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(home.pose[key],held.pose[key]);
  assert.equal(home.pose.radius,held.radius);
  assert.equal(worker.status,'returning');
  assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(worker.taskId,null);
  assert.equal(task.workerId,null);
  assert.equal(peer.taskId,peerTask);
  assert.deepEqual(f.state.ledger,ledger);
  f.planner.flushTaskEvents();
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  f.planner.flushNativeIntentControl();
  for(let i=0;(!homeEvent()||control.status().clock.intentSequence<home.requestSequence)&&i<100;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(homeEvent().homeRequest,home);
  assert(lease.isCurrent());
  assert.equal(lease.value('x'),home.pose.x);
  assert.equal(f.planner.nativeGameExecutionState(),1);
  assert.equal(f.planner.prepareNativeHomeRouteProposal(home).status,'proposed');
  assert.deepEqual(f.body(1),body);
  assert.equal(f.w.spatial_body_count(),count);
 },
}));
