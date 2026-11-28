import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './helpers/native-initial-idle-game.js';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {tick,emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {fixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

function attach(b,{clock=true,...overrides}={}){
 const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingActionRequests:b.pendingActionRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[],...overrides});
 if(clock&&b.clock)c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});return c;
}
function advanceClock(c,clock){const previous=c.status().clock;c.acceptClock({...clock,anchorLogicalTime:clock.reanchor?clock.committedThrough:previous.anchorLogicalTime,anchorAbsoluteMs:clock.reanchor?1000:previous.anchorAbsoluteMs});}

for(const mode of [null,'rest','watch'])test(`a bound initial ${mode??'uninitialized'} request crosses the real baseline as immutable metadata only`,()=>{
 const f=nativeInitialIdleGameFixture({mode,peer:true});let c;try{
  const q=f.planner.nativeInitialIdleRequestReference(f.actor),b=f.planner.nativeIntentControlBaseline();assert.deepEqual(b.pendingInitialIdleRequests,[q]);c=attach(b);assert.deepEqual(c.pendingInitialIdleRequest(f.actor),q);assert(Object.isFrozen(c.pendingInitialIdleRequest(f.actor)));assert(Object.isFrozen(c.pendingInitialIdleRequest(f.actor).pose));assert.equal(c.status().active,1);
  assert.throws(()=>c.admit({actorId:f.actor,routeHandle:null}),/obsolete or unauthorized/);assert.throws(()=>c.admitSettlement(q),/settlement/);assert.equal(c.status().admissions,0);c.dispose();assert.equal(c.pendingInitialIdleRequest(f.actor),null);
 }finally{c?.dispose();f.close();}
});

test('birth and first physical binding decorate only the exact current native request sequence',()=>{
 const f=nativeInitialIdleRequestFixture({bound:false});let c;try{
  c=attach(f.planner.nativeIntentControlBaseline());
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);const born=f.planner.intentChanges().at(-1),unbound=f.planner.nativeIntentControlBaseline();assert.equal(born.state,6);assert.equal(born.initialIdleRequest,undefined);assert.equal(unbound.pendingInitialIdleRequests,undefined);
  assert.equal(c.accept(born),true);assert.equal(c.pendingInitialIdleRequest(f.actor),null);f.bind();const bound=f.planner.intentChanges().at(-1),q=f.planner.nativeInitialIdleRequestReference(f.actor);assert.deepEqual(bound.initialIdleRequest,q);assert.equal(bound.sequence,q.requestSequence);assert(bound.sequence>born.sequence);assert.equal(c.accept(bound),true);assert.equal(c.pendingInitialIdleRequest(f.actor),null);c.dispose();f.planner.commitNativeCausalClock();c=attach(f.planner.nativeIntentControlBaseline());assert.deepEqual(c.pendingInitialIdleRequest(f.actor),q);
 }finally{c?.dispose();f.close();}
});

test('an accepted request event remains metadata without a causal watermark until its real clock arrives',()=>{
 const f=nativeInitialIdleRequestFixture();let c;try{
  f.planner.commitNativeCausalClock();f.planner.intentChanges();c=attach(f.planner.nativeIntentControlBaseline());const q=f.planner.requestNativeInitialIdleResources(f.state,f.worker).request,event=f.planner.intentChanges().at(-1);assert.deepEqual(event.initialIdleRequest,q);assert.equal(c.accept(event),true);assert.equal(c.pendingInitialIdleRequest(f.actor),null);
  f.planner.commitNativeCausalClock();advanceClock(c,f.planner.nativeCausalClock());assert.deepEqual(c.pendingInitialIdleRequest(f.actor),q);assert.equal(c.status().active,0);
 }finally{c?.dispose();f.close();}
});

test('malformed, duplicate and cross-class initial baselines cannot establish a pending body',()=>{
 const f=nativeInitialIdleGameFixture({peer:true});try{
  const b=f.planner.nativeIntentControlBaseline(),q=b.pendingInitialIdleRequests[0],route=b.routes[0];
  for(const overrides of [{pendingInitialIdleRequests:null},{pendingInitialIdleRequests:[q,q]},{pendingInitialIdleRequests:[{...q,authorityEpoch:'foreign'}]},{pendingInitialIdleRequests:[{...q,requestSequence:b.sequence+1}]},{pendingInitialIdleRequests:[{...q,requestedAt:b.effectiveTime+1}]},{pendingInitialIdleRequests:[{...q,actorId:route.actorId}]},{pendingInitialIdleRequests:[{...q,requestSequence:route.assignmentSequence}]}])assert.throws(()=>attach(b,overrides),/initial Idle|control identity|Idle request/);
  const bad=attach(b,{clock:false,pendingInitialIdleRequests:[{...q,nativeSession:q.nativeSession+1}]});try{assert.throws(()=>bad.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true}),/initial Idle session/);assert.equal(bad.pendingInitialIdleRequest(f.actor),null);}finally{bad.dispose();}
 }finally{f.close();}
});

test('initial event payloads reject altered identity, competing resource classes and route grants before changing the cursor',()=>{
 const f=nativeInitialIdleRequestFixture({peer:true,declareRequest:false});try{
  f.planner.intentChanges();const b=f.planner.nativeIntentControlBaseline();f.planner.requestNativeInitialIdleResources(f.state,f.worker);const event=f.planner.intentChanges().at(-1),declaration=f.planner.nativeInitialIdleDeclarationReference(f.actor),route=b.routes[0].routeHandle;
  const cases=[e=>e.state=5,e=>e.type='RouteAssigned',e=>e.taskId=999999,e=>e.targetId=999999,e=>e.initialIdleRequest.actorId++,e=>e.initialIdleRequest.authorityEpoch='foreign',e=>e.initialIdleRequest.nativeSession++,e=>e.initialIdleRequest.requestSequence++,e=>e.initialIdleRequest.requestedAt+=.1,e=>e.initialIdleRequest=declaration,e=>e.routeHandle=route,e=>e.revokedRouteHandle=route];
  for(const mutate of cases){const c=attach(b);try{const bad=structuredClone(event);mutate(bad);assert.throws(()=>c.accept(bad));assert.equal(c.status().sequence,b.sequence);assert.equal(c.pendingInitialIdleRequest(f.actor),null);}finally{c.dispose();}}
  f.worker.contractDay=f.state.day-1;const home=f.planner.requestNativeIdleHome(f.state,f.worker),c=attach(b);try{assert.throws(()=>c.accept({...event,homeRequest:home}),/initial Idle request/);assert.equal(c.status().sequence,b.sequence);}finally{c.dispose();}
 }finally{f.close();}
});

test('Home must continue the exact pending initial body, pose, phases and budget before consuming its metadata',()=>{
 const f=nativeInitialIdleGameFixture();let c;try{
  f.planner.intentChanges();const b=f.planner.nativeIntentControlBaseline(),q=b.pendingInitialIdleRequests[0];c=attach(b);
  const replacement={type:'IntentChanged',protocolVersion:2,authorityEpoch:q.authorityEpoch,actorId:f.actor,state:6,taskId:null,targetId:null,routeHandle:null,revokedRouteHandle:null,sequence:b.sequence+1,effectiveTime:b.effectiveTime,initialIdleRequest:{...q,requestSequence:b.sequence+1,requestedAt:b.effectiveTime}};assert.throws(()=>c.accept(replacement),/existing owner/);assert.equal(c.status().sequence,b.sequence);
  f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);const event=f.planner.intentChanges().at(-1);assert(event.homeRequest);
  for(const mutate of [h=>h.bodyId++,h=>h.bodyFlags=5,h=>h.profile=(h.profile+1)%32,h=>h.pose.x+=.1,h=>h.pose.yaw+=.1,h=>h.pose.radius+=.01,h=>h.pose.runPhase++,h=>h.pose.runRemaining--]){const bad=structuredClone(event);mutate(bad.homeRequest);assert.throws(()=>c.accept(bad),/pending initial Idle body/);assert.equal(c.status().sequence,b.sequence);assert.deepEqual(c.pendingInitialIdleRequest(f.actor),q);}
  assert.equal(c.accept(event),true);assert.equal(c.pendingInitialIdleRequest(f.actor),null);f.planner.commitNativeCausalClock();advanceClock(c,f.planner.nativeCausalClock());assert.equal(c.pendingInitialIdleRequest(f.actor),null);assert.equal(c.status().active,0);
 }finally{c?.dispose();f.close();}
});

test('real task preemption revokes pending initial metadata and an old event cannot resurrect it',()=>{
 const f=nativeInitialIdleGameFixture();let c,stop;try{
  f.planner.intentChanges();const q=f.planner.nativeInitialIdleRequestReference(f.actor);stop=f.planner.observeNativeIntentControl({onBaseline:b=>c=attach(b),onChanges:changes=>changes.forEach(e=>c.accept(e)),onClock:clock=>advanceClock(c,clock)});assert.deepEqual(c.pendingInitialIdleRequest(f.actor),q);
  const p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);tick(f.state,.1,f.nav);
  assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(c.pendingInitialIdleRequest(f.actor),null);assert.equal(c.status().active,0);const next=c.status().sequence+1,event={type:'IntentChanged',protocolVersion:2,authorityEpoch:q.authorityEpoch,actorId:f.actor,state:6,taskId:null,targetId:null,routeHandle:null,revokedRouteHandle:null,sequence:next,effectiveTime:f.state.elapsed,initialIdleRequest:{...q,requestSequence:next,requestedAt:f.state.elapsed}};
  assert.throws(()=>c.accept(event),/existing owner/);assert.equal(c.pendingInitialIdleRequest(f.actor),null);assert.equal(c.accept({...event,authorityEpoch:'old'}),false);
  const b=f.planner.nativeIntentControlBaseline();assert.throws(()=>attach(b,{pendingInitialIdleRequests:[q]}),/pending initial Idle baseline/);assert.throws(()=>attach(b,{pendingInitialIdleRequests:[{...q,actorId:q.actorId+100,requestSequence:b.pendingTaskRequests[0].requestSequence}]}),/pending initial Idle baseline/);
 }finally{stop?.();c?.dispose();f.close();}
});

test('the real remote baseline transports initial metadata and its Home handoff on the existing ports',async()=>{
 const f=nativeInitialIdleGameFixture({peer:true});let vertical;try{
  const body=f.body(1),peer=f.body(3);vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'home-route',onPrepare(){tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);},onDrain(){tick(f.state,.1,f.nav);}});
  f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const result=await vertical.run(options=>f.planner.startNativeHomeRouteAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(result.status,'committed',JSON.stringify({status:result.status,error:result.error}));await vertical.present();assert.equal(result.nativeHomeRouteBinding.reference.sourceSettlement,undefined);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

test('the remote host rejects duplicate or foreign-session initial metadata instead of ignoring the new baseline field',async()=>{
 for(const duplicate of [false,true]){
  const f=nativeInitialIdleGameFixture({peer:true});let graphics,source;const incoming=[],outgoing=[];try{
   const [sourcePort,drawPort]=pair();const post=sourcePort.postMessage;sourcePort.postMessage=data=>{outgoing.push(data);post(data);};graphics=await fixture({}, {intentControl:{port:drawPort,session:'initial-idle-negative'}});
   source=createNativeIntentControlPublication({port:sourcePort,session:'initial-idle-negative',timeoutMs:1000,observe(options){return f.planner.observeNativeIntentControl({...options,onBaseline(b){const q=b.pendingInitialIdleRequests[0];options.onBaseline({...b,pendingInitialIdleRequests:duplicate?[q,q]:[{...q,nativeSession:q.nativeSession+1}]});}});}});
   const receive=sourcePort.onmessage;sourcePort.onmessage=e=>{incoming.push(e.data);receive(e);};let rejected;await assert.rejects(source.ready,error=>{rejected=error;return /timed out|Native intent control closed: consumer-retired/.test(error.message);});await flush();await graphics.host.idle();const retired=incoming.filter(m=>m.type==='intent-control-retired');assert.equal(incoming.some(m=>m.type==='intent-control-applied'&&m.accepted),false);if(source.status().drained){assert.match(rejected.message,/consumer-retired/);assert.equal(retired.length,1);assert.equal(retired[0].consumerToken,outgoing.find(m=>m.type==='IntentBaseline').consumerToken);assert.equal(retired[0].drained,true);}else{assert.match(rejected.message,/timed out/);assert.equal(retired.length,0);}assert.equal(graphics.host.inspect().failed,true);assert.match(graphics.errors[0].message,/initial Idle/);assert.equal(graphics.gpu.submitted.length,0);
  }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}
 }
});
