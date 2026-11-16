import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollSourceFixture} from './helpers/native-idle-stroll-source.js';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {updateIdle} from '../src/simulation/idle.js';
import {emit} from '../src/simulation/game.js';

// Source ABI only. A moved body cannot borrow initial20's typed graphical
// reference, and neither the ordinary Game cohort nor save is enabled here.
function fixture(options={}){
 const f=nativeIdleStrollSourceFixture({rng:1,peer:true,...options});
 const read=(name,n,...args)=>Array.from(new Float64Array(f.w.memory.buffer,f.w[name](...args),n));
 try{
  const stroll=f.stage();assert.equal(stroll.status,1);f.commitStroll(stroll);
  return {...f,strollProposal:stroll,
   source(ticket=0,actor=f.actor){return f.w.nav_idle_cycle_source_snapshot(actor,ticket)===1?read('nav_idle_cycle_source_ptr',26):null;},
   rest(sequence=f.strollBinding()[1],overrides={}){return f.propose(sequence,overrides);},
   arrive(){const dt=stroll.header[11]-f.state.elapsed+.01;updateIdle(f.oracle,f.anchor,dt,f.oracleNavigation,f.state.seed);f.advance(dt);assert.equal(f.stroll()[18],1);},
   read
  };
 }catch(error){f.close();throw error;}
}
function close(a,b,tolerance=1e-8){assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);}
function phaseMatchesOracle(f){const e=f.execution(),idle=f.oracle.idleState;assert.equal(e[5],idle.mode==='rest'?1:2);close(e[6],idle.elapsed);close(e[7],idle.remaining);assert.equal(e[8],idle.rng);close(e[9],idle.approachRetry??0);}

test('the native source view preserves the existing initial20 association',()=>{
 const f=nativeIdleCycleFixture();try{
  assert.equal(f.w.nav_idle_cycle_source_version(),1);const p=f.propose();assert.equal(p.status,1);assert.equal(f.w.nav_idle_cycle_source_snapshot(f.actor,p.ticket),1);const source=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26));
  assert.equal(source[1],20);assert.equal(source[5],f.bodyBinding.bodySequence);assert.deepEqual(source.slice(11,14),[f.worker.x,f.worker.z,f.worker.heading]);f.commit(p);assert.equal(f.w.nav_idle_cycle_source_snapshot(f.actor,0),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26)),source);assert.equal(f.w.nav_idle_cycle_binding_actors(),1);assert.deepEqual(f.planner.nativeIdleCycleBinding(f.actor).reference.sourceBody,f.bodyBinding);
 }finally{f.close();}
});

test('a moving stroll has no stationary source and cannot acquire REST before actual arrival',()=>{
 const f=fixture();try{
  const body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),binding=f.strollBinding(),worker=structuredClone(f.worker);assert.equal(f.source(),null);assert.equal(f.rest().status,-2);f.advance(.1);assert.equal(f.stroll()[18],0);assert.equal(f.rest().status,-2);assert.equal(f.source(),null);assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.strollBinding(),binding);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.worker,worker);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id}: prepared REST takes the executed endpoint, phases and RNG without an initial-body history`,()=>{
 const f=fixture({profile:profile.id});try{
  f.arrive();const arrived=f.stroll(),endpoint=f.body(1),bodyCount=f.w.spatial_body_count(),peer=f.body(3),walk=f.strollBinding(),worker=structuredClone(f.worker),worldRng=f.state.rng,p=f.rest();assert.equal(p.status,1);const source=f.source(p.ticket);
  assert.equal(source.length,26);assert.equal(source[1],22);assert.equal(source[2],f.actor);assert.equal(source[3],arrived[2]);assert.equal(source[4],f.w.nav_intent_session());assert.equal(source[5],walk[1]);assert.equal(source[6],f.strollProposal.header[11]);assert.equal(source[8],PROFILES.indexOf(profile));assert.equal(source[9],arrived[10]);assert.equal(p.header[3],walk[1]);assert.equal(p.header[4],0);assert.deepEqual(source.slice(11,14),[arrived[12],arrived[13],arrived[16]]);assert.deepEqual(source.slice(15,19),[arrived[21],arrived[22],arrived[23],arrived[26]]);assert.deepEqual(source.slice(21),arrived.slice(36,41));assert.deepEqual(p.header.slice(16,21),arrived.slice(36,41));assert.notDeepEqual(source.slice(11,13),[worker.x,worker.z]);
  assert.equal(f.source(p.ticket+1),null);assert.equal(f.source(p.ticket,f.actor+99),null);assert.equal(f.source(),null);assert.equal(f.stroll()[33],walk[52+15]);f.advance(.2);assert.deepEqual(f.body(1),endpoint);assert.notDeepEqual(f.body(3),peer);assert.equal(f.w.nav_idle_cycle_proposal_revalidate(f.w.nav_intent_session(),p.ticket),1);const t=f.tuple(),translation=f.read('nav_idle_cycle_proposal_time_translation_ptr',8,t[0],t[1]);assert.equal(translation[7],1);assert(translation[5]>translation[3]);assert.deepEqual(f.source(t[1]),source);assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...t.slice(0,5),p.ticket+999),-9);assert(f.stroll());f.commit(p);
  assert.equal(f.stroll(),null);assert.equal(f.strollBinding(),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.deepEqual(f.source(),source);assert.equal(f.w.nav_idle_cycle_binding_actors(),1);assert.deepEqual(f.body(1),endpoint);assert.equal(f.w.spatial_body_count(),bodyCount);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);assert.equal(f.w.nav_intent_game_execution_state(),-1);phaseMatchesOracle(f);
  const rest=f.execution()[7];updateIdle(f.oracle,f.anchor,rest,f.oracleNavigation,f.state.seed);f.advance(rest);phaseMatchesOracle(f);assert.equal(f.execution()[5],2);assert.deepEqual(f.body(1),endpoint);const watch=f.execution()[7];updateIdle(f.oracle,f.anchor,watch,f.oracleNavigation,f.state.seed);f.advance(watch);const next=f.next();assert.equal(next.data[9],f.oracle.idleState.rng);assert.equal(next.data[6],f.oracle.idleState.mode==='walk'?3:1);assert.deepEqual(f.source(),source);assert.equal(f.state.rng,worldRng);
 }finally{f.close();}
});

test('cancelling and renewing an endpoint proposal retain WALK and the same pure REST request',()=>{
 const f=fixture();try{
  f.arrive();const body=f.body(1),phase=f.stroll().slice(12),sequence=f.w.nav_intent_transition_sequence(),binding=f.strollBinding();let expected;
  for(let i=0;i<4;i++){const p=f.rest();assert.equal(p.status,1);const source=f.source(p.ticket);expected??=source;assert.deepEqual(source,expected);assert.equal(f.w.nav_idle_cycle_proposal_cancel(f.w.nav_intent_session(),p.ticket),1);assert.equal(f.source(p.ticket),null);f.advance(.2);assert.deepEqual(f.stroll().slice(12),phase);assert.deepEqual(f.strollBinding(),binding);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);}
  const p=f.rest();f.commit(p);assert.deepEqual(f.source(),expected);assert.equal(f.execution()[8],phase[39-12]);assert.equal(f.execution()[6],0);
 }finally{f.close();}
});

test('endpoint REST rejects another source, anchor or calibration without discarding the live stroll',()=>{
 const f=fixture();try{
  f.arrive();const binding=f.strollBinding(),body=f.body(1),sequence=f.w.nav_intent_transition_sequence();
  for(const source of [binding[1]+1,f.bodyBinding.bodySequence,f.decision.data[4]])assert.equal(f.rest(source).status,-2);
  for(const overrides of [{id:900099},{x:f.anchor.x+.01},{z:f.anchor.z+.01},{radius:2.9},{idleSeconds:f.calibration.idleSeconds+.1}])assert.equal(f.rest(undefined,overrides).status,-2);
  assert.equal(f.w.nav_idle_cycle_proposal_stage(f.actor,f.w.nav_intent_session()+1,binding[1],1,900098,f.anchor.x,f.anchor.z,3,f.calibration.idleSeconds,f.calibration.alertSeconds),-1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.strollBinding(),binding);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.source(),null);
 }finally{f.close();}
});

test('removed source bodies and anchors cannot commit an endpoint REST',()=>{
 for(const remove of ['body','anchor']){const f=fixture();try{
  f.arrive();const p=f.rest();assert.equal(p.status,1);if(remove==='body')assert.equal(f.w.spatial_body_remove(1),1);else{f.state.plants.find(p=>p.id==='plant-900098').alive=false;emit(f.state,'CropDestroyed',{targetId:'plant-900098'});f.planner.flushWorldEvents();assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));}
  assert.notEqual(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket),1);assert.equal(f.source(p.ticket),null);assert.equal(f.source(),null);assert.equal(f.execution(),null);
 }finally{f.close();}}
});

test('post-stroll stationary ownership rejects mutation and rebinding, and physical removal revokes it',()=>{
 const f=fixture();try{
  f.arrive();const p=f.rest();f.commit(p);const source=f.source(),body=f.body(1),peer=f.body(3);assert.equal(f.w.spatial_body_upsert(1,source[11]+.1,source[12],source[14],0,source[10]),0);assert.equal(f.w.spatial_body_upsert(1,source[11],source[12],source[14]+.01,0,source[10]),0);assert.equal(f.w.spatial_body_upsert(1,source[11],source[12],source[14],0,source[10]^2),0);assert.equal(f.w.spatial_body_upsert(19,source[11]+10,source[12],source[14],0,source[10]),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,19),0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.source(),source);f.advance(.1);assert.notDeepEqual(f.body(3),peer);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.source(),null);assert.equal(f.execution(),null);assert.equal(f.binding(),null);assert.equal(f.w.nav_idle_cycle_binding_actors(),0);assert.equal(f.w.spatial_body_upsert(1,source[11],source[12],source[14],0,source[10]),1);assert.equal(f.source(),null);
 }finally{f.close();}
});

test('a post-stroll cycle cannot be redeclared as initial20 or bypass a prepared Home handoff',()=>{
 const f=fixture();try{
  f.arrive();const p=f.rest();f.commit(p);const source=f.source(),binding=f.binding(),body=f.body(1),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.w.nav_intent_request_initial_idle(...f.args()),-2);assert.equal(f.w.nav_intent_plan_home(f.actor,source[11],source[12],source[11]+1,source[12]),-2);
  assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),f.bodyBinding.bodySequence,1,source[11]+1,source[12]),-2);assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),binding[1],1,source[11]+1,source[12]),-2);
  assert.deepEqual(f.source(),source);assert.deepEqual(f.binding(),binding);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_game_execution_state(),-1);
 }finally{f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} repeats genuine walk/REST cycles with bounded current-pose metadata`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({...runtime?{core:runtime.core}:{}});let stroll=f.strollProposal,previousSequence=0;
  for(let i=0;i<3;i++){
   const dt=stroll.header[11]-f.state.elapsed+.01;updateIdle(f.oracle,f.anchor,dt,f.oracleNavigation,f.state.seed);f.advance(dt);const arrived=f.stroll(),walk=f.strollBinding(),p=f.rest();assert.equal(p.status,1);const source=f.source(p.ticket);assert.equal(source[1],22);assert(source[5]>previousSequence);assert.deepEqual(source.slice(11,13),[arrived[12],arrived[13]]);assert.equal(source.length,26);f.commit(p);previousSequence=source[5];assert.deepEqual(f.source(),source);assert.equal(f.w.nav_intent_game_execution_state(),-1);
   const at=f.state.elapsed,before=f.execution();assert.equal(f.planner.commitNativeCausalClock({paused:true}).status,'committed');f.state.elapsed+=.1;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'paused');f.state.elapsed=at;assert.deepEqual(f.execution(),before);assert.equal(f.planner.commitNativeCausalClock({paused:false}).status,'committed');
   let next;for(let cycles=0;cycles<20;cycles++){
    for(let phase=0;phase<2;phase++){const duration=f.execution()[7];updateIdle(f.oracle,f.anchor,duration,f.oracleNavigation,f.state.seed);f.advance(duration);}
    next=f.next();assert.equal(next.data[9],f.oracle.idleState.rng);assert.deepEqual(f.source(),source);if(next.data[6]===3)break;
    const again=f.rest(next.data[4]);assert.equal(again.status,1);f.commit(again);assert.deepEqual(f.source(),source);phaseMatchesOracle(f);
   }
   assert.equal(next.data[6],3);assert.equal(f.oracle.idleState.mode,'walk');assert.deepEqual(next.points,f.oracle.path.flatMap(p=>[p.x,p.z]));stroll=f.stage(next.data[4]);assert.equal(stroll.status,1);assert.equal(stroll.header[8],source[11]);assert.equal(stroll.header[9],source[12]);assert.equal(stroll.semantic[6],source[15]);assert.equal(stroll.semantic[7],source[16]);assert.equal(stroll.semantic[8],source[17]);assert.equal(stroll.semantic[9],source[18]);assert.equal(stroll.semantic[1],f.binding()[1]);assert.equal(walk[1],source[5]);f.commitStroll(stroll);assert.equal(f.source(),null);assert.equal(f.execution(),null);assert.equal(f.w.spatial_body_count(),2);
  }
 }finally{f?.close();await runtime?.dispose();}
});
