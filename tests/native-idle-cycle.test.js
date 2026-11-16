import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {updateIdle} from '../src/simulation/idle.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleProposal,copyNativeIdleCycleAttestation} from '../src/world/native-idle-cycle.js';
import {emit} from '../src/simulation/game.js';

function close(a,b,tolerance=1e-8){assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);}
const ticket=(f,p)=>({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:f.bodyBinding.reference.worldBoundary.authorityEpoch,session:f.w.nav_intent_session(),ticket:p.ticket});

test('typed cycle data describes actual native phases and rejects source, duration and role substitution',()=>{
 const f=nativeIdleCycleFixture();try{
  const p=f.propose();assert.equal(p.status,1);const prepared=f.planner.captureNativeIdleCycleProposal(ticket(f,p)),r=prepared.nativeIdleCycle;assert.deepEqual(copyNativeIdleCycleProposal(prepared),prepared);assert.equal(r.sourceBody.bodySequence,f.bodyBinding.bodySequence);assert.equal(r.initialState.rng,f.worker.idleState.rng);assert.equal(r.watchStartOffset,f.worker.idleState.remaining);assert.equal(prepared.authorizedAutonomy,false);
  assert.throws(()=>copyNativeIdleCycleReference({...r,kind:'native-task-action-reference'}));assert.throws(()=>copyNativeIdleCycleReference({...r,bodyId:r.bodyId+1}));assert.throws(()=>copyNativeIdleCycleReference({...r,durations:{...r.durations,watch:r.durations.watch+1}}));assert.throws(()=>copyNativeIdleCycleReference({...r,initialState:{...r.initialState,rng:1}}));assert.throws(()=>copyNativeIdleCycleReference({...r,watchRng:(r.watchRng^1)>>>0}));assert.throws(()=>copyNativeIdleCycleReference({...r,actionDuration:r.duration}));
  f.commit(p);const binding=f.planner.nativeIdleCycleBinding(f.actor),execution=f.planner.nativeIdleCycleExecution(f.actor);assert.deepEqual(copyNativeIdleCycleAttestation(binding),binding);assert.deepEqual(binding.reference,r);assert.deepEqual(execution.idleState,r.initialState);assert.equal(execution.executedThrough,f.state.elapsed);assert.equal(execution.finished,false);assert.equal(f.planner.captureNativeIdleCycleProposal(ticket(f,p)),null);
 }finally{f.close();}
});

test('an already exhausted original watch resolves once at acquisition without advancing logical time',()=>{
 const f=nativeIdleCycleFixture({mode:'watch',remaining:0,rng:0x12345678});try{
  const body=f.body(1),oracle=structuredClone(f.worker),at=f.state.elapsed,p=f.propose();assert.equal(p.status,1);const prepared=f.planner.captureNativeIdleCycleProposal(ticket(f,p));assert.equal(prepared.nativeIdleCycle.duration,0);assert(prepared.nativeIdleCycle.durations.watch>0);updateIdle(oracle,f.anchor,0,f.oracleNavigation,f.state.seed);f.commit(p);assert.equal(f.state.elapsed,at);assert.equal(f.execution()[10],1);assert.equal(f.next().data[9],oracle.idleState.rng);close(f.next().data[8],oracle.idleState.remaining);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleExecution(f.actor).finished,true);
 }finally{f.close();}
});

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} native ${mode} cycle advances original phases and private RNG on the common clock`,()=>{
 const f=nativeIdleCycleFixture({mode,profile:profile.id,peer:true});try{
  const worker=structuredClone(f.worker),body=f.body(1),peer=f.body(3),worldRng=f.state.rng,oracle=structuredClone(worker),proposal=f.propose();assert.equal(proposal.status,1);assert.deepEqual(f.worker,worker);assert.equal(f.binding(),null);const binding=f.commit(proposal),start=binding[33],duration=binding[51];
  assert.equal(f.planner.nativeInitialIdleBodyState(f.actor),null);assert.equal(f.planner.projectNativeInitialIdleBody(f.state,f.worker),null);assert.equal(f.execution()[5],mode==='rest'?1:2);
  let through=start;for(let steps=0;steps<300&&through<start+duration-1e-9;steps++){
   const phase=f.execution(),step=Math.min(.1,phase[7]),next=Math.min(start+duration,through+step);if(next<=through)break;
   updateIdle(oracle,f.anchor,next-through,f.oracleNavigation,f.state.seed);f.advance(next-through);through=next;const executed=f.execution();
   assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);
   if(executed[10]===0){assert.equal(executed[5],oracle.idleState.mode==='rest'?1:2);close(executed[6],oracle.idleState.elapsed);close(executed[7],oracle.idleState.remaining);assert.equal(executed[8],oracle.idleState.rng);close(executed[9],oracle.idleState.approachRetry);}
  }
  if(f.execution()[10]!==1){const dt=start+duration-f.state.elapsed;updateIdle(oracle,f.anchor,dt,f.oracleNavigation,f.state.seed);f.advance(dt);}
  const request=f.next();assert.equal(request.data[3],1);assert.equal(request.data[6],oracle.idleState.mode==='walk'?3:1);close(request.data[7],oracle.idleState.elapsed);close(request.data[8],oracle.idleState.remaining);assert.equal(request.data[9],oracle.idleState.rng);close(request.data[10],oracle.idleState.approachRetry);
  if(oracle.idleState.mode==='walk'){close(request.data[11],oracle.idleState.destination.x);close(request.data[12],oracle.idleState.destination.z);assert.deepEqual(request.points,oracle.path.flatMap(p=>[p.x,p.z]));}
  assert.notDeepEqual(f.body(3),peer);const stable=f.next(),held=f.execution().slice(5,10),seq=f.w.nav_intent_transition_sequence();f.advance(.4);assert.deepEqual(f.next(),stable);assert.deepEqual(f.execution().slice(5,10),held);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_idle_cycle_resolve_next(f.actor,f.w.nav_intent_session(),binding[1]),1);assert.deepEqual(f.next(),stable);
 }finally{f.close();}
});

test('cycle cancellation and retiming retain the held source while a native peer advances',()=>{
 const f=nativeIdleCycleFixture({peer:true});try{
  const body=f.body(1),worker=structuredClone(f.worker),proposal=f.propose(),sequence=f.w.nav_intent_transition_sequence();assert.equal(proposal.status,1);assert.equal(f.w.nav_idle_cycle_proposal_cancel(f.w.nav_intent_session(),proposal.ticket),1);assert.equal(f.binding(),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  const before=f.propose();f.advance(.3);assert.equal(f.w.nav_idle_cycle_proposal_revalidate(f.w.nav_intent_session(),before.ticket),1);const current={header:f.header(),ticket:f.tuple()[1]},translation=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_proposal_time_translation_ptr(f.w.nav_intent_session(),current.ticket),8));assert.equal(translation[7],1);assert(current.header[5]>before.header[5]);assert.equal(current.header[23],before.header[23]);
  assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),before.ticket+999),-9);const binding=f.commit(before);assert.deepEqual(binding.slice(4,28),before.header);assert.deepEqual(binding.slice(28),current.header);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);close(f.execution()[6],worker.idleState.elapsed);
 }finally{f.close();}
});

test('typed revalidation retains the same prepared program while its actual native origin moves',()=>{
 const f=nativeIdleCycleFixture({peer:true});try{
  const p=f.propose();assert.equal(p.status,1);const prepared=f.planner.captureNativeIdleCycleProposal(ticket(f,p));f.advance(.2);const next=f.planner.revalidateNativeIdleCycleProposal(prepared.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.compatible,true);assert(next.proposal.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);assert.deepEqual(next.proposal.nativeIdleCycle.initialState,prepared.nativeIdleCycle.initialState);assert.deepEqual(next.proposal.nativeIdleCycle.sourceBody,prepared.nativeIdleCycle.sourceBody);
  f.commit(p);const binding=f.planner.nativeIdleCycleBinding(f.actor);assert.deepEqual(binding.preparedReference,prepared.nativeIdleCycle);assert.deepEqual(binding.reference,next.proposal.nativeIdleCycle);assert.equal(f.planner.captureNativeIdleCycleProposal(prepared.ticket),null);
 }finally{f.close();}
});

test('removing the body after preparation makes its retained cycle candidate non-executable',()=>{
 const f=nativeIdleCycleFixture();try{
  const p=f.propose();assert.equal(p.status,1);const boundary=f.tuple(),prepared=f.planner.captureNativeIdleCycleProposal(ticket(f,p)),before=structuredClone(f.worker);assert(prepared);assert.equal(f.w.spatial_body_remove(1),1);assert.notEqual(f.w.nav_idle_cycle_proposal_commit_bound(...boundary.slice(0,5),p.ticket),1);assert.equal(f.binding(),null);assert.equal(f.execution(),null);assert.equal(f.planner.captureNativeIdleCycleProposal(prepared.ticket),null);assert.deepEqual(f.worker,before);
 }finally{f.close();}
});

test('a completed no-stroll request starts another native cycle without replacing its physical ancestry',()=>{
 const f=nativeIdleCycleFixture({mode:'watch',rng:0x12345678});try{
  const proposal=f.propose();assert.equal(proposal.status,1);const first=f.commit(proposal);f.advance(proposal.header[23]);const next=f.next();assert.equal(next.data[6],1,'Fixture seed must choose a stationary successor');const body=f.body(1),second=f.propose(next.data[4]);assert.equal(second.status,1);assert.equal(second.header[4],first[1]);assert.equal(second.header[19],next.data[9]);assert.equal(second.header[18],next.data[8]);const binding=f.commit(second);assert(binding[1]>first[1]);assert.equal(binding[31],f.bodyBinding.bodySequence);assert.deepEqual(f.body(1),body);assert.equal(f.execution()[5],1);assert.equal(f.execution()[8],next.data[9]);
 }finally{f.close();}
});

test('twelve rejected short stroll candidates preserve the original final private stream and rest duration',()=>{
 const f=nativeIdleCycleFixture({mode:'watch',rng:1});try{
  const oracle=structuredClone(f.worker),anchor={...f.anchor,idleRadius:.2},proposal=f.propose(undefined,{radius:.2});assert.equal(proposal.status,1);f.commit(proposal);
  updateIdle(oracle,anchor,proposal.header[23],f.oracleNavigation,f.state.seed);f.advance(proposal.header[23]);const next=f.next();assert.equal(next.data[6],1);assert.equal(oracle.idleState.mode,'rest');assert.equal(next.data[9],oracle.idleState.rng);assert.notEqual(next.data[9],1);close(next.data[8],oracle.idleState.remaining);assert.deepEqual(next.points,[]);
 }finally{f.close();}
});

test('a removed anchor holds a completed body without consuming its next stream and resolves only on an explicit event',()=>{
 const f=nativeIdleCycleFixture({mode:'watch',rng:0x12345678});try{
  const p=f.propose();assert.equal(p.status,1);const binding=f.commit(p),plant=f.state.plants.find(p=>p.id===f.anchor.id.slice(5)),body=f.body(1),rng=f.state.rng;
  plant.alive=false;emit(f.state,'CropDestroyed',{targetId:plant.id});f.planner.flushWorldEvents();f.advance(p.header[23]);assert.equal(f.next().data[3],-2);assert.equal(f.next().data[4],0);const held=f.execution(),sequence=f.w.nav_intent_transition_sequence();f.advance(.2);assert.equal(f.next().data[3],-2);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.execution().slice(5,10),held.slice(5,10));assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
  plant.alive=true;emit(f.state,'CropPlaced',{targetId:plant.id});f.planner.flushWorldEvents();assert.equal(f.w.nav_idle_cycle_resolve_next(f.actor,f.w.nav_intent_session(),binding[1]),1);assert(f.next().data[4]>binding[1]);assert.equal(f.next().data[3],1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{f.close();}
});

test('forged source, anchor and calibration inputs cannot grant a cycle or mutate the private stream',()=>{
 const f=nativeIdleCycleFixture();try{const before=structuredClone(f.worker),body=f.body(1),seq=f.w.nav_intent_transition_sequence();
  assert.equal(f.propose(f.bodyBinding.bodySequence+1).status,-2);assert.equal(f.propose(undefined,{id:900099}).status,-2);assert.equal(f.propose(undefined,{x:f.anchor.x+5}).status,-2);assert.equal(f.propose(undefined,{radius:0}).status,-1);assert.equal(f.propose(undefined,{idleSeconds:NaN}).status,-1);assert.equal(f.binding(),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,before);assert.equal(f.w.nav_intent_transition_sequence(),seq);
 }finally{f.close();}
});

test('the old held-body lease is revoked when a genuinely issued temporal cycle takes over',()=>{
 let c,detach,lease;const f=nativeIdleCycleFixture({beforeBodyCommit(native,proposal){detach=native.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingInitialIdleRequests:b.pendingInitialIdleRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){changes.forEach(e=>c.accept(e));},onClock(clock){const old=c.status().clock;c.acceptClock({...clock,anchorAbsoluteMs:old.anchorAbsoluteMs,anchorLogicalTime:old.anchorLogicalTime});}});lease=c.admitInitialIdleBody(proposal.nativeInitialIdleBody,{preparingWorldBoundary:proposal.worldBoundary});}});
 try{c.installInitialIdleBodies(f.bodyBinding.reference.worldBoundary,[f.bodyBinding]);assert(lease.isCurrent());const p=f.propose();assert.equal(p.status,1);f.commit(p);assert.equal(lease.isCurrent(),false);assert.throws(()=>c.installInitialIdleBodies(f.bodyBinding.reference.worldBoundary,[f.bodyBinding]));assert.equal(f.planner.nativeInitialIdleBodyState(f.actor),null);}finally{detach?.();c?.dispose();f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} cycle respects pause, private zero RNG and physical removal`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleCycleFixture({mode:'watch',rng:0,...(runtime?{core:runtime.core}:{})});const proposal=f.propose();assert.equal(proposal.status,1);f.commit(proposal);const before=f.execution(),at=f.state.elapsed;assert.equal(f.planner.commitNativeCausalClock({paused:true}).status,'committed');f.state.elapsed+=.1;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'paused');f.state.elapsed=at;assert.deepEqual(f.execution(),before);assert.equal(f.planner.commitNativeCausalClock({paused:false}).status,'committed');f.advance(proposal.header[23]);assert.equal(f.next().data[9],0);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.execution(),null);assert.equal(f.binding(),null);assert.equal(f.w.spatial_body_upsert(1,f.worker.x,f.worker.z,.28,0,1),1);assert.equal(f.binding(),null);
 }finally{f?.close();await runtime?.dispose();}
});
