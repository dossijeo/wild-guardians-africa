import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture} from './native-route-execution.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';

export function nativeTaskRequestFixture({core=null,bindBodies=false,independentHome=true,configureState=null,taskKind='harvest'}={}){
 const f=createNativeRouteExecutionFixture({...(core?{core}:{}),configureState}),{state,w,point}=f;
 state.time=100;state.nextId=Math.max(state.nextId,1000000);state.workers=state.workers.slice(0,3);state.workers.forEach((worker,i)=>{Object.assign(worker,point(-6,i===1?6:i===2?-3.3:0),{status:i===1?'waiting-task':'idle',taskId:null,path:null,contractDay:state.day,profile:'youngMale'});});
 state.plants=[{id:'plant-900099',species:'mijo',alive:true,...point(6,0)},{id:'plant-900098',species:'mijo',alive:true,...point(6,-3.3)}];
 state.tasks=state.plants.map((plant,i)=>({id:`task-${920001+i}`,kind:taskKind,centerId:state.workers[0].centerId,targetId:plant.id,created:i,workerId:null}));
 const planner=createEventDrivenTaskPlanner(f.session);planner.resetFromState(state);
 for(const [id,worker] of [[1,state.workers[0]],[3,state.workers[2]]])assert.equal(w.spatial_body_upsert(id,worker.x,worker.z,.28,0,1),1);
 if(bindBodies)for(const [id,worker] of [[1,state.workers[0]],[3,state.workers[2]]])assert.equal(w.nav_gate_bind_worker(Number(worker.id.split('-').at(-1)),id),1);
 // B is a genuine independently executing route; A's ordinary harvest batch
 // below is never represented by an invented Home or suspended assignment.
 let b=null;if(independentHome){
  f.session.actorSectorRevision({worker:true});const start=point(-6,6),end=point(6,6),ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);assert.equal(w.nav_intent_restore_home(900012,start.x,start.z,end.x,end.z,1),1);
  const raw=planner.intentChanges().at(-1).routeHandle,prepared=planner.prepareNativeRouteMotion(raw,{radius:.28});assert.equal(prepared.status,'prepared');planner.intentChanges();
  assert.equal(w.spatial_body_upsert(2,start.x,start.z,.28,0,1),1);assert.equal(planner.reserveNativeRoute(prepared.routeHandle,2).status,'reserved');assert.equal(planner.beginNativeRouteExecution().status,'started');b=prepared.routeHandle;
 }else{state.workers=state.workers.filter(worker=>worker.id!=='worker-900012');planner.resetFromState(state);if(bindBodies)for(const [id,worker] of [[1,state.workers[0]],[3,state.workers[1]]])assert.equal(w.nav_gate_bind_worker(Number(worker.id.split('-').at(-1)),id),1);}
 assert.equal(planner.commitNativeCausalClock().status,'committed');
 const baseline=planner.nativeIntentControlBaseline(),control=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes});control.acceptClock({...planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});
 const stop=planner.observeTasks(state),plan=planner.planIfNeeded(state.elapsed);assert.equal(plan.filter(row=>row.status===1).length,2);
 return {...f,planner,control,baseline,plan,b,close(){stop();control.dispose();f.session.dispose();},claim(){assert.equal(planner.commitTaskBatchToState(state,plan,{navVersion:1,pendingResources:true}),2);const events=planner.intentChanges();for(const event of events)control.accept(event);assert.equal(planner.commitNativeCausalClock().status,'committed');control.acceptClock({...planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});return events;},advance(at){state.elapsed=at;assert.equal(planner.advanceNativeRouteExecution(at).status,'advanced');assert.equal(planner.commitNativeCausalClock().status,'committed');control.acceptClock({...planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});}};
}
