import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleFailedCycleRemote} from './helpers/native-idle-failed-cycle-control.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleStrollRemoteFixture} from './helpers/native-idle-stroll-remote.js';
import {setup as farmSetup,admit as farmAdmit,present as farmPresent} from './helpers/native-farm-arrival-remote.js';

// Detect expected-negative work in the actual Host admission path, rather than
// depending on a wall-time threshold. Preserve normal TypeError semantics.
function watchInvalidIdleComparisons(){
 const original=globalThis.TypeError;let count=0;
 const observe=args=>{if(['Invalid native Idle cycle reference','Invalid native Idle stroll reference','Invalid native farm arrival route reference'].includes(args[0]))count++;};
 globalThis.TypeError=new Proxy(original,{apply(target,thisArg,args){observe(args);return Reflect.apply(target,thisArg,args);},construct(target,args,newTarget){observe(args);return Reflect.construct(target,args,newTarget);}});
 return {get count(){return count;},restore(){globalThis.TypeError=original;}};
}
function unrelatedClock({client,buffer,resources}){
 client.registerClockBinding(buffer,{byteOffset:12,semantic:'relative',epoch:resources.worldBoundary.effectiveTime});
}

for(const profile of PROFILES)test(`${profile.id} unrelated relative clock does not trigger Idle decoder exceptions`,async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await nativeIdleFailedCycleRemote({profile:profile.id,onPrepare:(_f,event)=>unrelatedClock(event)});const body=f.body(1),rng=f.state.rng;
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();const after=await f.draw(),reference=result.nativeIdleCycleBinding.preparedReference,frame=captureNativeRoutePickFrame(after);
  assert(Number.isFinite(frame.getIdleCycleElapsed(reference)));assert.equal(watch.count,0,'Unrelated clock selection must not construct and catch schema errors');assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.deepEqual(f.v.errors,[]);
 }finally{try{await f?.dispose();}finally{watch.restore();}}
});

test('a generic relative clock cannot replace the missing native Idle physical clock',async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await nativeIdleFailedCycleRemote({idleCycleDecoderClock:false,onPrepare:(_f,event)=>unrelatedClock(event)});const body=f.body(1),worker=structuredClone(f.worker);
  const result=await f.run();assert.equal(result.status,'control-failed');assert.match(result.error,/submitted physical clock/);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.deepEqual(f.planner.nativeIdleStrollRequestReference(f.actor),f.sourceRequest);assert.equal(watch.count,0);
 }finally{try{await f?.dispose();}finally{watch.restore();}}
});

for(const profile of PROFILES)test(`${profile.id} Stroll22 unrelated relative clock does not trigger decoder exceptions`,async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await nativeIdleStrollRemoteFixture({profile:profile.id,idleStrollIdlePhase:true,onPrepare:(_f,event)=>unrelatedClock(event)});const rng=f.state.rng,result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();const after=await f.draw();assert(captureNativeRoutePickFrame(after));assert.equal(watch.count,0);assert.equal(f.state.rng,rng);assert.deepEqual(f.v.errors,[]);
 }finally{try{await f?.close();}finally{watch.restore();}}
});

test('a generic relative clock cannot replace the Stroll22 terminal decoder clock',async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await nativeIdleStrollRemoteFixture({idleStrollIdlePhase:true,idleStrollDecoderClock:false,onPrepare:(_f,event)=>unrelatedClock(event)});const worker=structuredClone(f.worker),body=f.body(1),result=await f.run();assert.equal(result.status,'control-failed');assert.match(result.error,/terminal decoder clock/);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(watch.count,0);
 }finally{try{await f?.close();}finally{watch.restore();}}
});

for(const profile of PROFILES)test(`${profile.id} Farm23 unrelated relative clock does not trigger decoder exceptions`,async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await farmSetup({profile:profile.id,idlePhaseCapability:true});assert.equal(f.worker.profile,profile.id);f.client.registerClockBinding(f.buffer,{byteOffset:12,semantic:'relative',epoch:f.state.elapsed});const rng=f.state.rng,preparation=farmAdmit(f,{idlePhase:true}),result=await preparation.promise;assert.equal(result.status,'committed',JSON.stringify(result));assert(await farmPresent(f,preparation));assert.equal(watch.count,0);assert.equal(f.state.rng,rng);assert.deepEqual(f.sourceErrors,[]);
 }finally{try{await f?.close();}finally{watch.restore();}}
});

test('a generic relative clock cannot replace the Farm23 terminal decoder clock',async()=>{
 const watch=watchInvalidIdleComparisons();let f;try{
  f=await farmSetup({idlePhaseCapability:true});f.client.registerClockBinding(f.buffer,{byteOffset:12,semantic:'relative',epoch:f.state.elapsed});const worker=structuredClone(f.worker),body=f.body(1),result=await farmAdmit(f,{idlePhase:true,decoderClock:false}).promise;assert.equal(result.status,'control-failed');assert.match(result.error,/terminal decoder clock/);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(watch.count,0);
 }finally{try{await f?.close();}finally{watch.restore();}}
});
