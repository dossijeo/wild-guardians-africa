import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick,advanceReal} from '../src/simulation/game.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Source projection tests use the trusted native ABI after a real executed
// arrival. Actual retained-packet/GPU-drain admission is exercised separately.
function fixture(options){
 const f=createNativeTaskGameFixture(options);tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);
 const worker=f.state.workers[0],proposed=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(worker.id));assert.equal(proposed.status,'proposed');
 assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));
 assert.equal(f.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),proposed.proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
 return {...f,worker,actor:worker.id,binding:f.planner.nativeTaskActionBinding(worker.id)};
}

test('Game projects an actually issued stationary action and lets the other native task advance',()=>{
 const f=fixture();try{
  const at=f.state.elapsed,body=f.body(1),other=f.body(3),sequence=f.w.nav_intent_transition_sequence();tick(f.state,.2,f.nav);
  const native=f.planner.nativeTaskActionExecution(f.actor),r=f.binding.reference;
  assert.equal(native.executedThrough,f.state.elapsed);assert.equal(f.worker.status,'acting');assert.equal(f.worker.nativeRouteAdmission,'native-action');assert.deepEqual(f.worker.path,[]);
  assert.deepEqual(f.worker.nativeTaskAction,{version:1,kind:'harvest',duration:r.request.duration,elapsed:native.elapsed});assert.equal(f.worker.actionRemaining,r.request.duration-native.elapsed);
  assert.deepEqual(f.body(1),body);assert.equal(f.worker.x,body.x);assert.equal(f.worker.z,body.z);assert.equal(f.worker.heading,r.request.heading);assert.equal(f.worker.running,false);assert.equal(f.worker.gateWaiting,false);
  for(const key of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[key],r[key]);
  assert(Math.hypot(f.body(3).x-other.x,f.body(3).z-other.z)>.1);assert(f.state.elapsed>at);assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('native completion retains task and body until consequence resources are admitted',()=>{
 const f=fixture();try{
  const task=f.state.tasks.find(t=>t.id===f.worker.taskId),body=f.body(1),ledger=structuredClone(f.state.ledger),nextId=f.state.nextId,events=f.state.events.length;
  tick(f.state,f.binding.reference.request.duration+.3,f.nav);const execution=f.planner.nativeTaskActionExecution(f.actor);
  assert(execution.completed);assert.equal(f.worker.actionRemaining,0);assert.equal(f.worker.nativeTaskAction.elapsed,execution.binding.reference.request.duration);assert.equal(f.worker.status,'acting');assert.equal(f.worker.taskId,task.id);assert.equal(task.workerId,f.actor);assert.deepEqual(f.body(1),body);
  assert(f.state.plants.every(p=>p.alive&&p.harvestRequested));assert.equal(f.state.crates.length,0);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.state.nextId,nextId);assert(!f.state.events.slice(events).some(e=>['CropPicked','WaterSatisfied','RepairApplied'].includes(e.type)));
  tick(f.state,.4,f.nav);assert.equal(f.worker.actionRemaining,0);assert(f.planner.nativeTaskActionBinding(f.actor));assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('the common native game clock advances actions after the last route relinquishes its body',()=>{
 const f=fixture();try{
  tick(f.state,Math.max(...f.proposals.map(p=>p.endTime))-f.state.elapsed+.05,f.nav);const other=f.state.workers[1],request=f.planner.nativeTaskActionRequest(other.id),proposed=f.planner.prepareNativeTaskActionProposal(request);assert.equal(proposed.status,'proposed');
  assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(f.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),proposed.proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.w.nav_intent_route_reservation_count(),0);assert.equal(f.planner.nativeIntentControlBaseline().routes.length,0);assert.equal(f.planner.nativeGameExecutionState(),1);const bodies=[f.body(1),f.body(3)],at=f.state.elapsed;
  tick(f.state,request.duration+.2,f.nav);assert(f.state.elapsed>at);assert.deepEqual([f.body(1),f.body(3)],bodies);assert.equal(f.planner.nativeTaskActionBindings().length,2);for(const w of f.state.workers){assert.equal(w.status,'acting');assert.equal(w.actionRemaining,0);assert(f.planner.nativeTaskActionExecution(w.id).completed);}assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('a JS countdown cannot finish or speed up a native action',()=>{
 const f=fixture();try{tick(f.state,.1,f.nav);const previous=f.worker.nativeTaskAction.elapsed;f.worker.actionRemaining=-100;f.worker.nativeTaskAction.elapsed=f.binding.reference.request.duration;
  tick(f.state,.1,f.nav);const execution=f.planner.nativeTaskActionExecution(f.actor);assert(execution.elapsed>previous);assert(execution.elapsed<.21);assert.equal(f.worker.nativeTaskAction.elapsed,execution.elapsed);assert(f.worker.actionRemaining>2);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('pause and clock-rate changes retain the same native action frontier without a JS timer',()=>{
 const f=fixture();try{tick(f.state,.1,f.nav);const before=f.planner.nativeTaskActionExecution(f.actor),body=f.body(1);f.state.pauses.push('qa');tick(f.state,.3,f.nav);assert.deepEqual(f.planner.nativeTaskActionExecution(f.actor),before);assert.deepEqual(f.body(1),body);f.state.pauses=[];
  tick(f.state,.2,f.nav,{clockRate:2});assert.equal(f.planner.nativeCausalClock().rate,2);assert(Math.abs(f.worker.nativeTaskAction.elapsed-before.elapsed-.2)<1e-10);const time=f.state.elapsed;advanceReal(f.state,.04,f.nav,{nightFastForward:false});assert(f.state.elapsed>time);assert.equal(f.worker.nativeTaskAction.elapsed,f.planner.nativeTaskActionExecution(f.actor).elapsed);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('an action projection validates source ownership, task identity and executed time before writes',()=>{
 const f=fixture();try{
  const before=structuredClone(f.worker);assert.throws(()=>f.planner.projectNativeTaskActionExecution(structuredClone(f.state),f.worker),/another game/);assert.deepEqual(f.worker,before);
  const task=f.state.tasks.find(t=>t.id===f.worker.taskId);
  for(const field of ['workerId','targetId','kind']){const value=task[field];task[field]=field==='kind'?'water':'worker-999';assert.throws(()=>f.planner.projectNativeTaskActionExecution(f.state,f.worker),/executed game boundary/);assert.deepEqual(f.worker,before);task[field]=value;}
  f.state.elapsed+=.01;assert.throws(()=>f.planner.projectNativeTaskActionExecution(f.state,f.worker),/executed game boundary/);assert.deepEqual(f.worker,before);f.state.elapsed-=.01;
 }finally{f.close();}
});

test('action snapshots retain only semantic progress and loading cannot reuse or restart its native permit',()=>{
 const f=fixture();try{tick(f.state,.3,f.nav);assert.doesNotThrow(()=>serializeConfirmedState(f.state));const saved=deserialize(serialize(f.state)),worker=saved.workers[0];
  assert.deepEqual(worker.nativeTaskAction,f.worker.nativeTaskAction);assert.equal(worker.actionRemaining,f.worker.actionRemaining);assert.deepEqual(Object.keys(worker.nativeTaskAction).sort(),['duration','elapsed','kind','version']);assert.equal(Object.hasOwn(worker,'nativeRoute'),false);
  const at=saved.elapsed,body=f.body(1),owner=f.planner.authorityEpoch;assert.throws(()=>tick(saved,.1,{}),/requires resource admission/);assert.equal(saved.elapsed,at);
  assert.throws(()=>f.planner.resetFromState(saved),/restoration requires fresh action admission/);assert.equal(f.planner.authorityEpoch,owner);assert.deepEqual(f.body(1),body);assert(f.planner.nativeTaskActionBinding(f.actor));tick(f.state,.1,f.nav);assert(f.worker.nativeTaskAction.elapsed>worker.nativeTaskAction.elapsed);
  for(const change of [{version:2},{kind:'repair'},{duration:0},{elapsed:-1},{elapsed:Infinity},{elapsed:worker.nativeTaskAction.duration+1},{actionSequence:1},{binding:{}},{nativeRoute:{}}]){const invalid=structuredClone(saved);Object.assign(invalid.workers[0].nativeTaskAction,change);assert.throws(()=>serialize(invalid),/acción nativa/);}
  const arrayProgress=structuredClone(saved);arrayProgress.workers[0].nativeTaskAction=Object.assign([],worker.nativeTaskAction);assert.throws(()=>serialize(arrayProgress));
  for(const change of [{status:'walking'},{path:[{x:worker.x,z:worker.z}]},{nativeRouteAdmission:'native-task'},{actionRemaining:0},{running:true},{gateWaiting:true}]){const invalid=structuredClone(saved);Object.assign(invalid.workers[0],change);assert.throws(()=>serialize(invalid));}
 }finally{f.close();}
});

test('cancelling an action removes its semantic progress and revokes before another native interval',()=>{
 const f=fixture();try{tick(f.state,.1,f.nav);const at=f.state.elapsed,body=f.body(1);releaseTask(f.state,f.worker);f.worker.status='idle';notifyWorkerPlanningChange(f.state,f.worker);assert.equal(f.worker.nativeTaskAction,undefined);assert.equal(f.worker.nativeRouteAdmission,undefined);
  assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('an acting marker cannot grant an action to a native route before time advances',()=>{
 const f=createNativeTaskGameFixture();try{const w=f.state.workers[0],at=f.state.elapsed,body=f.body(1);w.status='acting';w.nativeRouteAdmission='native-action';w.nativeTaskAction={version:1,kind:'harvest',duration:2.4,elapsed:0};assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);assert.equal(f.state.crates.length,0);}finally{f.close();}
});

test('pthread projects the same native action through the real Game loop and retains completed effects',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;
 try{f=fixture({core:runtime.core});tick(f.state,.3,f.nav);assert.equal(f.worker.nativeTaskAction.elapsed,f.planner.nativeTaskActionExecution(f.actor).elapsed);assert.equal(f.worker.x,f.body(1).x);tick(f.state,f.binding.reference.request.duration,f.nav);assert(f.planner.nativeTaskActionExecution(f.actor).completed);assert.equal(f.worker.status,'acting');assert.equal(f.state.crates.length,0);}finally{f?.close();await runtime.dispose();}
});
