import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedTaskGraphicsFixture} from './helpers/native-farm-arrived-task-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Original native Task, authored actor/bakes and actual roster. Renderer,
// admission and frame witnesses are doubles: this is not physical GPU proof.
async function fixture(options={}){
 const f=await nativeFarmArrivedTaskGraphicsFixture(options);let task;
 try{
  task=await f.roster.prepareNativeTaskStartProposal(f.support,{getPickTime:f.getPickTime});task.activate();const data=f.commitTask();task.finalize(data);
  f.planner.reconcileWorkerRoutes(f.nativeState,{navVersion:1});f.sync();f.flush();
  f.advance(data.nativeTaskStartBinding.reference.endTime-f.nativeState.elapsed+.02);
  const source=f.planner.projectNativeTaskExecution(f.nativeState,f.worker);assert(source.arrived);assert.equal(source.currentSpeed,0);
  f.nativeState.time=600;f.nativeState.villages.find(v=>v.id===f.worker.villageId).entry=f.point(-8,0);
  const request=f.planner.requestNativeCompletedTaskHome(f.nativeState,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.sync();
  const home=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(home.status,'proposed');
  const support=f.terrain.prepareNativeHomeRouteProposal(home.proposal,{terrainManifest:f.manifest});
  return {...f,source,request,home,support,get acquires(){return f.acquires;},commitHome(){
   assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),home.proposal.ticket.ticket),1);
   assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor),r=nativeHomeRouteBinding.reference;
   return {nativeHomeRouteBinding,resources:{kind:18,phase:'committed',worldBoundary:r.worldBoundary,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};
  },close(){task?.cancel();f.close();}};
 }catch(error){task?.cancel();f.close();throw error;}
}
function meshes(root){const values=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)values.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,position:mesh.geometry.attributes.position,material:mesh.material});});return values;}
test('pthread acquired Task endpoint uses the same Home transfer and original rig',async()=>{
 const {default:factory}=await import(process.env.QA_TASK_PTHREAD??'../public/wild-engine/spatial-threaded.mjs');
 const runtime=await createThreadedSpatialWorld(factory);let f,part;try{
  f=await fixture({core:runtime.core});const actor=f.roster.get(f.actor),body=f.body(1);
  part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.finalize(f.commitHome());
  assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f?.close();await runtime.dispose();}
});
for(const profile of PROFILES)test(`${profile.id}: acquired Task endpoint retains original rig through Home rollback, cancellation and acquisition`,async()=>{
 const f=await fixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),alloc=()=>f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion');const resources=alloc();
  const prepare=()=>f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});
  part=await prepare();assert(part.valid());part.activate();part.rollback();assert(part.valid());part.cancel();f.flush();assert.deepEqual(alloc(),resources);
  for(const item of before)assert.equal(item.mesh.material,item.material);
  const restore=actor.preparePick();restore();assert.deepEqual(f.body(1),body);
  part=await prepare();part.activate();part.finalize(f.commitHome());assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(alloc().length,1);assert.deepEqual(f.body(1),body);
  for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);assert.equal(item.mesh.geometry.attributes.position,item.position);}
  assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
for(const mutation of ['body','pose','session','contract','before-end'])test(`completed Task rejects Home with incompatible ${mutation}`,async()=>{
 const f=await fixture();try{
  let support=f.support;
  if(['body','pose','session'].includes(mutation)){
   const p=structuredClone(support.presentation),r=p.nativeHome,q=r.sourceRequest;
   if(mutation==='body'){p.bodyId++;r.bodyId++;q.bodyId++;}
   if(mutation==='pose'){q.pose.x+=.1;p.origin.x+=.1;p.rows[1]=p.origin.x;f.state.workers[0].x=q.pose.x;}
   if(mutation==='session')q.nativeSession++;
   support={...support,presentation:p};
  }else if(mutation==='contract')f.state.workers[0].contractDay++;
  else f.state.elapsed=f.source.at-.01;
  f.roster.sync();
  await assert.rejects(f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:f.getPickTime}));
  assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);
 }finally{f.close();}
});
