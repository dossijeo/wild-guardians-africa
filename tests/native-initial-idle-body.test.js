import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './helpers/native-initial-idle-game.js';
import {tick,emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyProposal,copyNativeInitialIdleBodyAttestation,copyNativeInitialIdleBodyResources,nativeInitialIdleBodySuccessor} from '../src/world/native-initial-idle-body.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';

// Source ABI tests grant no graphical receipt. The prepared consumer is tested
// separately; these commits exercise the actual native owner and Game boundary.
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function propose(f){const result=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(f.actor));assert.equal(result.status,'proposed');return result.proposal;}
function commit(f,proposal=propose(f),prepared=proposal){assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple(f).slice(0,5),prepared.ticket.ticket),1);const binding=f.planner.nativeInitialIdleBodyBinding(f.actor);assert(binding);f.planner.projectNativeInitialIdleBody(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return binding;}

for(const mode of ['rest','watch'])test(`initial ${mode} body stages and cancels without changing physical or private state`,()=>{
 const f=nativeInitialIdleGameFixture({mode});try{
  const worker=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,request=f.planner.nativeInitialIdleRequestReference(f.actor),sequence=f.w.nav_intent_transition_sequence();
  const p=propose(f);assert.deepEqual(p.nativeInitialIdleBody.sourceRequest,request);assert.deepEqual(copyNativeInitialIdleBodyProposal(p),p);
  assert.equal(p.nativeInitialIdleBody.duration,undefined);assert.equal(p.authorizedAutonomy,false);assert.equal(p.authorizedPassage,false);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.planner.cancelNativeInitialIdleBodyProposal(p.ticket),true);assert.equal(f.planner.captureNativeInitialIdleBodyProposal(p.ticket),null);assert.deepEqual(f.planner.nativeInitialIdleRequestReference(f.actor),request);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('uninitialized, unbound and foreign sources cannot manufacture an initial body',()=>{
 const empty=nativeInitialIdleGameFixture({mode:null});try{assert.equal(empty.planner.prepareNativeInitialIdleBodyProposal(empty.planner.nativeInitialIdleRequestReference(empty.actor)).status,'unsupported');assert.equal(empty.w.nav_intent_barrier_proposal_ticket(),0);}finally{empty.close();}
 const unbound=nativeInitialIdleGameFixture({bound:false});try{assert.equal(unbound.w.nav_initial_idle_body_proposal_stage(unbound.actor,unbound.w.nav_intent_session(),unbound.planner.nativeInitialIdleDeclarationReference(unbound.actor).requestSequence),-2);assert.equal(unbound.w.spatial_body_count(),0);}finally{unbound.close();}
 const f=nativeInitialIdleGameFixture();try{const q=f.planner.nativeInitialIdleRequestReference(f.actor);assert.equal(f.w.nav_initial_idle_body_proposal_stage(f.actor,q.nativeSession+1,q.requestSequence),-1);assert.equal(f.w.nav_initial_idle_body_proposal_stage(f.actor,q.nativeSession,q.requestSequence+1),-2);assert.equal(f.planner.prepareNativeInitialIdleBodyProposal({...q,authorityEpoch:q.authorityEpoch+1}).status,'stale');assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);}finally{f.close();}
});

for(const threaded of [false,true])test(`initial body revalidates while a genuine peer advances (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeInitialIdleGameFixture({peer:true,mode:'watch',...(runtime?{core:runtime.core}:{})});
  const worker=structuredClone(f.worker),body=f.body(1),peer=f.body(3),rng=f.state.rng,ledger=structuredClone(f.state.ledger),p=propose(f);
  tick(f.state,.2,f.nav);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  const next=f.planner.revalidateNativeInitialIdleBodyProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.compatible,true);assert(next.proposal.ticket.ticket>p.ticket.ticket);assert.deepEqual(next.proposal.nativeInitialIdleBody.sourceRequest,p.nativeInitialIdleBody.sourceRequest);
  assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple(f).slice(0,5),p.ticket.ticket+1000),-9);
  const binding=commit(f,next.proposal,p);assert.deepEqual(binding.preparedReference,p.nativeInitialIdleBody);assert.deepEqual(binding.reference,next.proposal.nativeInitialIdleBody);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleDeclarationReference(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);
  assert.deepEqual(f.planner.nativeInitialIdleBodyBindings(),[binding]);const after=f.body(3);tick(f.state,.2,f.nav);
  const expected={...worker,nativeRouteAdmission:'native-idle'};assert.deepEqual(f.worker,expected);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),after);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.planner.nativeGameExecutionState(),1);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);
 }finally{f?.close();await runtime?.dispose();}
});

test('initial body schemas reject role substitution, extra history and detached source identities',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const p=propose(f),r=p.nativeInitialIdleBody,binding=commit(f,p);assert.deepEqual(copyNativeInitialIdleBodyReference(r),r);assert.deepEqual(copyNativeInitialIdleBodyAttestation(binding),binding);
  for(const bad of [{...r,bodyId:r.bodyId+1},{...r,sourceSettlement:{}},{...r,sourceRequest:{...r.sourceRequest,idleState:null}},{...r,worldBoundary:{...r.worldBoundary,nativeSession:r.worldBoundary.nativeSession+1}}])assert.throws(()=>copyNativeInitialIdleBodyReference(bad));
  assert.throws(()=>copyNativeInitialIdleBodyProposal({...p,authorizedAutonomy:true}));assert.throws(()=>copyNativeInitialIdleBodyAttestation({...binding,bodySequence:r.sourceControlSequence}));
  const resources={version:1,kind:20,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeInitialIdleBodyBinding:binding};assert.deepEqual(copyNativeInitialIdleBodyResources(resources),resources);assert.throws(()=>copyNativeInitialIdleBodyResources({...resources,kind:17}));assert.throws(()=>copyNativeInitialIdleBodyResources({...resources,nativeTaskSettlementBinding:{}}));
 }finally{f.close();}
});

test('an Idle successor keeps the cancelled Task owner and complete physical pose',()=>{
 const f=nativeInitialIdleGameFixture();
 try{
  const {nativeInitialIdleBody:ref}=propose(f),q=ref.sourceRequest;
  const cancellationSource={kind:'native-task-cancellation-source',version:1,phase:25,actorId:q.actorId,taskId:10,targetId:11,nativeSession:q.nativeSession,
   sourceSequence:q.requestSequence,routeSlot:0,routeGeneration:4,bodyId:q.bodyId,sourceAt:q.requestedAt,pose:q.pose,bodyFlags:q.bodyFlags};
  const value={...ref,cancellationSource};
  assert.deepEqual(copyNativeInitialIdleBodyReference(value),value);
  assert(nativeInitialIdleBodySuccessor(value,{...value,worldBoundary:{...value.worldBoundary,ticket:value.worldBoundary.ticket+1}}));
  assert.equal(nativeInitialIdleBodySuccessor(value,{...value,cancellationSource:{...cancellationSource,targetId:12}}),false);
  assert.equal(nativeInitialIdleBodySuccessor(value,ref),false);
  for(const bad of [{bodyId:q.bodyId+1},{nativeSession:q.nativeSession+1},{sourceSequence:q.requestSequence+1},
   {sourceAt:q.requestedAt+1},{bodyFlags:q.bodyFlags+1},{phase:15},{pose:{...q.pose,x:q.pose.x+.01}}]){
   assert.throws(()=>copyNativeInitialIdleBodyReference({...value,cancellationSource:{...cancellationSource,...bad}}),/native .*cancellation|cancelled Task/);
  }
 }finally{f.close();}
});

test('initial body rejects stale proposal commits after the original request becomes Home',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const p=propose(f),t=tuple(f),body=f.body(1);f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);
  assert.notEqual(f.w.nav_initial_idle_body_proposal_commit_bound(...t.slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert(f.planner.nativeHomeRequestReference(f.actor));assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('owned initial body fences edits and rebinding, and removal revokes its source',()=>{
 const f=nativeInitialIdleGameFixture();try{
  commit(f);const body=f.body(1),q=f.planner.nativeInitialIdleBodyBinding(f.actor).reference.sourceRequest;
  for(const [x,z,r,kind,flags] of [[q.pose.x+1,q.pose.z,q.pose.radius,0,q.bodyFlags],[q.pose.x,q.pose.z,q.pose.radius+.1,0,q.bodyFlags],[q.pose.x,q.pose.z,q.pose.radius,0,q.bodyFlags^2],[q.pose.x,q.pose.z,q.pose.radius,1,q.bodyFlags]])assert.notEqual(f.w.spatial_body_upsert(1,x,z,r,kind,flags),1);
  assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_upsert(9,q.pose.x+2,q.pose.z,.28,0,1),1);assert.notEqual(f.w.nav_gate_bind_worker(f.actor,9),1);assert(f.planner.nativeInitialIdleBodyBinding(f.actor));
  assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.w.nav_initial_idle_body_source_snapshot(f.actor,0),0);
 }finally{f.close();}
});

test('a genuine TaskStart transfers the held initial body and preserves its gait budget',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const binding=commit(f),body=f.body(1),p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);
  tick(f.state,.1,f.nav);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.planner.nativeInitialIdleBodyBinding(f.actor),binding);assert.deepEqual(f.body(1),body);
  const options={bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase},request=f.planner.pendingTaskRoute(f.actor);
  const wrong=f.planner.prepareNativeTaskStartProposal(request,{...options,runRemaining:options.runRemaining+1});assert.notEqual(wrong.status,'proposed');
  const next=f.planner.prepareNativeTaskStartProposal(request,options);assert.equal(next.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple(f).slice(0,5),next.proposal.ticket.ticket),1);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert(f.planner.nativeTaskStartBinding(f.actor));assert.equal(f.planner.beginNativeRouteExecution().status,'started');f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-task');
 }finally{f.close();}
});

for(const profile of PROFILES)test(`held initial ${profile.id} expires at its exact contract boundary without inventing Carry`,()=>{
 const f=nativeInitialIdleGameFixture({profile:profile.id});try{
  const binding=commit(f),body=f.body(1),rng=f.state.rng;f.state.time=profile.end-.05;tick(f.state,.15,f.nav);
  const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.deepEqual(home.pose,binding.reference.sourceRequest.pose);assert(home.requestSequence>binding.bodySequence);assert.deepEqual(f.planner.nativeInitialIdleBodyBinding(f.actor),binding);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert(Math.abs(home.requestedAt-(f.state.elapsed-.1))<1e-8);
 }finally{f.close();}
});

test('day expiry transfers initial body to actual source Home admission and movement',()=>{
 const f=nativeInitialIdleGameFixture({peer:true});try{
  const binding=commit(f),body=f.body(1);f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const request=f.planner.nativeHomeRequestReference(f.actor);
  const village=f.state.villages.find(v=>v.id===f.worker.villageId),home=village.entry;
  assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,request.nativeSession,binding.reference.sourceRequest.requestSequence,Number(village.id.split('-').at(-1)),home.x,home.z),-2);
  assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,request.nativeSession,binding.bodySequence,Number(village.id.split('-').at(-1)),home.x,home.z),1);
  tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);
  const proposed=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(proposed.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...tuple(f).slice(0,5),proposed.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor).reference.sourceSettlement,undefined);tick(f.state,.2,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-home');
 }finally{f.close();}
});

test('initial body saves semantic state and invalid restoration preserves the current session',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const binding=commit(f),saved=deserialize(serialize(f.state));assert.equal(saved.workers[0].nativeRouteAdmission,'native-idle');assert.deepEqual(saved.workers[0],f.worker);assert.equal(JSON.stringify(saved).includes('native-initial-idle-body-attestation'),false);
  const session=f.w.nav_intent_session(),sequence=f.w.nav_intent_transition_sequence(),closed=[],detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges(){},onClosed:r=>closed.push(r)});
  try{const invalid=structuredClone(saved);invalid.workers[0].idleState=null;assert.throws(()=>f.planner.resetFromState(invalid));assert.throws(()=>f.planner.resetFromState(saved),/fresh physical world/);assert.equal(f.w.nav_intent_session(),session);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(closed,[]);assert.deepEqual(f.planner.nativeInitialIdleBodyBinding(f.actor),binding);}finally{detach();}
 }finally{f.close();}
});

test('a forged ready marker fails before Game or native time advances',()=>{
 const f=nativeInitialIdleGameFixture();try{
  f.worker.nativeRouteAdmission='native-idle';const elapsed=f.state.elapsed,body=f.body(1);assert.throws(()=>tick(f.state,.1,f.nav),/current body owner/);assert.equal(f.state.elapsed,elapsed);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
 }finally{f.close();}
});

test('fresh loading a held initial body creates a new pending request and no old permission',()=>{
 const source=nativeInitialIdleGameFixture({mode:'watch'});let saved,old;try{old=commit(source);saved=deserialize(serialize(source.state));}finally{source.close();}
 const f=restoreNativeActionGame(saved,{admitPeer:false});try{
  assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);const q=f.planner.nativeInitialIdleRequestReference(f.actor);assert(q);assert.notEqual(q.authorityEpoch,old.reference.worldBoundary.authorityEpoch);assert.deepEqual(q.idleState,old.reference.sourceRequest.idleState);assert.deepEqual(q.pose,old.reference.sourceRequest.pose);const body=f.body(1),worker=structuredClone(f.worker);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
 }finally{f.close();}
});

test('a baseline declares actual initial bodies instead of hiding them as an empty cohort',()=>{
 const f=nativeInitialIdleGameFixture();try{
  const binding=commit(f);let baseline;const detach=f.planner.observeNativeIntentControl({onBaseline:value=>baseline=value,onChanges(){},onClosed(){}});try{assert.deepEqual(baseline.nativeInitialIdleBodies,[binding]);assert.equal(baseline.pendingInitialIdleRequests,undefined);}finally{detach();}
 }finally{f.close();}
});
