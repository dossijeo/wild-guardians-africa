import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalGameFixture} from './helpers/native-farm-arrival-game.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick,emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {fixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

function attach(b,{clock=true,...overrides}={}){
 const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[],pendingIdleStrollRequests:b.pendingIdleStrollRequests??[],pendingFarmArrivalRequests:b.pendingFarmArrivalRequests??[],...overrides});
 if(clock&&b.clock)c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});return c;
}
function advanceClock(c,message){const previous=c.status().clock;c.acceptClock({...message,anchorLogicalTime:message.reanchor?message.committedThrough:previous.anchorLogicalTime,anchorAbsoluteMs:message.reanchor?1000:previous.anchorAbsoluteMs},{baseline:!previous});}
function task(f){const p=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;target.water=[];f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);return target;}

for(const profile of PROFILES)test(`${profile.id} bound arrival crosses the native baseline as owned metadata without a movement lease`,()=>{
 const f=nativeFarmArrivalGameFixture({profile:profile.id,peer:true});let c;try{
  const q=f.planner.nativeFarmArrivalRequestReference(f.actor),b=f.planner.nativeIntentControlBaseline();assert.deepEqual(b.pendingFarmArrivalRequests,[q]);c=attach(b);const copy=c.pendingFarmArrivalRequest(f.actor);assert.deepEqual(copy,q);assert.notEqual(copy,q);assert(Object.isFrozen(copy)&&Object.isFrozen(copy.pose)&&Object.isFrozen(copy.goal));assert.equal(c.status().active,1);assert.equal(c.status().admissions,0);assert.throws(()=>c.admit({actorId:f.actor,routeHandle:null}),/obsolete or unauthorized/);assert.throws(()=>c.admitInitialIdleBody(q));assert.throws(()=>c.admitStroll(q));assert.throws(()=>c.admitHome(q));assert.equal(c.status().admissions,0);c.dispose();assert.equal(c.pendingFarmArrivalRequest(f.actor),null);
 }finally{c?.dispose();f.close();}
});

test('unbound birth stays unbound; only first binding publishes metadata, then the native clock exposes it',()=>{
 const f=nativeFarmArrivalGameFixture({bound:false,declare:false});let c;try{
  const b=f.planner.nativeIntentControlBaseline();c=attach(b);f.request();const born=f.planner.intentChanges().at(-1),cold=f.planner.nativeIntentControlBaseline();assert.equal(born.farmArrivalRequest,undefined);assert.equal(cold.pendingFarmArrivalRequests,undefined);assert(c.accept(born));assert.equal(c.pendingFarmArrivalRequest(f.actor),null);assert.equal(f.w.spatial_body_count(),0);
  const declaration=f.planner.nativeFarmArrivalDeclarationReference(f.actor);f.bind();const event=f.planner.intentChanges().at(-1),q=f.planner.nativeFarmArrivalRequestReference(f.actor);assert.deepEqual(event.farmArrivalRequest,q);assert(q.requestSequence>declaration.requestSequence);assert(c.accept(event));assert.equal(c.pendingFarmArrivalRequest(f.actor),null);assert.equal(f.planner.commitNativeCausalClock().status,'committed');advanceClock(c,f.planner.nativeCausalClock());assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),q);assert.equal(c.status().active,0);
 }finally{c?.dispose();f.close();}
});

test('a new bound event remains hidden until its causal watermark and cannot redeclare its existing actor',()=>{
 const f=nativeFarmArrivalGameFixture({declare:false});let c;try{
  const b=f.planner.nativeIntentControlBaseline();c=attach(b);f.request();const event=f.planner.intentChanges().at(-1);assert(event.farmArrivalRequest);assert(c.accept(event));assert.equal(c.pendingFarmArrivalRequest(f.actor),null);assert.equal(f.planner.commitNativeCausalClock().status,'committed');advanceClock(c,f.planner.nativeCausalClock());const q=c.pendingFarmArrivalRequest(f.actor);assert(q);const repeat=structuredClone(event);repeat.sequence++;repeat.farmArrivalRequest.requestSequence++;assert.throws(()=>c.accept(repeat),/existing owner/);assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),q);assert.equal(c.status().sequence,event.sequence);assert.equal(c.accept({...repeat,authorityEpoch:'foreign'}),false);assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),q);
 }finally{c?.dispose();f.close();}
});

test('baseline rejects malformed arrays, duplicate actors/sequences, future sources and physical aliases before acquiring a clock',()=>{
 const f=nativeFarmArrivalGameFixture();try{
  const b=f.planner.nativeIntentControlBaseline(),q=b.pendingFarmArrivalRequests[0],make=values=>attach(b,{clock:false,pendingFarmArrivalRequests:values});
  for(const values of [{},[q,q],[q,{...q,actorId:q.actorId+100}],[q,{...q,actorId:q.actorId+100,bodyId:q.bodyId+1}],[q,{...q,actorId:q.actorId+100,requestSequence:q.requestSequence-1}]])assert.throws(()=>make(values));
  for(const mutate of [q=>q.authorityEpoch+='x',q=>q.requestSequence=b.sequence+1,q=>q.requestedAt=b.effectiveTime+1,q=>q.bodyId=0,q=>delete q.bodyId,q=>q.pose.radius=0,q=>q.goal.arrivalRadius=1,q=>q.routeHandle={}]){const bad=structuredClone(q);mutate(bad);assert.throws(()=>make([bad]));}
  const c=make([{...q,nativeSession:q.nativeSession+1}]);try{assert.throws(()=>advanceClock(c,b.clock),/farm arrival session/);assert.equal(c.status().clock,undefined);assert.equal(c.pendingFarmArrivalRequest(f.actor),null);}finally{c.dispose();}
 }finally{f.close();}
});

test('malformed source events cannot change the actor or global cursor, including mixed ownership',()=>{
 const f=nativeFarmArrivalGameFixture({declare:false});try{
  const b=f.planner.nativeIntentControlBaseline();f.request();const event=f.planner.intentChanges().at(-1);
  for(const mutate of [e=>e.farmArrivalRequest.actorId++,e=>e.farmArrivalRequest.authorityEpoch='foreign',e=>e.farmArrivalRequest.nativeSession++,e=>e.farmArrivalRequest.requestSequence++,e=>e.farmArrivalRequest.requestedAt+=1,e=>e.farmArrivalRequest.bodyId=0,e=>e.farmArrivalRequest.pose.radius=0,e=>e.farmArrivalRequest.goal.arrivalRadius=1,e=>e.state=7,e=>e.type='RouteCompleted',e=>e.taskId=1,e=>e.targetId=1,e=>e.homeRequest={},e=>e.initialIdleRequest={},e=>e.idleStrollRequest={},e=>e.routeHandle={authorityEpoch:e.authorityEpoch,session:1,slot:0,generation:1},e=>e.revokedRouteHandle={authorityEpoch:e.authorityEpoch,session:1,slot:0,generation:1}]){const c=attach(b);try{const bad=structuredClone(event);mutate(bad);assert.throws(()=>c.accept(bad));assert.equal(c.status().sequence,b.sequence);assert.equal(c.pendingFarmArrivalRequest(f.actor),null);assert(c.accept(event));}finally{c.dispose();}}
 }finally{f.close();}
});

test('one source cannot alias another actor body or consume a pending arrival as an unprepared route/Idle',()=>{
 const f=nativeFarmArrivalGameFixture();let c;try{
  const b=f.planner.nativeIntentControlBaseline(),q=b.pendingFarmArrivalRequests[0];c=attach(b);const next={type:'IntentChanged',protocolVersion:2,authorityEpoch:q.authorityEpoch,actorId:q.actorId+100,state:6,taskId:null,targetId:null,routeHandle:null,revokedRouteHandle:null,sequence:b.sequence+1,effectiveTime:b.effectiveTime,farmArrivalRequest:{...q,actorId:q.actorId+100,requestSequence:b.sequence+1,requestedAt:b.effectiveTime}};assert.throws(()=>c.accept(next),/aliases/);assert.equal(c.status().sequence,b.sequence);
  for(const state of [1,2,7]){const event={...next,actorId:q.actorId,farmArrivalRequest:undefined,state,...(state===1?{type:'RouteAssigned',routeHandle:{authorityEpoch:q.authorityEpoch,session:q.nativeSession,slot:999,generation:1}}:{})};assert.throws(()=>c.accept(event),/prepared admission/);assert.equal(c.status().sequence,b.sequence);assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),q);}
 }finally{c?.dispose();f.close();}
});

test('the native observer publishes a real Task claim, clears arrival metadata and retains its exact physical body',()=>{
 const f=nativeFarmArrivalGameFixture({peer:true});let c,stop;try{
  const body=f.body(1),peer=f.body(3),events=[];stop=f.planner.observeNativeIntentControl({onBaseline:b=>c=attach(b),onChanges:changes=>{events.push(...changes);changes.forEach(e=>c.accept(e));},onClock:clock=>advanceClock(c,clock)});assert(c.pendingFarmArrivalRequest(f.actor));task(f);tick(f.state,.1,f.nav);assert.equal(c.pendingFarmArrivalRequest(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);assert(events.some(e=>e.actorId===f.actor&&e.taskRequest));assert.equal(c.status().sequence,f.planner.nativeIntentControlBaseline().sequence);assert.equal(c.status().active,1);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(c.status().admissions,0);
 }finally{stop?.();c?.dispose();f.close();}
});

test('draining after a genuine Task claim never attaches a current source to its superseded arrival event',()=>{
 const f=nativeFarmArrivalGameFixture({declare:false});try{
  f.planner.intentChanges();f.request();const q=f.planner.nativeFarmArrivalRequestReference(f.actor);task(f);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),1);const changes=f.planner.intentChanges(),birth=changes.find(e=>e.sequence===q.requestSequence);assert(birth);assert.equal(birth.farmArrivalRequest,undefined);assert(changes.some(e=>e.taskRequest));assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);
 }finally{f.close();}
});

test('a valid Task claim cannot be wrapped in an invented route revocation to consume the pending arrival',()=>{
 const f=nativeFarmArrivalGameFixture();let c;try{
  const b=f.planner.nativeIntentControlBaseline(),q=b.pendingFarmArrivalRequests[0];c=attach(b);f.planner.intentChanges();task(f);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),1);const event=f.planner.intentChanges().find(e=>e.actorId===f.actor&&e.taskRequest);assert(event);assert.equal(event.sequence,b.sequence+1);
  for(const type of ['IntentChanged','RouteInvalidated']){const bad={...event,type,revokedRouteHandle:{authorityEpoch:q.authorityEpoch,session:q.nativeSession,slot:999,generation:1}};assert.throws(()=>c.accept(bad),/prepared admission/);assert.equal(c.status().sequence,b.sequence);assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),q);}
  assert(c.accept(event));assert.equal(c.pendingFarmArrivalRequest(f.actor),null);
 }finally{c?.dispose();f.close();}
});

test('pthread uses the same real bound arrival baseline and causal clock',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,c;try{f=nativeFarmArrivalGameFixture({core:runtime.core,peer:true});c=attach(f.planner.nativeIntentControlBaseline());assert.deepEqual(c.pendingFarmArrivalRequest(f.actor),f.planner.nativeFarmArrivalRequestReference(f.actor));const body=f.body(1);tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);}finally{c?.dispose();f?.close();await runtime.dispose();}
});

test('the existing publication and remote Host acknowledge both pending-arrival baseline and later Task claim',async()=>{
 const f=nativeFarmArrivalGameFixture({peer:true});let graphics,source;const messages=[];try{
  const [sourcePort,drawPort]=pair(),post=sourcePort.postMessage;sourcePort.postMessage=data=>{messages.push(structuredClone(data));post(data);};graphics=await fixture({}, {intentControl:{port:drawPort,session:'farm-arrival-positive'}});
  source=createNativeIntentControlPublication({port:sourcePort,session:'farm-arrival-positive',timeoutMs:1000,observe:options=>f.planner.observeNativeIntentControl(options)});await source.ready;assert.deepEqual(messages.find(m=>m.type==='IntentBaseline').pendingFarmArrivalRequests,[f.planner.nativeFarmArrivalRequestReference(f.actor)]);task(f);const body=f.body(1);tick(f.state,.1,f.nav);await flush();await graphics.host.idle();assert(messages.some(m=>m.actorId===f.actor&&m.taskRequest));assert.equal(graphics.host.inspect().failed,false);assert.deepEqual(graphics.errors,[]);assert.deepEqual(f.body(1),body);assert.equal(graphics.gpu.submitted.length,0);await source.fenceGpu();
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}
});

test('the existing remote Host also applies bound birth events after an empty arrival baseline',async()=>{
 const f=nativeFarmArrivalGameFixture({declare:false});let graphics,source;const messages=[];try{
  const [sourcePort,drawPort]=pair(),post=sourcePort.postMessage;sourcePort.postMessage=data=>{messages.push(structuredClone(data));post(data);};graphics=await fixture({}, {intentControl:{port:drawPort,session:'farm-arrival-birth'}});source=createNativeIntentControlPublication({port:sourcePort,session:'farm-arrival-birth',timeoutMs:1000,observe:options=>f.planner.observeNativeIntentControl(options)});await source.ready;f.request();f.planner.commitNativeCausalClock();await flush();await graphics.host.idle();assert(messages.some(m=>m.farmArrivalRequest));assert.equal(graphics.host.inspect().failed,false);assert.deepEqual(graphics.errors,[]);await source.fenceGpu();
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}
});

test('the remote Host rejects duplicate/foreign pending-arrival baselines before acknowledging bootstrap',async()=>{
 for(const bad of ['duplicate','session','array','null']){const f=nativeFarmArrivalGameFixture();let graphics,source;const incoming=[],outgoing=[];try{
  const [sourcePort,drawPort]=pair();const post=sourcePort.postMessage;sourcePort.postMessage=data=>{outgoing.push(data);post(data);};graphics=await fixture({}, {intentControl:{port:drawPort,session:'farm-arrival-negative'}});source=createNativeIntentControlPublication({port:sourcePort,session:'farm-arrival-negative',timeoutMs:1000,observe(options){return f.planner.observeNativeIntentControl({...options,onBaseline(b){const q=b.pendingFarmArrivalRequests[0];options.onBaseline({...b,pendingFarmArrivalRequests:bad==='duplicate'?[q,q]:bad==='session'?[{...q,nativeSession:q.nativeSession+1}]:bad==='null'?null:{}});}});}});const receive=sourcePort.onmessage;sourcePort.onmessage=e=>{incoming.push(e.data);receive(e);};let rejected;await assert.rejects(source.ready,error=>{rejected=error;return /timed out|Native intent control closed: consumer-retired/.test(error.message);});await flush();await graphics.host.idle();const retired=incoming.filter(m=>m.type==='intent-control-retired');assert.equal(incoming.some(m=>m.type==='intent-control-applied'&&m.accepted),false);if(source.status().drained){assert.match(rejected.message,/consumer-retired/);assert.equal(retired.length,1);assert.equal(retired[0].consumerToken,outgoing.find(m=>m.type==='IntentBaseline').consumerToken);assert.equal(retired[0].drained,true);}else{assert.match(rejected.message,/timed out/);assert.equal(retired.length,0);}assert.equal(graphics.host.inspect().failed,true);assert.match(graphics.errors[0].message,/farm arrival|control identity/);assert.equal(graphics.gpu.submitted.length,0);
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}}
});
