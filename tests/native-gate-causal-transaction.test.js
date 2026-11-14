import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeGateMotionResources} from '../src/world/native-gate-motion-resources.js';

function fixture(){const f=nativeGateCrossingFixture({opening:1});f.state.workers=[];f.bridge.applyEvents(f.state,[{type:'worker',id:'worker-900011',remove:true}]);assert.equal(f.bridge.commitNativeCausalClock({paused:true}).status,'committed');return f;}
function control(f){
 const {port1,port2}=new MessageChannel(),requests=[];let draw;
 port2.onmessage=({data:m})=>{
  if(m.type==='IntentBaseline'){draw=createNativeRouteControl({authorityEpoch:m.authorityEpoch,initialSequence:m.sequence,initialTime:m.effectiveTime,routes:m.routes});draw.acceptClock(m.clock,{baseline:true});port2.postMessage({type:'intent-control-applied',session:'gate-causal',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});}
  else if(m.type==='IntentClock'){draw.acceptClock(m);port2.postMessage({type:'intent-clock-applied',session:'gate-causal',authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});}
  else if(m.type==='IntentMutationQuiesce'){requests.push(m);port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true});}
  else if(m.type==='IntentMutationRelease')requests.push(m);
  else if(m.type==='IntentControlClosed')draw?.dispose();
  else {draw.accept(m);port2.postMessage({type:'intent-control-applied',session:'gate-causal',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});}
 };
 const source=createNativeIntentControlPublication({port:port1,session:'gate-causal',observe:f.bridge.observeNativeIntentControl});
 return {source,requests,close(){source.dispose();port2.close();}};
}

test('causal gate motors require prepared resources and use the existing quiescence, marker and release protocol',async()=>{
 const f=fixture(),c=control(f);try{
  await c.source.ready;const before=f.bridge.nativeGateMechanismPose(f.gates[0].id);let prepared,committed=0,aborted=0;
  const absent=await f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:()=>c.source});assert.equal(absent.status,'resources-unavailable');assert.deepEqual(f.bridge.nativeGateMechanismPose(f.gates[0].id),before);
  const result=await f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:()=>c.source,prepareResources:async({resources})=>{
   prepared=copyNativeGateMotionResources(resources);assert.equal(prepared.gates.length,1);assert.equal(prepared.gates[0].rows[1],1);assert.equal(prepared.gates[0].rows.at(-1),0);assert.deepEqual(f.bridge.nativeGateMechanismPose(f.gates[0].id),before);assert.equal(c.requests.length,0,'preparation precedes the draw hold');
   return {valid:()=>true,commit(value){assert.equal(f.bridge.nativeGateMechanismPose(f.gates[0].id).opening,1);assert.equal(value.resources.phase,'committed');assert.deepEqual(value.worldBoundary,resources.worldBoundary);committed++;return true;},abort(){aborted++;}};
  }});
  assert.equal(result.status,'committed');assert.equal(committed,1);assert.equal(aborted,1);assert.deepEqual(result.worldBoundary,prepared.worldBoundary);assert.equal(c.requests[0].type,'IntentMutationQuiesce');assert.deepEqual(f.bridge.nativeIntentControlBaseline().worldBoundary,result.worldBoundary);
  assert.equal(f.w.nav_gate_prepare_motion(1),-7,'the old immediate path cannot bypass a causal resource boundary');
  assert.equal(f.w.nav_gate_prepare_object_motion(1),-7);
  assert.equal(f.w.nav_gate_reconcile(1),-7);
 }finally{c.close();f.session.dispose();}
});

test('failed or cancelled gate resources cannot change the native motor or obtain a draw hold',async()=>{
 for(const cancel of [false,true]){const f=fixture(),c=control(f);try{
  await c.source.ready;const before=f.bridge.nativeGateMechanismPose(f.gates[0].id),controller=new AbortController();
  const result=await f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:()=>c.source,signal:controller.signal,prepareResources:async()=>{if(cancel)controller.abort();throw Error('graphics unavailable');}});
  assert.equal(result.status,'control-failed');assert.deepEqual(f.bridge.nativeGateMechanismPose(f.gates[0].id),before);assert.equal(c.requests.length,0);
 }finally{c.close();f.session.dispose();}}
});

test('native gate resources become stale on a body change during graphical preparation',async()=>{
 const f=fixture(),c=control(f);let aborted=0;try{
  await c.source.ready;const before=f.bridge.nativeGateMechanismPose(f.gates[0].id),point=f.point(20,20);
  const result=await f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:()=>c.source,prepareResources:async()=>{assert.equal(f.w.spatial_body_upsert(77,point.x,point.z,.2,1,1),1);return {valid:()=>true,commit(){throw Error('stale commit');},abort(){aborted++;}};}});
  assert.equal(result.status,'stale');assert.equal(aborted,1);assert.deepEqual(f.bridge.nativeGateMechanismPose(f.gates[0].id),before);assert.equal(c.requests.length,0);
 }finally{c.close();f.session.dispose();}
});

test('an empty causal cohort advances world motors on the same execution transaction and respects pause',()=>{
 const f=fixture();try{
  const at=f.state.elapsed;f.state.elapsed=at+.1;
  assert.equal(f.bridge.advanceNativeRouteExecution(f.state.elapsed).status,'paused');
  assert.equal(f.w.nav_intent_effective_time(),at);
  f.state.elapsed=at;assert.equal(f.bridge.commitNativeCausalClock({paused:false}).status,'committed');
  f.state.elapsed=at+.1;assert.deepEqual(f.bridge.advanceNativeRouteExecution(f.state.elapsed),{status:'advanced',routes:0,authorizedAutonomy:false});
  assert.equal(f.bridge.commitNativeCausalClock({paused:false}).clock.committedThrough,f.state.elapsed);
  assert.equal(f.w.nav_intent_set_time(f.state.elapsed+.1),0,'ordinary set_time cannot bypass native execution');
 }finally{f.session.dispose();}
});
