import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {tick} from '../src/simulation/game.js';

async function runAdmission({corrupt=false}={}){
 const f=createNativeTaskGameFixture(),{port1,port2}=new MessageChannel(),session='task25-admission';
 let source,proposed,retained,release,stagedBody,abortCount=0;
 try{
  port2.onmessage=({data:m})=>{
   const reply={session,authorityEpoch:m.authorityEpoch,accepted:true};
   if(m.type==='IntentBaseline')port2.postMessage({...reply,type:'intent-control-applied',sequence:m.sequence,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
   else if(m.type==='IntentClock')port2.postMessage({...reply,type:'intent-clock-applied',clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough});
   else if(m.type==='IntentMutationQuiesce'){
    const ack={...m,type:'intent-mutation-quiesced',accepted:true,preparedFrameSequence:1,nativeTaskRouteStopVersion:1};
    if(corrupt)ack.preparedFarmArrivalStopTemplate={};
    port2.postMessage(ack);
   }else if(m.type==='IntentMutationRelease')release=m;
   else if(m.type!=='IntentControlClosed')port2.postMessage({...reply,type:'intent-control-applied',sequence:m.sequence});
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
 }finally{source?.dispose();port2.close();f.close();}
}

test('Task25 acquires its retimed pose through the ordinary authority admission transaction',()=>runAdmission());
test('Task25 rejects a mixed-family quiescence receipt before touching the body',()=>runAdmission({corrupt:true}));
