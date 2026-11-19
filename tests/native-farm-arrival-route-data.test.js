import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {copyNativeFarmArrivalRouteReference,copyNativeFarmArrivalRouteProposal,copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteReference,nativeFarmArrivalRouteSuccessor,nativeFarmArrivalRouteReferenceCovered,nativeFarmArrivalRouteAttestationCovers,nativeFarmArrivalRoutePresentationMatches} from '../src/world/native-farm-arrival-route.js';

// Native ABI commits below are trusted source setup, never a graphical receipt.
const propose=(f,options)=>{const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,options);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;};
const commit=(f,p)=>assert.equal(f.commit({ticket:p.ticket.ticket}),1);
function resources(f,b){
 const nativeRoute={actorId:b.reference.actorId,assignmentSequence:b.assignmentSequence,routeHandle:b.reference.expectedRouteHandle},presentation=f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle);assert(presentation);
 // The raw source association supplies this boundary. No graphical consumer
 // prepared or installed it, and these data codecs cannot claim that it did.
 return {version:1,kind:23,phase:'committed',worldBoundary:b.reference.worldBoundary,nativeRoute,nativeFarmArrivalBinding:b,presentation:{...presentation,worldBoundary:b.reference.worldBoundary}};
}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'urgent':'walking'} farm proposal/reference/binding own the exact native source and clipped endpoint`,()=>{
 const f=fixture({profile:profile.id,peer:true});try{
  const body=f.body(1),worker=structuredClone(f.worker),p=propose(f,{urgent}),r=p.nativeFarmArrival;assert.equal(p.authorizedAutonomy,false);assert.equal(p.authorizedPassage,false);assert.equal(r.motionFlags,urgent?1:0);assert.deepEqual(r.sourceRequest,f.requestSource);assert.deepEqual(r.destination,{x:p.points.at(-2),z:p.points.at(-1)});assert(Math.hypot(r.destination.x-r.sourceRequest.goal.x,r.destination.z-r.sourceRequest.goal.z)<=2);assert.notDeepEqual(r.destination,{x:r.sourceRequest.goal.x,z:r.sourceRequest.goal.z});assert.deepEqual(f.planner.nativeFarmArrivalRouteSourceRequestReference(f.actor,p.ticket.ticket),f.requestSource);assert.equal(f.planner.nativeFarmArrivalRouteSourceRequestReference(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert(Object.isFrozen(r)&&Object.isFrozen(r.destination)&&Object.isFrozen(r.sourceRequest.pose));
  commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.worker.id);assert(b);assert.deepEqual(b.preparedReference,r);assert.deepEqual(b.reference,r);assert.deepEqual(copyNativeFarmArrivalRouteAttestation(b),b);assert.deepEqual(f.planner.nativeFarmArrivalRouteBindings(),[b]);assert(nativeFarmArrivalRouteAttestationCovers(b,r));assert(nativeFarmArrivalRouteReferenceCovered(r,r.worldBoundary));assert.equal(nativeFarmArrivalRouteReferenceCovered(r,{...r.worldBoundary,ticket:r.worldBoundary.ticket-1}),false);assert.deepEqual(f.planner.nativeFarmArrivalRouteSourceRequestReference(f.worker.id),f.requestSource);
  const resource=copyNativeFarmArrivalRouteResources(resources(f,b));assert(nativeFarmArrivalRoutePresentationMatches(p,resource.presentation,b));f.move(.2);const execution=f.planner.nativeFarmArrivalRouteExecution(f.worker.id);assert.equal(execution.actorId,f.actor);assert.equal(execution.bodyId,f.requestSource.bodyId);assert.equal(execution.centerId,f.requestSource.centerId);assert.equal(execution.executedThrough,f.state.elapsed);assert.equal(execution.sourceRequestSequence,f.requestSource.requestSequence);assert.deepEqual(execution.destination,r.destination);assert.deepEqual(execution.goal,f.requestSource.goal);assert.deepEqual(execution.nativeRoute.routeHandle,r.expectedRouteHandle);assert.deepEqual(execution.binding,b);assert.equal(execution.arrived,false);assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.planner.nativeGameExecutionState(),1);
 }finally{f.close();}
});

test('real zero-length arrival preserves exact source pose/yaw/phases in typed proposal, binding and presentation',()=>{
 const f=fixture({inside:true,peer:true});try{
  const body=f.body(1),p=propose(f,{urgent:true});assert.equal(p.points.length,0);assert.equal(p.distance,0);assert.equal(p.startTime,p.endTime);assert.equal(p.rows.length,16);assert.deepEqual(p.nativeFarmArrival.destination,{x:body.x,z:body.z});assert.equal(p.rows[5],f.worker.heading);commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor),r=copyNativeFarmArrivalRouteResources(resources(f,b)),e=f.planner.nativeFarmArrivalRouteExecution(f.actor);assert(nativeFarmArrivalRoutePresentationMatches(p,r.presentation,b));assert.equal(e.arrived,true);assert.equal(e.x,body.x);assert.equal(e.z,body.z);assert.equal(e.yaw,f.worker.heading);assert.equal(e.runPhase,f.worker.runPhase);assert.equal(e.walkPhase,f.worker.walkPhase);assert.equal(e.runRemaining,f.worker.runRemaining);f.move(.3);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('captured arrays are owned across caller mutations and actual native memory growth',()=>{
 const f=fixture();try{
  const p=propose(f,{urgent:true}),owned=copyNativeFarmArrivalRouteProposal(p),rows=Array.from(owned.rows),points=Array.from(owned.points);p.rows[1]++;p.points[0]++;assert.deepEqual(Array.from(owned.rows),rows);assert.deepEqual(Array.from(owned.points),points);const recaptured=f.planner.captureNativeFarmArrivalRouteProposal(p.ticket);assert.deepEqual(Array.from(recaptured.rows),rows);assert.deepEqual(Array.from(recaptured.points),points);f.w.memory.grow(1);assert.deepEqual(Array.from(owned.rows),rows);assert.deepEqual(Array.from(owned.points),points);assert.deepEqual(f.planner.captureNativeFarmArrivalRouteProposal(p.ticket).nativeFarmArrival,owned.nativeFarmArrival);
 }finally{f.close();}
});

test('foreign family fields and altered pose, flags, times, endpoint or physical phases cannot pass the proposal codec',()=>{
 const f=fixture();try{
  const p=propose(f,{urgent:true});for(const edit of [p=>p.kind='native-home-route-proposal',p=>p.authorizedAutonomy=true,p=>p.authorizedPassage=true,p=>p.taskId=1,p=>p.nativeRoute={},p=>p.nativeResume={},p=>p.sourceSettlement={},p=>p.nativeIdleStroll={},p=>p.ticket.kind='native-home-route-proposal-ticket',p=>p.ticket.session++,p=>p.expectedRouteHandle.generation++,p=>p.nativeFarmArrival.destination.x+=.01,p=>p.sourceRequest.pose.x+=.1,p=>p.sourceRequest.goal.x+=.1,p=>p.sourceControlSequence=0,p=>p.endTime=p.startTime-1,p=>p.motionFlags=8,p=>p.profile++,p=>p.radius+=.01,p=>p.origin.x+=.1,p=>p.speed+=.01,p=>p.runSpeed+=.01,p=>p.runDistance+=.01,p=>p.runBudget-=.1,p=>p.points=new Float32Array(0),p=>p.points[p.points.length-2]+=.01,p=>p.rows[8]+=.1,p=>p.rows[p.rows.length-8]+=.1,p=>p.rows[p.rows.length-15]+=.01]){const bad=structuredClone(p);bad.nativeFarmArrival=structuredClone(p.nativeFarmArrival);edit(bad);assert.throws(()=>copyNativeFarmArrivalRouteProposal(bad),edit.toString());}
  for(const edit of [r=>r.kind='native-home-route-reference',r=>r.sourceRequest=undefined,r=>r.taskId=1,r=>r.sourceControlSequence=0,r=>r.expectedRouteHandle.generation=0,r=>r.expectedRouteHandle.slot=-1,r=>r.expectedRouteHandle.session++,r=>r.worldBoundary.authorityEpoch+='foreign',r=>r.destination.x=r.sourceRequest.goal.x+3,r=>r.distance=-1]){const bad=structuredClone(p.nativeFarmArrival);edit(bad);assert.throws(()=>copyNativeFarmArrivalRouteReference(bad));assert.equal(sameNativeFarmArrivalRouteReference(p.nativeFarmArrival,bad),false);}
 }finally{f.close();}
});

test('changed or foreign pending sources are stale before staging; cancellation retains source for a fresh ticket',()=>{
 const f=fixture();try{
  for(const edit of [q=>q.authorityEpoch+='old',q=>q.nativeSession++,q=>q.requestSequence++,q=>q.bodyId++,q=>q.pose.yaw+=.01,q=>q.goal.x+=.01,q=>q.workerProfile='youngFemale']){const q=structuredClone(f.requestSource);edit(q);assert.equal(f.planner.prepareNativeFarmArrivalRouteProposal(q).status,'stale');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}
  assert.throws(()=>f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,{urgent:1}),/urgency/);const p=propose(f);assert.equal(f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).status,'busy');assert.equal(f.planner.cancelNativeFarmArrivalRouteProposal({...p.ticket,authorityEpoch:'foreign'}),false);assert(f.planner.cancelNativeFarmArrivalRouteProposal(p.ticket));assert.equal(f.planner.captureNativeFarmArrivalRouteProposal(p.ticket),null);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),f.requestSource);const next=propose(f);assert(next.ticket.ticket>p.ticket.ticket);assert.equal(sameNativeFarmArrivalRouteReference(next.nativeFarmArrival,p.nativeFarmArrival),false);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket).status,'stale');
 }finally{f.close();}
});

test('late revalidation copies the new native program and preserves the actual prepared predecessor',()=>{
 const f=fixture({peer:true});try{
  const p=propose(f,{urgent:true}),body=f.body(1);f.move(.2);const updated=f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket);assert.equal(updated.status,'revalidated');const next=updated.proposal,t=updated.timeTranslation;assert.equal(t.kind,'native-farm-arrival-route-time-translation');assert.deepEqual(t.sourceRequest,f.requestSource);assert(t.sameFloat32Motion&&t.sameFloat32Gates);assert(t.startTime>p.startTime);assert(nativeFarmArrivalRouteSuccessor(p.nativeFarmArrival,next.nativeFarmArrival));assert.equal(nativeFarmArrivalRouteSuccessor(next.nativeFarmArrival,p.nativeFarmArrival),false);assert.deepEqual(f.body(1),body);commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert.deepEqual(b.preparedReference,p.nativeFarmArrival);assert.deepEqual(b.reference,next.nativeFarmArrival);assert(nativeFarmArrivalRouteAttestationCovers(b,p.nativeFarmArrival));assert(nativeFarmArrivalRouteAttestationCovers(b,next.nativeFarmArrival));const r=copyNativeFarmArrivalRouteResources(resources(f,b));assert(nativeFarmArrivalRoutePresentationMatches(p,r.presentation,b));
 }finally{f.close();}
});

test('prepared association and resource codecs reject substituted route generations, source values and terminal samples',()=>{
 const f=fixture();try{
  const p=propose(f);commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor),r=resources(f,b);
  for(const edit of [b=>b.kind='native-home-route-attestation',b=>b.projectionVersion=2,b=>b.assignmentSequence=b.reference.sourceControlSequence,b=>b.reference.expectedRouteHandle.generation++,b=>b.preparedReference.sourceRequest.pose.yaw+=.1,b=>b.reference.motionFlags=1,b=>b.preparedReference.destination.x+=.01,b=>b.gateIds=[1,1],b=>b.preparedReference.worldBoundary.ticket=b.reference.worldBoundary.ticket+1]){const bad=structuredClone(b);edit(bad);assert.throws(()=>copyNativeFarmArrivalRouteAttestation(bad));}
  for(const edit of [r=>r.kind=18,r=>r.phase='prepared',r=>r.nativeHome={},r=>r.worldBoundary.ticket++,r=>r.nativeRoute.assignmentSequence++,r=>r.nativeRoute.routeHandle.generation++,r=>r.presentation.profile++,r=>r.presentation.motionFlags=8,r=>r.presentation.rows[8]+=.1,r=>r.presentation.rows[r.presentation.rows.length-15]+=.01]){const bad=structuredClone(r);bad.nativeFarmArrivalBinding=structuredClone(b);edit(bad);assert.throws(()=>copyNativeFarmArrivalRouteResources(bad),edit.toString());}
 }finally{f.close();}
});

test('retired route handles retain readable historical values but no current native lookup or permission',()=>{
 const f=fixture();try{const p=propose(f);commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor),copy=copyNativeFarmArrivalRouteReference(b.reference);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.planner.nativeFarmArrivalRouteBindings(),[]);assert.equal(f.planner.nativeFarmArrivalRouteExecution(f.actor),null);assert.equal(f.planner.nativeFarmArrivalRouteSourceRequestReference(f.actor),null);assert.equal(f.planner.routePoints(copy.expectedRouteHandle),null);assert.deepEqual(copyNativeFarmArrivalRouteReference(copy),copy);assert.throws(()=>f.planner.nativeIntentControlBaseline(),/causal clock|incoherent/);}finally{f.close();}
});

test('typed source reads do not open baseline, generic intent events or ordinary Game admission',()=>{
 const f=fixture();try{const p=propose(f);commit(f,p);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.throws(()=>f.planner.nativeIntentControlBaseline(),/farm arrival routes require prepared graphical admission/);assert.deepEqual(f.planner.intentChanges().find(e=>e.nativeFarmArrival)?.nativeFarmArrival,f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(f.planner.nativeGameExecutionState(),1);}finally{f.close();}
});

test('execution reads use fixed-size native metadata without copying route points or enumerating the cohort',()=>{
 const f=fixture({peer:true});try{
  const p=propose(f);commit(f,p);let paths=0,cohorts=0,endpoints=0;const wasm={...f.w,nav_intent_route_points(...args){paths++;return f.w.nav_intent_route_points(...args);},nav_farm_arrival_route_binding_actors(){cohorts++;return f.w.nav_farm_arrival_route_binding_actors();},nav_farm_arrival_route_destination_snapshot(actor){endpoints++;return f.w.nav_farm_arrival_route_destination_snapshot(actor);}},bridge=createSpatialIntentBridge({...f.session,core:{...f.session.core,wasm}}),body=f.body(1);
  for(let i=0;i<100;i++){const e=bridge.nativeFarmArrivalRouteExecution(f.actor);assert.equal(e.x,body.x);assert.equal(e.z,body.z);assert.deepEqual(e.destination,p.nativeFarmArrival.destination);assert.equal(e.arrived,false);}assert.equal(paths,0);assert.equal(cohorts,0);assert.equal(endpoints,100);
 }finally{f.close();}
});

test('zero arrival cannot manufacture a short path, elapsed phase or shifted physical endpoint',()=>{
 const f=fixture({inside:true});try{const p=propose(f,{urgent:true});for(const edit of [p=>p.points=Float32Array.of(p.origin.x,p.origin.z),p=>p.endTime+=.1,p=>p.rows[5]+=.01,p=>p.rows[8]+=.01,p=>p.destination.x+=.01,p=>p.runDistance=.01]){const bad=structuredClone(p);bad.nativeFarmArrival=structuredClone(p.nativeFarmArrival);edit(bad);assert.throws(()=>copyNativeFarmArrivalRouteProposal(bad),edit.toString());}}finally{f.close();}
});

for(const budget of [0,.1])test(`an urgent arrival preserves budget ${budget} through its native run-to-walk boundary`,()=>{
 const f=fixture({peer:true,configureState(state){state.workers[0].runRemaining=budget;}});try{const p=propose(f,{urgent:true});assert.equal(p.runDistance,budget);assert(p.distance>budget);commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert(nativeFarmArrivalRoutePresentationMatches(p,copyNativeFarmArrivalRouteResources(resources(f,b)).presentation,b));f.move(.2);const e=f.planner.nativeFarmArrivalRouteExecution(f.actor);assert.equal(e.runRemaining,0);assert.equal(e.running,false);assert(e.walkPhase>f.worker.walkPhase);assert.equal(e.binding.reference.sourceRequest.pose.runRemaining,budget);}finally{f.close();}
});

test('pthread typed capture and revalidation preserve zero arrival and independent peer movement',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{f=fixture({core:runtime.core,inside:true,peer:true});const p=propose(f,{urgent:true}),body=f.body(1),peer=f.body(3);f.move(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);const next=f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket);assert.equal(next.status,'revalidated');commit(f,p);const b=f.planner.nativeFarmArrivalRouteBinding(f.actor);assert.deepEqual(b.preparedReference,p.nativeFarmArrival);assert.deepEqual(b.reference,next.proposal.nativeFarmArrival);assert.equal(f.planner.nativeFarmArrivalRouteExecution(f.actor).arrived,true);assert(nativeFarmArrivalRoutePresentationMatches(p,copyNativeFarmArrivalRouteResources(resources(f,b)).presentation,b));}finally{f?.close();await runtime.dispose();}
});
