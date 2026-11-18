import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedApproachSource} from './helpers/native-idle-selected-approach-source.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {updateIdle} from '../src/simulation/idle.js';

const close=(a,b,t=1e-8)=>assert(Math.abs(a-b)<=t,`${a} != ${b}`);
const unsupported=f=>assert.equal(f.w.nav_idle_stroll_proposal_stage(f.actor,f.q.nativeSession,f.next()[4]),-8);
function stage(f){const p=f.stage();assert.equal(p.status,1,JSON.stringify(p));assert.equal(p.semantic[0],2);return p;}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} selected approach22 retains WALK remaining and private RNG until original arrival`,async()=>{
 const f=await selectedApproachSource({profile:profile.id,threaded});try{
  assert.equal(typeof f.w.nav_idle_stroll_cycle_approach_version,'function');assert.equal(f.w.nav_idle_stroll_cycle_approach_version(),1);const next=f.next(),body=f.body(1),worker=structuredClone(f.worker),worldRng=f.state.rng,peer=f.body(2);assert.equal(next[6],3);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),1);unsupported(f);
  const p=stage(f);assert.equal(p.semantic[1],f.cycle.binding[1]);assert.equal(p.semantic[20],next[8]);assert.notEqual(p.semantic[20],f.q.idleSeconds*2);close(p.semantic[20],f.oracleWorker.idleState.remaining);assert.equal(p.semantic[15],f.oracleWorker.idleState.rng);assert.equal(p.header[21],next[4]);assert.equal(p.header[22],next[5]);assert.equal(p.semantic[18],f.q.anchor.x);assert.equal(p.semantic[19],f.q.anchor.z);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.binding(),null);
  assert.equal(f.commit(p),1);assert.equal(f.cycleBinding(),null);assert.equal(f.w.nav_initial_idle_body_binding_snapshot(f.actor),0);const binding=f.binding();assert.equal(binding[52],2);assert.equal(binding[72],next[8]);const duration=p.header[11]-p.header[10];assert(duration>0);f.advance(duration/2);const midway=f.execution();assert.equal(midway[18],0);assert.equal(midway[32],next[8]);assert.equal(midway[33],next[9]);assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(2),peer);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);
  f.advance(duration/2+1e-7);const arrived=f.execution();assert.equal(arrived[18],1);assert.equal(arrived[36],1);assert.equal(arrived[32],next[8]);updateIdle(f.oracleWorker,f.anchor,duration+1e-6,f.navigation,f.state.seed);assert.equal(f.oracleWorker.idleState.mode,'rest');close(arrived[38],f.oracleWorker.idleState.remaining);assert.equal(arrived[39],f.oracleWorker.idleState.rng);assert.notEqual(arrived[39],next[9]);
  const rest=arrived.slice(36);f.advance(.2);assert.deepEqual(f.execution().slice(36),rest);assert.equal(f.w.nav_idle_cycle_proposal_stage(f.actor,f.q.nativeSession,binding[1],p.semantic[10],p.semantic[11],p.semantic[12],p.semantic[13],p.semantic[14],p.semantic[17],f.c.alertSeconds),1);const successor=f.tuple();assert.equal(f.w.nav_idle_cycle_source_snapshot(f.actor,successor[1]),1);const source=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26));assert.equal(source[1],22);assert.equal(source[23],arrived[38]);assert.equal(source[24],arrived[39]);assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...successor.slice(0,5),successor[1]),1);assert(f.w.nav_intent_clock_commit(1,0)>=0);assert(f.cycleBinding());assert.equal(f.binding(),null);assert.equal(f.w.nav_idle_cycle_execution(f.actor),1);const restExecution=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_execution_ptr(),14));assert.equal(restExecution[5],1);assert.equal(restExecution[7],arrived[38]);assert.equal(restExecution[8],arrived[39]);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);
 }finally{await f.dispose();}
});

for(const retry of ['watch','rest-end','watch-end'])test(`selected ${retry} carries its actual remaining, including zero at coincident retry`,async()=>{
 const f=await selectedApproachSource({retry});try{const n=f.next(),p=stage(f);close(p.semantic[20],f.oracleWorker.idleState.remaining);assert.equal(p.semantic[15],f.oracleWorker.idleState.rng);if(retry!=='watch')assert.equal(p.semantic[20],0);else assert(p.semantic[20]>0);assert.equal(f.commit(p),1);assert.equal(f.execution()[32],n[8]);assert.equal(f.execution()[33],n[9]);}finally{await f.dispose();}
});

for(const rng of [0,1,0xffffffff])test(`selected approach preserves stream ${rng} through cancellation and revalidation`,async()=>{
 const f=await selectedApproachSource({rng});try{let p=stage(f);const selected=f.next(),body=f.body(1),before=f.cycleBinding();assert.equal(f.w.nav_idle_stroll_proposal_cancel(f.q.nativeSession,p.ticket),1);assert.deepEqual(f.next(),selected);assert.deepEqual(f.cycleBinding(),before);p=stage(f);f.advance(.2);assert.equal(f.w.nav_idle_stroll_proposal_revalidate(f.q.nativeSession,p.ticket),1);const actual=f.capture(),translation=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_proposal_time_translation_ptr(f.q.nativeSession,actual.ticket),11));assert.equal(translation[9],1);assert.equal(translation[10],1);assert.deepEqual(actual.semantic,p.semantic);assert(actual.header[10]>p.header[10]);assert.equal(f.commit(actual,p.ticket+999),-9);assert.equal(f.commit(actual,p.ticket),1);assert.equal(f.binding()[72],selected[8]);assert.deepEqual(f.body(1),body);}finally{await f.dispose();}
});

test('cold WALK, unfinished or unselected21 and foreign identities cannot grant selected approach22',async()=>{
 for(const options of [{acquire:false},{finish:false},{repair:false}]){const f=await selectedApproachSource(options);try{const body=f.body(1),worker=structuredClone(f.worker);assert.equal(f.stage().status,-2);assert.equal(f.binding(),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);}finally{await f.dispose();}}
 const f=await selectedApproachSource();try{assert.equal(f.stage({actorId:f.actor+999}).status,-2);assert.equal(f.stage({session:f.q.nativeSession+1}).status,-1);assert.equal(f.stage({sequence:f.next()[4]+1}).status,-2);assert.equal(f.binding(),null);}finally{await f.dispose();}
});

test('body or anchor withdrawal invalidates an uncommitted selected approach',async()=>{
 for(const remove of ['body','anchor']){const f=await selectedApproachSource();try{const p=stage(f),worker=structuredClone(f.worker);if(remove==='body')assert.equal(f.w.spatial_body_remove(1),1);else{const ptr=f.w.nav_intent_changes_ptr(1);new Float64Array(f.w.memory.buffer,ptr,10).set([0,2,f.q.anchor.id,0,0,0,0,0,0,0]);assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,1),1);}assert.notEqual(f.commit(p),1);assert.equal(f.binding(),null);assert.deepEqual(f.worker,worker);}finally{await f.dispose();}}
});

test('changed topology revalidates the path without consuming or replacing the selected request',async()=>{
 const f=await selectedApproachSource();try{const p=stage(f),next=f.next(),body=f.body(1);const wall=f.session.core.addWall(f.q.anchor.x,f.q.anchor.z,.4,.4);assert(wall>0);assert.equal(f.w.nav_idle_stroll_proposal_revalidate(f.q.nativeSession,p.ticket),-7);assert.equal(f.binding(),null);assert.deepEqual(f.next(),next);assert.deepEqual(f.body(1),body);assert.equal(f.session.core.removeWall(wall),1);assert.equal(stage(f).semantic[20],next[8]);}finally{await f.dispose();}
});

test('large native epoch keeps the selected semantic2 and legacy DTO readers reject it',async()=>{
 const f=await selectedApproachSource({epoch:2**20});try{const p=stage(f);assert(p.header[10]>=2**20);assert.throws(()=>f.bridge.captureNativeIdleStrollProposal({kind:'native-idle-stroll-proposal-ticket',authorityEpoch:f.bridge.nativeIdleCycleBinding(f.actor).reference.worldBoundary.authorityEpoch,session:f.q.nativeSession,ticket:p.ticket}),/Invalid native Idle stroll source/);assert.equal(f.binding(),null);assert.equal(f.commit(p),1);assert.equal(f.execution()[32],p.semantic[20]);}finally{await f.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} held selected22 exposes remaining in its bounded native source`,async()=>{
 const f=await selectedApproachSource({threaded});try{
  const p=stage(f);assert.equal(f.commit(p),1);const binding=f.binding();f.advance(.12);const body=f.body(1),worker=structuredClone(f.worker),peer=f.body(2),rng=f.state.rng;
  assert.equal(f.w.nav_gate_suspend_route(f.q.nativeSession,p.header[20],p.header[4]),1);assert(f.w.nav_intent_clock_commit(1,0)>=0);assert.equal(f.w.nav_gate_suspended_route(f.actor),1);const held=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_suspended_route_ptr(),27)),goal=f.point(6,-4),village=Number(f.worker.villageId.split('-').at(-1));
  assert.equal(f.w.nav_intent_idle_stroll_home_request(f.actor,f.q.nativeSession,binding[1],held[3],village,goal.x,goal.z),1);assert(f.w.nav_intent_clock_commit(1,0)>=0);assert.equal(f.binding(),null);
  assert.equal(f.w.nav_idle_stroll_held_source_snapshot(f.actor),1);const source=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_binding_ptr(),48));assert.equal(source[27],2);assert.equal(source[47],p.semantic[20]);assert.equal(source[1],binding[1]);
  assert.equal(f.w.nav_idle_stroll_held_execution(f.actor),1);const before=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_execution_ptr(),42));assert.equal(before[32],p.semantic[20]);assert.equal(before[33],p.semantic[15]);f.advance(.2);assert.equal(f.w.nav_idle_stroll_held_execution(f.actor),1);const after=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_execution_ptr(),42));assert.equal(after[32],before[32]);assert.equal(after[33],before[33]);assert.equal(after[35],before[35]);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(2),peer);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);
 }finally{await f.dispose();}
});
