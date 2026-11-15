import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {tick,advanceReal} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';

function issue(f,workerId,bodyId,policy={}){
 const request=f.planner.pendingTaskRoute(workerId),p=f.planner.prepareNativeTaskStartProposal(request,{bodyId,radius:.28,urgent:true,runRemaining:4,runPhase:23.125,walkPhase:41.75,carryPhase:9.5,...policy});assert.equal(p.status,'proposed');
 assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));
 assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return p.proposal;
}
function fixture({core=null}={}){
 const f=nativeTaskRequestFixture({core,bindBodies:true,independentHome:false,configureState:state=>{state.structures=state.structures.filter(s=>!s.gate);}});f.claim();
 Object.assign(f.state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(f.state.awakenings)f.state.awakenings.enabled=false;f.state.tutorial.step='done';
 f.state.plants=f.state.plants.map(p=>({...createPlant(p.id,p.species,p.x,p.z,f.state.workers[0].centerId),growth:999999,harvestRequested:true,water:[]}));
 for(const w of f.state.workers)Object.assign(w,{recovery:null,recoveryExitRemaining:0,fallRemaining:0,raidReturn:false,crateId:null});
 // The current source-projection increment has no gate motor projection.
 assert.equal(f.state.structures.some(s=>s.gate&&s.status!=='ruined'),false);
 const proposals=f.state.workers.map((w,i)=>issue(f,w.id,i?3:1,i?{urgent:false,runRemaining:0}:{})),nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;
 const stopWorld=f.planner.observeWorld(f.state),fail=()=>{throw Error('Legacy JS mover/clearance must not run for an executed native task');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
 return {...f,nav,proposals,close(){stopWorld();f.close();}};
}

test('the real game tick projects cached native task bodies and phases without a JS path or second mover',()=>{
 const f=fixture();try{
  assert.equal(f.planner.nativeGameExecutionState(),1);const before=f.state.workers.map(w=>({x:w.x,z:w.z}));
  tick(f.state,.1,f.nav);
  for(let i=0;i<f.state.workers.length;i++){const worker=f.state.workers[i],pose=f.planner.nativeTaskExecution(worker.id),body=f.body(i?3:1);
   assert.equal(pose.executedThrough,f.state.elapsed);assert.equal(worker.x,body.x);assert.equal(worker.z,body.z);assert(Math.hypot(worker.x-before[i].x,worker.z-before[i].z)>.1);
   for(const name of ['runPhase','walkPhase','carryPhase','runRemaining','running'])assert.equal(worker[name],pose[name]);assert.deepEqual(worker.path,[]);assert.equal(worker.status,'walking');
  }
  assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('native arrival requests action resources once and retains its body without applying harvest consequences',()=>{
 const f=fixture();try{
  const end=Math.max(...f.proposals.map(p=>p.endTime));tick(f.state,end-f.state.elapsed+.2,f.nav);
  const requests=f.state.workers.map(w=>f.planner.nativeTaskActionRequest(w.id));
  for(let i=0;i<requests.length;i++){const request=requests[i],worker=f.state.workers[i],pose=f.planner.nativeTaskExecution(worker.id);assert(request);assert.equal(request.actionKind,'harvest');assert.equal(request.duration,3.6/1.5);assert(pose.arrived);assert.equal(request.bodyId,i?3:1);assert.equal(request.nativeRoute.assignmentSequence,pose.nativeRoute.assignmentSequence);assert.equal(worker.status,'walking');assert.equal(f.planner.markActionActive(worker.id),false);}
  const bodies=[f.body(1),f.body(3)];tick(f.state,.3,f.nav);
  assert.deepEqual([f.body(1),f.body(3)],bodies);assert.equal(f.state.crates.length,0);assert(f.state.plants.every(p=>p.alive));
  for(let i=0;i<requests.length;i++){const next=f.planner.nativeTaskActionRequest(f.state.workers[i].id);assert.equal(next.requestedAt,requests[i].requestedAt);assert.equal(next.duration,requests[i].duration);assert(next.executedThrough>requests[i].executedThrough);}
 }finally{f.close();}
});

test('advanceReal commits each native game clock segment at the same executed logical boundary',()=>{
 const f=fixture();try{const segments=[];advanceReal(f.state,.12,f.nav,{nightFastForward:false,onClockSegment:s=>segments.push(s)});assert(segments.length>=5);assert(segments.every(s=>s.rate===1));assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.planner.nativeTaskExecution(f.state.workers[0].id).executedThrough,f.state.elapsed);}finally{f.close();}
});

test('a worker awaiting action resources keeps its native body while the other genuine task continues',()=>{
 const f=fixture();try{assert(f.proposals[1].endTime-f.proposals[0].endTime>.5);tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);
  const a=f.state.workers[0],b=f.state.workers[1],held=f.body(1),before=f.body(3),request=f.planner.nativeTaskActionRequest(a.id);assert(request);assert.equal(f.planner.nativeTaskActionRequest(b.id),null);assert.equal(f.planner.nativeTaskExecution(b.id).arrived,false);
  tick(f.state,.3,f.nav);assert.deepEqual(f.body(1),held);assert(Math.hypot(f.body(3).x-before.x,f.body(3).z-before.z)>.2);assert.equal(f.planner.nativeTaskActionRequest(a.id).requestedAt,request.requestedAt);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('unsupported source movers fail before changing game time or native bodies',()=>{
 for(const mode of ['idle','dynamic-body-echo','raid']){const f=fixture();try{if(mode==='idle')f.state.workers[0].status='idle';if(mode==='dynamic-body-echo')f.nav.dynamicBodies={sync(){throw Error('must not sync');}};if(mode==='raid')f.state.raid={animals:[]};const at=f.state.elapsed,bodies=[f.body(1),f.body(3)];assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover/);assert.equal(f.state.elapsed,at);assert.equal(f.w.nav_intent_effective_time(),at);assert.deepEqual([f.body(1),f.body(3)],bodies);}finally{f.close();}}
 const f=nativeTaskRequestFixture({bindBodies:true});f.claim();try{assert.equal(f.planner.nativeGameExecutionState(),-1);const at=f.state.elapsed;assert.throws(()=>tick(f.state,.1,{intentTaskPlanner:f.planner}),/intention class/);assert.equal(f.state.elapsed,at);}finally{f.close();}
});

test('the execution read view never samples a prediction and action requests cannot bypass admission',()=>{
 const f=fixture();try{
  const worker=f.state.workers[0],p=f.proposals[0],evaluations=f.w.nav_intent_execution_evaluations();
  for(let i=0;i<10;i++)assert.equal(f.planner.nativeTaskExecution(worker.id).executedThrough,10);assert.equal(f.w.nav_intent_execution_evaluations(),evaluations);
  assert.equal(f.planner.requestNativeTaskActionResources(worker.id,{kind:'harvest',duration:3.6,heading:0}),false);assert.equal(f.planner.nativeTaskActionRequest(worker.id),null);
  f.state.elapsed=p.endTime+.1;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const pose=f.planner.nativeTaskExecution(worker.id);assert(pose.arrived);assert.equal(f.planner.requestNativeTaskActionResources(worker.id,{kind:'harvest',duration:3.6,heading:pose.yaw}),true);
  const request=f.planner.nativeTaskActionRequest(worker.id);assert.equal(f.planner.requestNativeTaskActionResources(worker.id,{kind:'harvest',duration:2,heading:pose.yaw}),false);assert.equal(f.planner.nativeTaskActionRequest(worker.id).duration,request.duration);assert.equal(f.planner.markActionActive(worker.id),false);
  assert.equal(f.w.nav_intent_request_reroute(p.actorId),1);assert.equal(f.planner.nativeTaskExecution(worker.id),null);assert.equal(f.planner.nativeTaskActionRequest(worker.id),null);
 }finally{f.close();}
});

test('a task cancellation queued at the current boundary cannot execute one more interval of its old route',()=>{
 const f=fixture();try{tick(f.state,.1,f.nav);const worker=f.state.workers[0],at=f.state.elapsed,bodies=[f.body(1),f.body(3)];releaseTask(f.state,worker);worker.status='idle';notifyWorkerPlanningChange(f.state,worker);
  assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover/);assert.equal(f.state.elapsed,at);assert.equal(f.w.nav_intent_effective_time(),at);assert.equal(f.planner.nativeTaskExecution(worker.id),null);assert.deepEqual([f.body(1),f.body(3)],bodies);
 }finally{f.close();}
});

test('pthread executes the same game source projection and retains a real native arrival request',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{tick(f.state,.1,f.nav,{clockRate:2});assert.equal(f.planner.nativeCausalClock().rate,2);assert.equal(f.state.workers[0].x,f.body(1).x);
  tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);const worker=f.state.workers[0],request=f.planner.nativeTaskActionRequest(worker.id);assert(request);assert.equal(request.bodyId,1);assert.equal(request.duration,3.6/1.5);assert.equal(f.planner.markActionActive(worker.id),false);
 }finally{f.close();await runtime.dispose();}
});

test('executed task snapshots retain position and phases but restore as fresh resource requests',()=>{
 for(const arrived of [false,true]){const f=fixture();try{tick(f.state,arrived?Math.max(...f.proposals.map(p=>p.endTime))-f.state.elapsed+.1:.1,f.nav);
  assert.doesNotThrow(()=>serializeConfirmedState(f.state));const saved=deserialize(serialize(f.state)),worker=saved.workers[0],before={x:worker.x,z:worker.z,runPhase:worker.runPhase,walkPhase:worker.walkPhase,carryPhase:worker.carryPhase},old=f.planner.nativeTaskExecution(worker.id).nativeRoute;
  assert.equal(worker.nativeRouteAdmission,'native-task');assert.deepEqual(worker.path,[]);assert.equal(worker.status,'walking');assert.equal(Object.hasOwn(worker,'nativeRoute'),false);
  for(const change of [{status:'acting'},{path:[{x:worker.x,z:worker.z}]},{nativeRouteAdmission:'ready'}]){const invalid=structuredClone(saved);Object.assign(invalid.workers[0],change);assert.throws(()=>serialize(invalid),/recursos nativa/);}
  assert.throws(()=>tick(saved,.1,{version:1}),/requires resource admission/);
  f.planner.resetFromState(saved);assert.equal(worker.nativeRouteAdmission,'pending-resources');assert.equal(worker.status,'waiting-task');assert.equal(worker.path,null);for(const [key,value] of Object.entries(before))assert.equal(worker[key],value);
  assert.equal(f.planner.nativeTaskExecution(worker.id),null);assert.equal(f.planner.nativeTaskActionRequest(worker.id),null);const request=f.planner.pendingTaskRoute(worker.id);assert(request);assert.notEqual(request.requestHandle.session,old.routeHandle.session);assert.equal(f.planner.nativeRouteTiming(old.routeHandle),null);assert.doesNotThrow(()=>serialize(saved));
 }finally{f.close();}}
});

test('native invalidation returns the executed task to a serializable pending-resource state',()=>{
 const f=fixture();try{tick(f.state,.1,f.nav);const worker=f.state.workers[0];assert.equal(worker.nativeRouteAdmission,'native-task');assert.equal(f.w.nav_intent_request_reroute(Number(worker.id.split('-').at(-1))),1);f.planner.reconcileWorkerRoutes(f.state,{navVersion:f.nav.version});
  assert.equal(worker.status,'waiting-task');assert.equal(worker.path,null);assert.equal(worker.nativeRouteAdmission,'pending-resources');assert.equal(f.planner.nativeTaskExecution(worker.id),null);assert.doesNotThrow(()=>serializeConfirmedState(f.state));
 }finally{f.close();}
});
