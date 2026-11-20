import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedTaskGraphicsFixture} from './helpers/native-farm-arrived-task-graphics.js';
import {NATIVE_STOP_POSE_FIELDS} from '../src/world/native-worker-route-stop-codec.js';
import {floorFloat32} from '../src/float32-time.js';
import {releaseTask} from '../src/simulation/tasks.js';

function meshes(root){
 const result=[];
  root.traverse(node=>{if(node.isMesh&&!node.userData.wgCpuPickProxy)result.push({node,geometry:node.geometry,index:node.geometry.index,position:node.geometry.attributes.position,material:node.material});});
 return result;
}

for(const homeBeforeReceipt of [false,true])test(`Task25 retains the existing rig through Home when the Game mirror comes ${homeBeforeReceipt?'before':'after'} the stop receipt`,async()=>{
 const f=await nativeFarmArrivedTaskGraphicsFixture();
 let task,stopped,returning;
 try{
  task=await f.roster.prepareNativeTaskStartProposal(f.support,{getPickTime:f.getPickTime});
  task.activate();
  task.finalize(f.commitTask());
  f.planner.reconcileWorkerRoutes(f.nativeState,{navVersion:1});
  f.sync();f.flush();
  f.advance(.04);
  assert(f.planner.projectNativeTaskExecution(f.nativeState,f.worker));
  f.sync();
  const actor=f.roster.get(f.actor),root=actor.root,before=meshes(root),firstBody=f.body(1),initialTask=f.worker.taskId;
  const allocations=()=>f.registry.status().owned.filter(value=>value.namespace==='native-gpu-motion');
  const resources=allocations();
  const staged=f.planner.prepareNativeTaskRouteStopProposal(f.nativeActor);
  assert.equal(staged.status,'proposed');
  const p=staged.proposal,view={get:(x,z)=>f.residency.get(x,z),changedKeys:new Set()};
  let visiblePose=null;
  const args={stopEffects:p,boundary:p.worldBoundary,nativeTaskRouteStopTemplate:p.nativeStop,
   prepareBodySupport:(reference,pose)=>f.terrain.prepareNativeBody(reference,pose),
   getPickTime(){throw Error('Task stop cannot borrow the legacy clock');},
   getStoppedProjection(selector,epoch){assert.equal(selector.kind,'native-task-route-stopped-body');assert(visiblePose);return {...visiblePose,relativeTime:floorFloat32(visiblePose.at-epoch)};}};
  await assert.rejects(f.roster.prepareNativeTerrainStops(view,{...args,nativeFarmArrivalStopTemplate:p.nativeStop}),/mixes source families/);
  const wrongBody=structuredClone(p.nativeStop);
  wrongBody.routes[0].bodyId++;
  await assert.rejects(f.roster.prepareNativeTerrainStops(view,{...args,nativeTaskRouteStopTemplate:wrongBody}),/admitted source/);
  const prepared=await f.roster.prepareNativeTerrainStops(view,args);
  assert.equal(prepared.parts.length,1);
  [stopped]=prepared.parts;
  stopped.capturePresentation(()=>{});
  assert.deepEqual(allocations(),resources);
  assert.deepEqual(f.body(1),firstBody);
  for(const item of before)assert.equal(item.node.material,item.material);
  f.advance(.18);
  assert(f.planner.projectNativeTaskExecution(f.nativeState,f.worker));
  f.sync();
  assert(stopped.valid());
  const entity=f.state.workers[0],contract=entity.contractDay;
  entity.contractDay=12345;
  f.roster.sync();
  assert.equal(stopped.valid(),false);
  entity.contractDay=contract;
  f.roster.sync();
  assert(stopped.valid());
  const fresh=f.planner.revalidateNativeTaskRouteStopProposal(staged.ticket);
  assert.equal(fresh.status,'revalidated');
  assert.notDeepEqual(f.body(1),firstBody);
  const atCommit=f.body(1);
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),staged.ticket.ticket),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const {nativeStop,routeEffects,gateEffects}=fresh.proposal;
  const proof=f.planner.nativeTaskRouteStopBinding(nativeStop,p.nativeStop,{projection:{version:1,routeEffects,gateEffects}});
  assert(proof);
  function declareHome(){
   const held=f.planner.nativeSuspendedGateRoute(f.nativeActor),goal=f.point(-8,0);
   const village=f.nativeState.villages.find(value=>value.id===f.worker.villageId),villageId=Number(village.id.split('-').at(-1));
   village.entry=goal;
   assert.equal(f.w.nav_intent_stopped_task_home_request(f.nativeActor,held.resumeHandle.session,nativeStop.sourceRoute.assignmentSequence,held.resumeHandle.generation,villageId,goal.x,goal.z),1);
   const request=f.planner.nativeHomeRequestReference(f.nativeActor);
   releaseTask(f.nativeState,f.worker);
   const {x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining}=request.pose;
   Object.assign(f.worker,{x,z,heading:yaw,runPhase,walkPhase,carryPhase,runRemaining,status:'returning',nativeRouteAdmission:'pending-home-resources',
    path:null,destinationId:null,running:false,gateWaiting:false,idleState:null});
   assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   f.sync();
   return request;
  }
  let request;
  if(homeBeforeReceipt){request=declareHome();assert.equal(stopped.valid(),false);}
  assert.throws(()=>stopped.acceptNativeStopBinding({...proof,kind:'native-farm-arrival-stop-attestation'}));
  assert.equal(stopped.acceptNativeStopBinding(proof),true);
  stopped.activate();
  stopped.attach();
  const release=stopped.finalize();release.retire();release.notify();
  visiblePose={at:proof.reference.worldBoundary.effectiveTime,age:floorFloat32(proof.reference.worldBoundary.effectiveTime-f.proposal.startTime)};
  for(const [key,index] of Object.entries(NATIVE_STOP_POSE_FIELDS))visiblePose[key]=Math.fround(proof.projection.routeEffects.rows[8+index]);
  const restore=actor.preparePick();restore();
  f.flush();
  assert.equal(f.roster.get(f.actor),actor);
  assert.deepEqual(f.body(1),atCommit);
  assert.equal(f.worker.taskId,homeBeforeReceipt?null:initialTask);
  assert.equal(f.acquires,1);
  assert.deepEqual(allocations(),resources);
  for(const item of before){
   assert.equal(item.node.geometry,item.geometry);
   assert.equal(item.node.geometry.index,item.index);
   assert.equal(item.node.geometry.attributes.position,item.position);
  }
  assert.deepEqual(f.errors,[]);
  if(!request)request=declareHome();
  const home=f.planner.prepareNativeHomeRouteProposal(request);
  assert.equal(home.status,'proposed');
  const support=f.terrain.prepareNativeHomeRouteProposal(home.proposal,{terrainManifest:f.manifest});
  returning=await f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:f.getPickTime});
  assert(returning.valid());
  returning.activate();
  assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),home.proposal.ticket.ticket),1);
  assert.equal(f.planner.beginNativeRouteExecution().status,'started');
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor),reference=nativeHomeRouteBinding.reference;
  returning.finalize({nativeHomeRouteBinding,resources:{kind:18,phase:'committed',worldBoundary:reference.worldBoundary,
   presentation:f.planner.captureNativeRoutePresentation(reference.expectedRouteHandle)}});
  f.planner.reconcileWorkerRoutes(f.nativeState,{navVersion:1});
  f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);
  assert.equal(f.acquires,1);
  assert.equal(allocations().length,1);
  assert.deepEqual(f.body(1),atCommit);
  assert.deepEqual(f.errors,[]);
 }finally{returning?.cancel();stopped?.cancel();task?.cancel();f.close();}
});
