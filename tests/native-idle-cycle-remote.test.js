import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createPlant} from '../src/simulation/crops.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/float32-time.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {cancelIdle} from '../src/simulation/idle.js';
import {nativeIdleCycleWatchKnot} from '../src/world/native-idle-cycle.js';

// Real native source, preparation/control ports, retained commands, direct Host
// association and exact pick clock. GPU queue/pipeline are simulated here;
// original actor/Surface and hardware pixel/resource proofs remain separate.
async function fixture({mode='rest',remaining=2.3,onPrepare=()=>{},onDrain=()=>{},onReady=()=>{}}={}){
 const f=nativeInitialIdleRequestFixture({mode,peer:true,configureState(state,{point}){
  const a=state.workers[0];Object.assign(a.idleState,{anchorId:'farm-plant-900098',remaining,rng:0x12345678});state.plants.push(createPlant('plant-900098','mijo',a.x,a.z,a.centerId));state.villages.find(v=>v.id===a.villageId).entry=point(6,0);
 }});let v;try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);f.planner.commitNativeCausalClock();
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body',retainStaticBuffer:true,onPrepare:async e=>{if(e.resources.kind==='native-idle-cycle-proposal')await onPrepare(f,e);},onReady:async e=>{if(e.reference.kind==='native-idle-cycle-reference')await onReady(f,e);},onDrain:async e=>{if(e.receipt.nativeIdleCycleVersion)await onDrain(f,e);}});
  const initial=await v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(initial.status,'committed',JSON.stringify(initial));await v.present();
  const run=signal=>v.run(options=>f.planner.startNativeIdleCycleAfterGpuQuiescence({actorId:f.actor,...options}),{kind:'idle-cycle',signal});
  return {...f,v,run,async draw(){await flush();await v.host.idle();v.host.present();const state=v.host.inspect();assert.equal(state.failed,false,JSON.stringify(v.errors));return state;},async close(){await v.close();f.close();}};
 }catch(e){await v?.close();f.close();throw e;}
}

for(const mode of ['rest','watch'])test(`prepared ${mode} cycle installs the exact retained association, reuses resource identities and publishes its submitted float to picking`,async()=>{
 const f=await fixture({mode,onPrepare(f){f.advance(.2);},onDrain(f){f.advance(.1);}});try{
  const body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),created=f.v.client.inspect().resourcesCreated,buffers=f.v.gpu.buffers.slice(),before=f.v.host.inspect(),geometry=buffers.find(b=>b.descriptor.size===36);
  assert(geometry&&!geometry.destroyed);
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(result.receipt.nativeIdleCycleVersion,1);await f.v.present();
  f.advance(.125);const consumer=await f.draw(),binding=consumer.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle?.actorId===f.actor);assert(binding);const ref=result.nativeIdleCycleBinding.preparedReference;
  assert.deepEqual(binding.nativeIdleCycle,ref);assert.equal(binding.executionEpoch,result.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime);assert.equal(binding.relativeTime,floorFloat32(f.state.elapsed-binding.executionEpoch));const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getIdleCycleElapsed(ref),binding.relativeTime);assert.equal(pick.getIdleCycleExecutionTime(ref),binding.executionEpoch+binding.relativeTime);
  assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.worker,worker);assert.equal(f.v.client.inspect().resourcesCreated,created);assert.equal(consumer.resources,before.resources);assert.equal(f.v.counters().preparations,2);assert.deepEqual(f.v.errors,[]);assert.equal(consumer.failed,false);
  assert.deepEqual(f.v.gpu.buffers.slice(buffers.length).map(b=>b.descriptor.size),[16]);assert.equal(consumer.uniformForks-before.uniformForks,1);assert.equal(consumer.uniformForkBytes-before.uniformForkBytes,16);assert.equal(consumer.bindingForks-before.bindingForks,1);assert.equal(consumer.bufferForks??0,before.bufferForks??0);assert.equal(geometry.destroyed,false);assert.equal(f.v.gpu.buffers.find(b=>b.descriptor.size===36),geometry);
  const afterReady=f.v.gpu.buffers.length;f.advance(.1);await f.draw();assert.equal(f.v.gpu.buffers.length,afterReady);
  const forged=structuredClone(consumer);forged.nativeRouteFrame.bindings[0].relativeTime=Math.fround(ref.duration+1);assert.throws(()=>captureNativeRoutePickFrame(forged));
 }finally{await f.close();}
});

for(const transition of ['Task','Home'])test(`a genuine pending ${transition} freezes the admitted cycle phase and retains its resident body`,async()=>{
 const f=await fixture();try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();f.advance(.125);await f.draw();const body=f.body(1),origin=result.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime,at=f.state.elapsed;
  if(transition==='Task'){
   const point=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',point.x,point.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),1);
  }else{
   // Exercise the real trusted Home ABI; ordinary Game21 projection is pending.
   const village=f.state.villages.find(v=>v.id===f.worker.villageId),goal=village.entry,binding=f.planner.nativeInitialIdleBodyBinding(f.actor);assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),binding.bodySequence,Number(village.id.split('-').at(-1)),goal.x,goal.z),1);cancelIdle(f.worker);Object.assign(f.worker,{status:'returning',nativeRouteAdmission:'pending-home-resources'});
  }
  f.planner.commitNativeCausalClock();f.advance(.3);const consumer=await f.draw(),cycle=consumer.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle);assert(cycle);assert.equal(cycle.relativeTime,floorFloat32(at-origin));assert.deepEqual(f.body(1),body);assert.equal(consumer.failed,false);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('a following REST cycle changes its native permission while retaining the same low-level graphical resources',async()=>{
 const f=await fixture({mode:'watch',remaining:.03});try{
  const first=await f.run();assert.equal(first.status,'committed',JSON.stringify(first));await f.v.present();f.advance(.2);await f.draw();const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(next.idleState.mode,'rest');
  // Actual Game phase projection; ordinary resource scheduling is separate.
  f.planner.projectNativeIdleCycle(f.state,f.worker);const buffers=f.v.gpu.buffers.slice(),created=f.v.client.inspect().resourcesCreated,before=f.v.host.inspect(),geometry=buffers.find(b=>b.descriptor.size===36);
  const second=await f.run();assert.equal(second.status,'committed',JSON.stringify(second));await f.v.present();f.advance(.1);const consumer=await f.draw(),cycle=consumer.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle);assert.equal(cycle.nativeIdleCycle.sourceCycleSequence,first.nativeIdleCycleBinding.cycleSequence);assert.equal(cycle.executionEpoch,second.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime);assert.equal(f.v.client.inspect().resourcesCreated,created);assert.deepEqual(f.v.gpu.buffers.slice(buffers.length).map(b=>b.descriptor.size),[16]);assert.equal(consumer.uniformForks-before.uniformForks,1);assert.equal(consumer.bindingForks-before.bindingForks,1);assert.equal(consumer.resources,before.resources);assert.equal(geometry.destroyed,false);assert.equal(f.v.gpu.buffers.find(b=>b.descriptor.size===36),geometry);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('a finite watch holds only its own phase while an independent peer clock and drawing continue beyond its end',async()=>{
 const f=await fixture({mode:'watch',remaining:.03});try{
  const peer=f.peerBinding,route={actorId:peer.reference.actorId,routeHandle:peer.reference.expectedRouteHandle,assignmentSequence:peer.assignmentSequence};
  f.v.client.registerClockBinding(f.v.buffer,{byteOffset:4,semantic:'relative',epoch:peer.reference.worldBoundary.effectiveTime,resourceEnd:peer.reference.endTime,nativeRoute:route});
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();const origin=result.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime,body=f.body(1);
  f.advance(.2);const a=await f.draw(),cycle=a.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle),b=a.nativeRouteFrame.bindings.find(b=>b.nativeRoute?.actorId===route.actorId);assert(cycle&&b);assert.equal(cycle.relativeTime,floorFloat32(.03));assert(b.elapsed>origin+.03);const submissions=f.v.gpu.calls.filter(c=>c[0]==='submit').length;
  f.advance(.1);const next=await f.draw();assert(next.nativeRouteFrame.clockElapsed>a.nativeRouteFrame.clockElapsed);assert.equal(next.nativeRouteFrame.bindings.find(b=>b.nativeIdleCycle).relativeTime,cycle.relativeTime);assert.deepEqual(f.body(1),body);assert(f.v.gpu.calls.filter(c=>c[0]==='submit').length>submissions);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

for(const why of ['abort','semantic'])test(`prepared cycle ${why} leaves its source20 packet active`,async()=>{
 const controller=new AbortController(),f=await fixture({onReady(f){if(why==='abort')controller.abort();else f.worker.idleState.rng^=1;}});try{
  const before=f.v.host.inspect().activeSequence,body=f.body(1),result=await f.run(controller.signal);assert.equal(result.status,why==='abort'?'control-failed':'stale',JSON.stringify(result));await flush();await f.v.host.idle();assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.v.host.inspect().activeSequence,before);assert.equal(f.v.host.inspect().failed,false);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('the prepared cycle association is not issued until the actual Host queue drain resolves',async()=>{
 let release,draining,original;const entered=new Promise(r=>{draining=r;}),f=await fixture({onReady(_f,{gpu}){original=gpu.device.queue.onSubmittedWorkDone;gpu.device.queue.onSubmittedWorkDone=()=>new Promise(r=>{release=r;draining();});}});try{
  const body=f.body(1),pending=f.run();await entered;assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);f.advance(.2);assert.deepEqual(f.body(1),body);f.v.gpu.device.queue.onSubmittedWorkDone=original;release();const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();assert.deepEqual(f.v.errors,[]);
 }finally{release?.();await f.close();}
});

test('a cycle clock rejects another role, interval or epoch before replacing any registered binding',async()=>{
 const f=await fixture();try{
  const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');const ref=p.proposal.nativeIdleCycle,base={byteOffset:0,semantic:'relative',epoch:ref.worldBoundary.effectiveTime,nativeIdleCycle:ref},count=f.v.client.inspect().clockBindings;
  for(const bad of [{...base,resourceEnd:base.epoch+ref.duration},{...base,epoch:base.epoch+.1},{...base,nativeInitialIdleBody:ref.sourceBody.reference},{...base,nativeSettlement:ref.sourceBody.reference},{...base,semantic:'absolute'}])assert.throws(()=>f.v.client.registerClockBinding(f.v.buffer,bad));
  assert.equal(f.v.client.inspect().clockBindings,count);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);f.planner.cancelNativeIdleCycleProposal(p.proposal.ticket);
 }finally{await f.close();}
});

test('a retained cycle template cannot borrow the former held20 clock at the actual Host drain',async()=>{
 const f=await fixture();try{
  const register=f.v.client.registerClockBinding;f.v.client.registerClockBinding=(buffer,binding)=>{
   if(binding.nativeIdleCycle){const {nativeIdleCycle,...rest}=binding;return register(buffer,{...rest,epoch:nativeIdleCycle.sourceBody.reference.worldBoundary.effectiveTime,nativeInitialIdleBody:nativeIdleCycle.sourceBody.reference});}return register(buffer,binding);
  };
  const body=f.body(1),result=await f.run();assert.equal(result.status,'control-failed',JSON.stringify(result));await flush();assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.v.host.inspect().failed,true);assert(f.v.errors.some(e=>String(e.message??e).includes('no prepared clock')));
 }finally{await f.close();}
});

test('removing the current native cycle body revokes replay of the captured packet',async()=>{
 const f=await fixture();try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();await f.draw();assert.equal(f.w.spatial_body_remove(1),1);f.planner.commitNativeCausalClock();await flush();await f.v.host.idle();const submissions=f.v.gpu.calls.filter(c=>c[0]==='submit').length;f.v.host.present();assert.equal(f.v.gpu.calls.filter(c=>c[0]==='submit').length,submissions);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});

test('Host derives the watch-knot constant from the actual association and keeps it outside the pick time list',async()=>{
 const f=await fixture({onPrepare(f,{client,buffer,resources}){const ref=resources.nativeIdleCycle;client.registerClockBinding(buffer,{byteOffset:8,semantic:'idle-cycle-watch-knot',epoch:ref.worldBoundary.effectiveTime,nativeIdleCycle:ref});f.advance(.2);},onDrain(f){f.advance(.1);}});try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();f.advance(.1);const c=await f.draw(),ref=result.nativeIdleCycleBinding.preparedReference,origin=result.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime;
  assert.equal(c.nativeRouteFrame.bindings.filter(b=>b.nativeIdleCycle).length,1);assert.equal(c.nativeRouteFrame.bindings[0].semantic,'relative');const buffer=f.v.gpu.buffers.findLast(b=>!b.destroyed&&b.descriptor.size===16);assert.equal(new Float32Array(buffer.data.buffer)[2],nativeIdleCycleWatchKnot(ref,origin));assert(c.clockBindings>=2);assert.deepEqual(f.v.errors,[]);
 }finally{await f.close();}
});
