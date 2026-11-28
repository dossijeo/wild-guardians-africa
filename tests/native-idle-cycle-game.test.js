import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {tick} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {cropSpec} from '../src/simulation/rules.js';

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`Game projects actual ${profile.id} ${mode} cycle phases without moving its body or consuming world RNG`,()=>{
 const f=nativeIdleCycleGameFixture({mode,profile:profile.id,remaining:mode==='rest'?.15:2.3});try{
  const body=f.body(1),peer=f.body(3),rng=f.state.rng,binding=f.commit();assert.equal(f.planner.nativeGameExecutionState(),1);tick(f.state,.35,f.nav);
  const actual=f.planner.nativeIdleCycleExecution(f.actor);assert.deepEqual(f.worker.idleState,actual.idleState);assert.equal(actual.executedThrough,f.state.elapsed);assert.equal(actual.idleState.mode,'watch');assert.deepEqual(actual.binding,binding);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.planner.projectNativeInitialIdleBody(f.state,f.worker),null);
  const saved=deserialize(serialize(f.state));assert.deepEqual(saved.workers[0].idleState,actual.idleState);assert.equal(saved.workers[0].nativeRouteAdmission,'native-idle');
 }finally{f.close();}
});

test('Game retains executed terminal watch while the genuine next REST is only pending, including preparation and acquisition',()=>{
 const f=nativeIdleCycleGameFixture({mode:'watch',remaining:.03});try{
  const first=f.commit();tick(f.state,.1,f.nav);const actual=f.planner.nativeIdleCycleExecution(f.actor),next=f.planner.nativeIdleCycleNextRequest(f.actor);assert(actual.finished);assert.equal(actual.idleState.mode,'watch');assert.equal(next.idleState.mode,'rest');assert.deepEqual(f.worker.idleState,actual.idleState);
  const proposal=f.prepare();assert.deepEqual(proposal.nativeIdleCycle.initialState,next.idleState);assert.deepEqual(f.worker.idleState,actual.idleState);assert.equal(f.planner.cancelNativeIdleCycleProposal(proposal.ticket),true);
  f.worker.idleState=structuredClone(next.idleState);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');f.planner.projectNativeIdleCycle(f.state,f.worker);assert.deepEqual(f.worker.idleState,actual.idleState);
  const second=f.commit();assert(second.cycleSequence>first.cycleSequence);assert.deepEqual(f.worker.idleState,next.idleState);tick(f.state,.1,f.nav);assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);
 }finally{f.close();}
});

test('cycle projection rejects another Game, a wrong executed watermark and a substituted physical pose',()=>{
 const f=nativeIdleCycleGameFixture();try{
  f.commit();assert.throws(()=>f.planner.projectNativeIdleCycle(structuredClone(f.state),f.worker),/another game/);const at=f.state.elapsed;f.state.elapsed+=.1;assert.throws(()=>f.planner.projectNativeIdleCycle(f.state,f.worker),/executed game boundary/);f.state.elapsed=at;f.worker.x+=1;assert.throws(()=>f.planner.projectNativeIdleCycle(f.state,f.worker),/executed game boundary/);
 }finally{f.close();}
});

test('a genuine pending stroll stays intention while Game holds the executed watch and its native body',()=>{
 const f=nativeIdleCycleGameFixture({mode:'watch',remaining:.03,rng:0});try{
  f.commit();const body=f.body(1),peer=f.body(3),rng=f.state.rng;tick(f.state,.1,f.nav);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(next.idleState.mode,'walk');assert.equal(f.worker.idleState.mode,'watch');assert.equal(f.worker.idleState.remaining,0);assert.equal(f.worker.path,null);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');
  tick(f.state,.3,f.nav);assert.deepEqual(f.planner.nativeIdleCycleNextRequest(f.actor),next);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);
 }finally{f.close();}
});

test('ordinary Game preempts a running cycle with its genuine newly matured harvest task and prepared TaskStart',()=>{
 const f=nativeIdleCycleGameFixture();try{
  const cycle=f.commit(),body=f.body(1),anchor=f.state.plants.find(p=>p.id==='plant-900098');anchor.growth=cropSpec(anchor.species).growth_seconds;
  tick(f.state,.1,f.nav);const task=f.state.tasks.find(t=>t.workerId===f.worker.id),request=f.planner.pendingTaskRoute(f.worker.id);assert.equal(task.kind,'harvest');assert.equal(task.targetId,anchor.id);assert(request);assert(request.requestSequence>cycle.cycleSequence);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
  const proposal=f.planner.prepareNativeTaskStartProposal(request,{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(proposal.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),proposal.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:f.nav.version});tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-task');assert(f.planner.nativeTaskStartBinding(f.actor));
 }finally{f.close();}
});

for(const daily of [false,true])test(`ordinary Game expires an executing cycle into genuine Home (${daily?'day':'profile boundary'})`,()=>{
 const f=nativeIdleCycleGameFixture({mode:'watch',peer:daily});try{
  const binding=f.commit(),body=f.body(1),peer=daily?f.body(3):null,rng=f.state.rng;if(daily)f.worker.contractDay=f.state.day-1;else f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;
  tick(f.state,.15,f.nav);const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert(home.requestSequence>binding.cycleSequence);assert.equal(home.bodyId,binding.reference.bodyId);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);if(daily)assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.planner.projectNativeIdleCycle(f.state,f.worker),null);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));
 }finally{f.close();}
});

for(const threaded of [false,true])for(const savedMode of ['executing-rest','executing-watch','rest','walk'])test(`a fresh ${threaded?'pthread':'standalone'} load restores ${savedMode.startsWith('executing-')?savedMode:'terminal watch with pending '+savedMode} semantics without its old permissions`,async()=>{
 const pending=!savedMode.startsWith('executing-'),source=nativeIdleCycleGameFixture({mode:savedMode==='executing-rest'?'rest':'watch',remaining:pending ? .03 : 2.3,peer:false,rng:savedMode==='walk'?0:0x12345678});let saved,old,expectedNext,runtime,f;
 try{old=source.commit();tick(source.state,.1,source.nav);saved=deserialize(serialize(source.state));expectedNext=source.planner.nativeIdleCycleNextRequest(source.actor)?.idleState;assert.equal(serialize(source.state).includes('native-idle-cycle-attestation'),false);assert.equal(serialize(source.state).includes('native-idle-cycle-reference'),false);}finally{source.close();}
 try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=restoreNativeActionGame(saved,{admitPeer:false,...(runtime?{core:runtime.core}:{})});const request=f.planner.nativeInitialIdleRequestReference(f.actor);assert(request);assert.notEqual(request.authorityEpoch,old.reference.worldBoundary.authorityEpoch);assert.deepEqual(request.idleState,saved.workers[0].idleState);assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleNextRequest(f.actor),null);assert.equal(f.planner.revalidateNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:old.reference.worldBoundary.authorityEpoch,session:old.reference.worldBoundary.nativeSession,ticket:old.reference.worldBoundary.ticket}).status,'stale');
  const body=f.body(1),rng=f.state.rng;tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker.idleState,saved.workers[0].idleState);
  const initial=f.planner.prepareNativeInitialIdleBodyProposal(request);assert.equal(initial.status,'proposed');assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...f.tuple().slice(0,5),initial.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeInitialIdleBody(f.state,f.worker);
  const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');assert.notEqual(p.proposal.nativeIdleCycle.sourceBody.reference.worldBoundary.authorityEpoch,old.reference.worldBoundary.authorityEpoch);assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeIdleCycle(f.state,f.worker);
  if(pending){assert.equal(p.proposal.nativeIdleCycle.duration,0);const semantic=({pathVersion,...value})=>value;assert.deepEqual(semantic(f.planner.nativeIdleCycleNextRequest(f.actor).idleState),semantic(expectedNext));assert.equal(expectedNext.mode,savedMode);assert.equal(f.worker.idleState.mode,'watch');assert.equal(saved.workers[0].idleState.destination,undefined);}else{tick(f.state,.1,f.nav);assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);}
  assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});
