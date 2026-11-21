import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActionSave,restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {tick} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {registerNativeAdmissionContract} from './helpers/native-admission-contract.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeTaskActionReferenceFromProposal} from '../src/world/native-task-action-presentation.js';
import {fixture as gpuFixture} from './helpers/remote-webgpu-fixture.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {floorFloat32} from '../src/float32-time.js';

test('loading declares a fresh stationary action source without restoring an executable route',()=>{
 const {saved,oldBinding}=nativeActionSave(),f=restoreNativeActionGame(saved);try{
  const progress=saved.workers[0].nativeTaskAction,request=f.planner.nativeTaskActionRequest(f.actor),source=request.sourceRequest;
  assert.equal(request.nativeRoute,undefined);assert.equal(request.initialElapsed,progress.elapsed);assert.equal(request.duration,progress.duration);assert.equal(source.actorId,Number(f.actor.split('-').at(-1)));assert.notEqual(source.authorityEpoch,oldBinding.reference.worldBoundary.authorityEpoch);
  assert.equal(f.worker.nativeRouteAdmission,'pending-action-resources');assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.path,null);assert.deepEqual(f.worker.nativeTaskAction,progress);
  assert.equal(f.planner.nativeTaskExecution(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.nativeRouteTiming(oldBinding.reference.request.nativeRoute.routeHandle),null);assert.equal(f.planner.prepareNativeTaskActionProposal(oldBinding.reference.request).status,'stale');
  const body=f.body(1),peer=f.body(3);tick(f.state,.3,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.worker.nativeTaskAction,progress);assert.equal(f.worker.actionRemaining,progress.duration-progress.elapsed);assert.equal(f.state.crates.length,0);assert.doesNotThrow(()=>serializeConfirmedState(f.state));assert.doesNotThrow(()=>deserialize(serialize(f.state)));
 }finally{f.close();}
});

test('restored action candidates retain saved progress across native revalidation without issuing permission',()=>{
 const {saved}=nativeActionSave(),f=restoreNativeActionGame(saved);try{
  const request=f.planner.nativeTaskActionRequest(f.actor),prepared=f.planner.prepareNativeTaskActionProposal(request);assert.equal(prepared.status,'proposed');const p=prepared.proposal;
  assert.equal(p.request.initialElapsed,saved.workers[0].nativeTaskAction.elapsed);assert.equal(p.endTime,p.startTime+(request.duration-request.initialElapsed));assert.equal(p.request.nativeRoute,undefined);assert.deepEqual(p.origin,{x:f.worker.x,z:f.worker.z});assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);
  tick(f.state,.2,f.nav);const fresh=f.planner.revalidateNativeTaskActionProposal(p.ticket);assert.equal(fresh.status,'revalidated');assert(fresh.timeTranslation.sameSourceState);assert.deepEqual(fresh.proposal.request.sourceRequest,p.request.sourceRequest);assert.equal(fresh.proposal.request.initialElapsed,p.request.initialElapsed);assert(fresh.proposal.startTime>p.startTime);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.cancelNativeTaskActionProposal(fresh.proposal.ticket),true);
  for(const change of [{initialElapsed:request.initialElapsed+.1},{bodyId:3},{sourceRequest:{...request.sourceRequest,requestSequence:request.sourceRequest.requestSequence+1}},{sourceRequest:{...request.sourceRequest,nativeSession:request.sourceRequest.nativeSession+1}}])assert.equal(f.planner.prepareNativeTaskActionProposal({...request,...change}).status,'stale');
 }finally{f.close();}
});

registerNativeAdmissionContract('task-action-restore',async hooks=>{
 const {saved}=nativeActionSave(),f=restoreNativeActionGame(saved);let vertical;
 try{
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action',...hooks});
  return {vertical,time:()=>f.state.elapsed,held:()=>f.body(1),peer:()=>f.body(3),binding:()=>f.planner.nativeTaskActionBinding(f.actor),
   advance(dt){f.state.elapsed+=dt;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');f.planner.commitNativeCausalClock();},
   run:signal=>vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request:f.planner.nativeTaskActionRequest(f.actor)}),{signal}),
   cancel(){releaseTask(f.state,f.worker);f.worker.status='idle';notifyWorkerPlanningChange(f.state,f.worker);f.planner.flushTaskEvents();f.planner.commitNativeCausalClock();},
   async close(){await vertical.close();f.close();}
  };
 }catch(error){await vertical?.close();f.close();throw error;}
});

test('restored action admission resumes the saved phase and only its remaining native duration',async()=>{
 const {saved,oldBinding}=nativeActionSave(),f=restoreNativeActionGame(saved);let vertical;
 try{
  const body=f.body(1),initial=saved.workers[0].nativeTaskAction.elapsed;
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action',onPrepare(){tick(f.state,.2,f.nav);},onDrain(){tick(f.state,.02,f.nav);}});
  const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request:f.planner.nativeTaskActionRequest(f.actor)}));assert.equal(result.status,'committed',JSON.stringify(result));await vertical.present();
  const proof=f.planner.nativeTaskActionBinding(f.actor),reference=proof.preparedReference;
  assert.equal(proof.reference.request.nativeRoute,undefined);assert.notEqual(proof.reference.worldBoundary.authorityEpoch,oldBinding.reference.worldBoundary.authorityEpoch);assert(proof.reference.startTime>reference.startTime+.2);assert.equal(f.planner.nativeTaskActionExecution(f.actor).elapsed,initial);assert.equal(captureNativeRoutePickFrame(vertical.host.inspect()).getActionElapsed(reference),0);assert.deepEqual(f.body(1),body);
  tick(f.state,.3,f.nav);await vertical.present();const execution=f.planner.nativeTaskActionExecution(f.actor),pick=captureNativeRoutePickFrame(vertical.host.inspect());assert(Math.abs(execution.elapsed-initial-.3)<1e-10);assert.equal(f.worker.nativeTaskAction.elapsed,execution.elapsed);assert(pick.getActionElapsed(reference)>.29&&pick.getActionElapsed(reference)<.31);assert.equal(pick.getActionExecutionTime(reference),proof.reference.startTime+pick.getActionElapsed(reference));assert.deepEqual(f.body(1),body);
  tick(f.state,proof.reference.request.duration-execution.elapsed+.1,f.nav);assert(f.planner.nativeTaskActionExecution(f.actor).completed);assert.equal(f.worker.nativeTaskAction.elapsed,proof.reference.request.duration);assert.equal(f.worker.actionRemaining,0);assert.equal(f.state.crates.length,0);assert(f.state.plants.every(p=>p.alive));assert.equal(vertical.counters().preparations,1);assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

for(const kind of ['water','initial'])test(`a genuinely saved ${kind} action reenters the same native clock with its original duration`,async()=>{
 const {saved}=nativeActionSave({kind,progress:kind==='initial'?3:.5}),f=restoreNativeActionGame(saved,{admitPeer:false});let vertical;
 try{const progress=saved.workers[0].nativeTaskAction,request=f.planner.nativeTaskActionRequest(f.actor);assert.equal(request.actionKind,kind);assert.equal(request.initialElapsed,progress.elapsed);vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action'});
  const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request}));assert.equal(result.status,'committed',JSON.stringify(result));await vertical.present();tick(f.state,.2,f.nav);assert.equal(f.worker.nativeTaskAction.kind,kind);assert(Math.abs(f.worker.nativeTaskAction.elapsed-progress.elapsed-.2)<1e-10);assert.equal(f.worker.nativeTaskAction.duration,progress.duration);assert.equal(f.state.crates.length,0);assert(!f.state.events.some(e=>e.type==='WaterSatisfied'));
 }finally{await vertical?.close();f.close();}
});

for(const progress of [0,3])test(`a saved action at ${progress===0?'its beginning':'its completed boundary'} still needs a fresh native grant`,async()=>{
 const {saved}=nativeActionSave({progress}),f=restoreNativeActionGame(saved,{admitPeer:false});let vertical;
 try{const initial=saved.workers[0].nativeTaskAction,request=f.planner.nativeTaskActionRequest(f.actor);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(request.initialElapsed,initial.elapsed);vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action'});
  const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request}));assert.equal(result.status,'committed',JSON.stringify(result));await vertical.present();const execution=f.planner.nativeTaskActionExecution(f.actor);assert.equal(execution.elapsed,initial.elapsed);assert.equal(execution.completed,progress!==0);assert.equal(captureNativeRoutePickFrame(vertical.host.inspect()).getActionElapsed(execution.binding.preparedReference),0);assert.equal(f.state.crates.length,0);
 }finally{await vertical?.close();f.close();}
});

test('a second save/load retains accumulated progress and replaces the previous native action identity',async()=>{
 const first=nativeActionSave(),f=restoreNativeActionGame(first.saved);let vertical,intermediate,previous;
 try{vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action'});const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request:f.planner.nativeTaskActionRequest(f.actor)}));assert.equal(result.status,'committed');await vertical.present();tick(f.state,.2,f.nav);intermediate=deserialize(serialize(f.state));previous=f.planner.nativeTaskActionBinding(f.actor);}finally{await vertical?.close();f.close();}
 const next=restoreNativeActionGame(intermediate,{admitPeer:false});try{const request=next.planner.nativeTaskActionRequest(next.actor);assert(request.initialElapsed>first.saved.workers[0].nativeTaskAction.elapsed);assert.equal(request.initialElapsed,intermediate.workers[0].nativeTaskAction.elapsed);assert.equal(next.planner.nativeTaskActionBinding(next.actor),null);assert.notEqual(request.sourceRequest.authorityEpoch,previous.reference.worldBoundary.authorityEpoch);assert.equal(next.planner.prepareNativeTaskActionProposal(previous.reference.request).status,'stale');assert.equal(next.planner.pendingTaskRoute(next.actor),null);}finally{next.close();}
});

test('long preparation at a large logical epoch does not consume or round away restored work',async()=>{
 const {saved}=nativeActionSave();saved.elapsed+=1e9;const f=restoreNativeActionGame(saved,{admitPeer:false});let vertical;
 try{const initial=saved.workers[0].nativeTaskAction,advance=dt=>{f.state.elapsed+=dt;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');f.planner.commitNativeCausalClock();};
  vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action',onPrepare:()=>advance(100),onDrain:()=>advance(100)});
  const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request:f.planner.nativeTaskActionRequest(f.actor)}));assert.equal(result.status,'committed',JSON.stringify(result));await vertical.present();const proof=f.planner.nativeTaskActionBinding(f.actor);assert(proof.reference.startTime>=proof.preparedReference.startTime+200);assert.equal(f.planner.nativeTaskActionExecution(f.actor).elapsed,initial.elapsed);assert.equal(captureNativeRoutePickFrame(vertical.host.inspect()).getActionElapsed(proof.preparedReference),0);
  advance(initial.duration-initial.elapsed+.5);await vertical.present();assert.equal(captureNativeRoutePickFrame(vertical.host.inspect()).getActionElapsed(proof.preparedReference),floorFloat32(initial.duration-initial.elapsed));assert.equal(f.planner.nativeTaskActionExecution(f.actor).elapsed,initial.duration);assert.equal(vertical.counters().preparations,1);assert.equal(f.state.crates.length,0);assert.deepEqual(vertical.errors,[]);
 }finally{await vertical?.close();f.close();}
});

test('a restored source protects its pending body and body removal revokes the declaration',()=>{
 const f=restoreNativeActionGame(nativeActionSave().saved);try{const q=f.planner.nativeTaskActionRequest(f.actor),body=f.body(1);assert.equal(f.w.spatial_body_upsert(1,body[1]+.1,body[2],body[3],body[4],body[5]),0);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_upsert(77,body[1]-100,body[2]-100,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(Number(f.actor.split('-').at(-1)),77),0);assert.equal(f.planner.nativeTaskActionRequest(f.actor).bodyId,1);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeTaskActionRequest(f.actor),null);assert.equal(f.planner.nativeTaskActionRestoreReferences().length,0);assert.equal(f.planner.prepareNativeTaskActionProposal(q).status,'stale');}finally{f.close();}
});

test('a consumer without restored-phase support rejects preparation before a native action is issued',async()=>{
 const f=restoreNativeActionGame(nativeActionSave().saved),graphics=await gpuFixture({capabilities:{nativeTaskActionClockVersion:1,nativeTaskActionVersion:1}});
 try{const p=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(f.actor));assert.equal(p.status,'proposed');const reference=nativeTaskActionReferenceFromProposal(p.proposal);assert.throws(()=>graphics.client.registerClockBinding(graphics.buffer,{byteOffset:0,semantic:'relative',epoch:reference.startTime,nativeAction:reference}),/support restored native actions/);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);}finally{graphics.client.dispose();await graphics.host.dispose();f.close();}
});

test('pthread restores semantic action progress without an old route handle',async()=>{
 const {saved}=nativeActionSave(),{default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;
 try{f=restoreNativeActionGame(saved,{core:runtime.core,admitPeer:false});const request=f.planner.nativeTaskActionRequest(f.actor),p=f.planner.prepareNativeTaskActionProposal(request);assert.equal(p.status,'proposed');assert.equal(f.w.nav_task_action_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();tick(f.state,.2,f.nav);assert(Math.abs(f.worker.nativeTaskAction.elapsed-request.initialElapsed-.2)<1e-10);assert.equal(f.worker.x,f.body(1)[1]);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.state.crates.length,0);}finally{f?.close();await runtime.dispose();}
});
