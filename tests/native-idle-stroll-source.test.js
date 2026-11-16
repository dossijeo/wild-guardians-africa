import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {updateIdle} from '../src/simulation/idle.js';
import {emit} from '../src/simulation/game.js';

// Trusted source ABI only. No graphical22 permission or Game22 projection is
// manufactured by these tests; ordinary Game must reject this new cohort.
function fixture(options={}){
 const f=nativeIdleCycleFixture({mode:'watch',remaining:.03,rng:0,...options});
 try{
  const oracle=structuredClone(f.worker),p=f.propose();assert.equal(p.status,1);f.commit(p);
  updateIdle(oracle,f.anchor,p.header[23],f.oracleNavigation,f.state.seed);f.advance(p.header[23]);
  const next=f.next();assert.equal(next.data[6],3);assert.equal(oracle.idleState.mode,'walk');
  const read=(name,n)=>Array.from(new Float64Array(f.w.memory.buffer,f.w[name](),n));
  return {...f,oracle,decision:next,
   stage(sequence=next.data[4],session=f.w.nav_intent_session()){
    const status=f.w.nav_idle_stroll_proposal_stage(f.actor,session,sequence);if(status!==1)return {status};
    const tuple=f.tuple(),count=f.w.nav_idle_stroll_proposal_points(...tuple.slice(0,2)),rows=f.w.nav_idle_stroll_proposal_rows(...tuple.slice(0,2));
    return {status,ticket:tuple[1],header:read('nav_idle_stroll_proposal_header_ptr',24),semantic:read('nav_idle_stroll_proposal_semantic_ptr',20),
     points:Array.from(new Float32Array(f.w.memory.buffer,f.w.nav_idle_stroll_proposal_points_ptr(),count*2)),rows:read('nav_idle_stroll_proposal_rows_ptr',rows*16)};
   },
   commitStroll(prepared){const t=f.tuple();assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...t.slice(0,5),prepared.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');},
   stroll(){return f.w.nav_idle_stroll_execution(f.actor)===1?read('nav_idle_stroll_execution_ptr',42):null;},
   strollBinding(){return f.w.nav_idle_stroll_binding_snapshot(f.actor)===1?read('nav_idle_stroll_binding_ptr',72):null;}
  };
 }catch(error){f.close();throw error;}
}
function close(a,b,tolerance=1e-8){assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);}

test('stroll preparation and cancellation retain the genuine cycle, body and RNG while the peer advances',()=>{
 const f=fixture({peer:true});try{
  const body=f.body(1),peer=f.body(3),worker=structuredClone(f.worker),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence(),cycle=f.binding(),p=f.stage();
  assert.equal(p.status,1);assert.equal(f.tuple()[5],22);assert.deepEqual(p.points,f.decision.points);assert.equal(p.header[21],f.decision.data[4]);assert.equal(p.semantic[1],cycle[1]);assert.equal(p.semantic[15],f.decision.data[9]);assert.deepEqual(p.semantic.slice(18),f.decision.data.slice(11,13));assert(p.rows.length>=16);assert.equal(f.stroll(),null);
  assert.equal(f.stage().status,-4);f.advance(.2);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.w.nav_idle_stroll_proposal_cancel(f.w.nav_intent_session(),p.ticket+1),0);assert.equal(f.w.nav_idle_stroll_proposal_cancel(f.w.nav_intent_session(),p.ticket),1);assert.deepEqual(f.binding(),cycle);assert.deepEqual(f.next(),f.decision);assert.equal(f.strollBinding(),null);
 }finally{f.close();}
});

test('retiming accepts the same relative program and rejects a substituted preparation ticket',()=>{
 const f=fixture({peer:true});try{
  const body=f.body(1),p=f.stage();assert.equal(p.status,1);f.advance(.2);assert.equal(f.w.nav_idle_stroll_proposal_revalidate(f.w.nav_intent_session(),p.ticket),1);
  const t=f.tuple(),translation=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_proposal_time_translation_ptr(...t.slice(0,2)),11));assert(t[1]>p.ticket);assert(translation[5]>translation[3]);assert.equal(translation[9],1);assert.equal(translation[10],1);
  assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...t.slice(0,5),p.ticket+999),-9);assert.deepEqual(f.body(1),body);f.commitStroll(p);const b=f.strollBinding();assert.deepEqual(b.slice(4,28),p.header);assert.equal(b[28+10],translation[5]);assert.deepEqual(b.slice(52),p.semantic);assert.equal(b[2],p.ticket);assert.equal(b[3],t[1]);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id} walks on the existing native kernel and exposes REST only after actual arrival`,()=>{
 const f=fixture({profile:profile.id,peer:true});try{
  const body=f.body(1),worker=structuredClone(f.worker),worldRng=f.state.rng,p=f.stage();assert.equal(p.status,1);f.commitStroll(p);const seq=f.w.nav_intent_transition_sequence();
  assert.equal(f.execution(),null);assert.equal(f.binding(),null);assert.equal(f.planner.nativeInitialIdleBodyState(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.w.nav_intent_game_execution_state(),-1);
  const e=f.stroll();assert(e);assert.equal(e[6],f.strollBinding()[1]);assert.equal(e[8],p.semantic[1]);assert.equal(e[9],p.header[21]);assert.deepEqual(e.slice(36),[0,0,0,0,0,0]);assert.deepEqual(f.body(1),body);
  const duration=p.header[11]-p.header[10],step=Math.min(.1,duration/2);updateIdle(f.oracle,f.anchor,step,f.oracleNavigation,f.state.seed);f.advance(step);const moving=f.stroll();
  close(moving[12],f.oracle.x);close(moving[13],f.oracle.z);close(moving[16],f.oracle.heading);close(moving[21],worker.runPhase);close(moving[22],f.oracle.walkPhase);close(moving[23],worker.carryPhase);assert.equal(moving[27],0);assert.equal(moving[30],3);assert.equal(moving[33],f.decision.data[9]);assert.deepEqual(moving.slice(36),[0,0,0,0,0,0]);assert.notDeepEqual(f.body(1),body);
  const remaining=p.header[11]-f.state.elapsed;updateIdle(f.oracle,f.anchor,remaining+.01,f.oracleNavigation,f.state.seed);f.advance(remaining+.01);const arrived=f.stroll();assert.equal(arrived[18],1);assert.equal(arrived[12],p.points.at(-2));assert.equal(arrived[13],p.points.at(-1));assert.equal(arrived[30],3);assert.equal(arrived[36],1);assert.equal(arrived[39],f.oracle.idleState.rng);close(arrived[38],f.oracle.idleState.remaining);assert.equal(f.oracle.idleState.mode,'rest');assert.equal(f.w.nav_intent_transition_sequence(),seq);
  const endpoint=f.body(1),phase=arrived.slice(12);f.advance(.2);assert.deepEqual(f.body(1),endpoint);assert.deepEqual(f.stroll().slice(12),phase);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);assert.equal(f.w.nav_idle_cycle_proposal_stage(f.actor,f.w.nav_intent_session(),seq,1,900098,f.anchor.x,f.anchor.z,3,f.calibration.idleSeconds,f.calibration.alertSeconds),-2);
 }finally{f.close();}
});

test('stroll requires an exhausted WALK decision in the same session and cannot borrow a REST decision',()=>{
 const f=fixture();try{const body=f.body(1);assert.equal(f.stage(f.decision.data[4]+1).status,-2);assert.equal(f.stage(f.decision.data[4],f.w.nav_intent_session()+1).status,-1);assert.deepEqual(f.body(1),body);assert.equal(f.stroll(),null);}finally{f.close();}
 for(const remaining of [.03,2]){const f=nativeIdleCycleFixture({mode:'watch',remaining,rng:0x12345678});try{const p=f.propose();f.commit(p);if(remaining===.03){f.advance(p.header[23]);assert.equal(f.next().data[6],1);}assert.equal(f.w.nav_idle_stroll_proposal_stage(f.actor,f.w.nav_intent_session(),remaining===.03?f.next().data[4]:f.binding()[1]),-2);}finally{f.close();}}
});

test('a removed anchor or body cannot acquire a prepared stroll',()=>{
 for(const remove of ['anchor','body']){const f=fixture();try{const p=f.stage(),body=f.body(1);assert.equal(p.status,1);if(remove==='body')assert.equal(f.w.spatial_body_remove(1),1);else{f.state.plants.find(p=>p.id==='plant-900098').alive=false;emit(f.state,'CropDestroyed',{targetId:'plant-900098'});f.planner.flushWorldEvents();assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));}
  assert.notEqual(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket),1);assert.equal(f.stroll(),null);assert.equal(f.strollBinding(),null);if(remove==='anchor'){assert.deepEqual(f.body(1),body);assert.equal(f.stage().status,-2);}
 }finally{f.close();}}
});

test('a navigation revision requeries the selected destination without rerolling the private stream',()=>{
 const f=fixture();try{
  const body=f.body(1),worker=structuredClone(f.worker),next=f.next();f.w.spatial_select_nav_profile_index(1);const revision=f.w.lazy_route_revision();assert.equal(f.w.lazy_reject_route_edge(20,20,21,20),1);assert.notEqual(f.w.lazy_route_revision(),revision);const misses=f.w.spatial_route_cache_misses();
  const p=f.stage();assert.equal(p.status,1);assert(f.w.spatial_route_cache_misses()>misses);assert.deepEqual(p.semantic.slice(18),next.data.slice(11,13));assert.equal(p.semantic[15],next.data[9]);assert.deepEqual(f.next(),next);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);f.commitStroll(p);f.advance(.1);assert(f.stroll());
 }finally{f.close();}
});

test('a newly blocked destination fails closed without changing the selected request or held body',()=>{
 const f=fixture();try{
  const body=f.body(1),next=f.next(),worker=structuredClone(f.worker),worldRng=f.state.rng;assert(f.session.core.addWall(next.data[11],next.data[12],.4,.4)>0);assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));
  const p=f.stage();assert([0,-6].includes(p.status),`Unavailable destination: ${p.status}`);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.stroll(),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.next(),next);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);
 }finally{f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} stroll keeps pause and physical ownership checks`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({...runtime?{core:runtime.core}:{}});assert.equal(f.w.nav_idle_stroll_proposal_version(),1);const p=f.stage();assert.equal(p.status,1);f.commitStroll(p);const before=f.stroll(),at=f.state.elapsed;assert.equal(f.planner.commitNativeCausalClock({paused:true}).status,'committed');f.state.elapsed+=.1;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'paused');f.state.elapsed=at;assert.deepEqual(f.stroll(),before);assert.equal(f.planner.commitNativeCausalClock({paused:false}).status,'committed');f.advance(.1);assert.notDeepEqual(f.stroll(),before);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.stroll(),null);assert.equal(f.strollBinding(),null);assert.equal(f.w.nav_idle_stroll_binding_actors(),0);
 }finally{f?.close();await runtime?.dispose();}
});

test('nonzero arrival RNG advances exactly once in both native modules and remains only a desired REST',async()=>{
 for(const threaded of [false,true]){
  let runtime,f;try{
   if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
   f=fixture({rng:1,...runtime?{core:runtime.core}:{}});const p=f.stage();assert.equal(p.status,1);f.commitStroll(p);const walkRng=f.decision.data[9];assert.notEqual(walkRng,0);assert.equal(f.stroll()[33],walkRng);
   const duration=p.header[11]-f.state.elapsed;updateIdle(f.oracle,f.anchor,duration+.01,f.oracleNavigation,f.state.seed);f.advance(duration+.01);const arrived=f.stroll(),next=arrived.slice(36),sequence=f.w.nav_intent_transition_sequence();assert.equal(arrived[18],1);assert.equal(arrived[30],3);assert.equal(arrived[33],walkRng);assert.equal(next[0],1);assert.notEqual(next[3],walkRng);assert.equal(next[3],f.oracle.idleState.rng);close(next[2],f.oracle.idleState.remaining);
   const body=f.body(1);f.advance(.4);assert.deepEqual(f.body(1),body);assert.equal(f.stroll()[33],walkRng);assert.deepEqual(f.stroll().slice(36),next);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  }finally{f?.close();await runtime?.dispose();}
 }
});
