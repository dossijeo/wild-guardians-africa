import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function transport(f){
 const {port1,port2}=new MessageChannel(),received=[],errors=[],waiters=[];let draw;
 port2.onmessage=({data:m})=>{
  received.push(m);for(const waiter of [...waiters])if(waiter.type===m.type){waiters.splice(waiters.indexOf(waiter),1);waiter.resolve(m);}
  if(m.type==='IntentBaseline'){
   draw=createNativeRouteControl({authorityEpoch:m.authorityEpoch,initialSequence:m.sequence,initialTime:m.effectiveTime,routes:m.routes});
   draw.acceptClock(m.clock,{baseline:true});port2.postMessage({type:'intent-control-applied',session:'boundary',authorityEpoch:m.authorityEpoch,
    sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  }else if(m.type==='IntentClock'){
   draw.acceptClock(m);port2.postMessage({type:'intent-clock-applied',session:'boundary',authorityEpoch:m.authorityEpoch,
    clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  }else if(m.type==='IntentControlClosed')draw.dispose();
  else if(m.type!=='IntentMutationQuiesce'&&m.type!=='IntentMutationRelease'){
   draw.accept(m);port2.postMessage({type:'intent-control-applied',session:'boundary',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
  }
 };
 const source=createNativeIntentControlPublication({port:port1,session:'boundary',observe:f.bridge.observeNativeIntentControl,
  absoluteNow:()=>1000,onError:error=>errors.push(error)});
 return {source,received,errors,wait:type=>new Promise(resolve=>waiters.push({type,resolve})),ack:request=>port2.postMessage({...request,type:'intent-mutation-quiesced',accepted:true}),
  dispose(){source.dispose();port2.close();}};
}
function setup(){
 const f=fixture(),a=f.worker(1,f.point(-6,0),f.point(6,0)),b=f.worker(4,f.point(-6,6),f.point(6,6));
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');
 assert.equal(f.bridge.commitNativeCausalClock().status,'committed');f.bridge.intentChanges();return {...f,a,b};
}
const options=(f,c)=>({getPublication:()=>c.source,...f.point(2,0),halfX:.15,halfZ:.6,yaw:.2});

test('the authority stages no world changes, waits for its exact direct receipt, then publishes revocation before releasing drawing',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
  assert.equal((await f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c))).status,'busy');
  const released=c.wait('IntentMutationRelease');c.ack(request);const result=await pending,release=await released;
  assert.equal(result.status,'committed');assert(result.barrierId>0);assert.equal(f.bridge.nativeRouteTiming(f.a),null);assert(f.bridge.nativeRouteTiming(f.b));
  const types=c.received.map(m=>m.type),revoked=types.lastIndexOf('RouteInvalidated'),clock=types.lastIndexOf('IntentClock'),end=types.lastIndexOf('IntentMutationRelease');
  assert(revoked>types.indexOf('IntentMutationQuiesce')&&clock>revoked&&end>clock);
  assert.equal(release.heldTime,11);assert.equal(release.sequence,sequence+1);assert.equal(release.clockSequence,request.clockSequence+1);
  assert.deepEqual(c.errors,[]);assert.equal(c.source.status().pendingMutationHold,null);
 }finally{c.dispose();f.session.dispose();}
});

test('a world or clock change during the draw hold rejects the old proposal without publishing its barrier',async()=>{
 for(const change of ['body','clock']){
  const f=setup(),c=transport(f);try{
   await c.source.ready;const received=c.wait('IntentMutationQuiesce'),pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
   if(change==='body'){const p=f.point(35,35);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.2,0,1),1);}
   else assert.equal(f.bridge.commitNativeCausalClock({paused:true}).status,'committed');
   const before=f.session.core.snapshot(),release=c.wait('IntentMutationRelease');c.ack(request);
   assert.equal((await pending).status,'stale');await release;assert.deepEqual(f.session.core.snapshot(),before);
   assert(f.bridge.nativeRouteTiming(f.a));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(c.errors,[]);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('a forged draw receipt closes the direct channel and leaves the staged mutation unpublished',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
  c.ack({...request,clockSequence:request.clockSequence+1});assert.equal((await pending).status,'control-failed');
  assert.equal(c.source.status().closed,true);assert.deepEqual(f.session.core.snapshot(),before);
  assert(f.bridge.nativeRouteTiming(f.a));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{c.dispose();f.session.dispose();}
});
