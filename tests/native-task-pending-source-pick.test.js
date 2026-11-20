import test from 'node:test';import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {nativeTaskSettlementGraphicsFixture} from './helpers/native-task-settlement-graphics.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {enqueue} from '../src/simulation/tasks.js';
import {emit} from '../src/simulation/game.js';

async function pending({activate=true,unbound=false}={}){
 const f=await nativeTaskSettlementGraphicsFixture();let idle,next;
 try{
  idle=await f.roster.prepareNativeTaskSettlementProposal(f.support,{getPickAge:f.getPickAge});idle.activate();const settled=f.commit();idle.finalize(settled);f.sync();f.flush();
  const s=f.nativeState,target=createPlant('plant-'+s.nextId++,'mijo',f.target.x,f.target.z,f.worker.centerId);target.growth=cropSpec('mijo').growth_seconds;target.harvestRequested=true;s.plants.push(target);emit(s,'CropPlaced',{targetId:target.id});enqueue(s,f.worker.centerId,'harvest',target.id);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(s.elapsed);assert.equal(f.planner.commitTaskBatchToState(s,plan,{navVersion:1,pendingResources:true}),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const request=f.planner.pendingTaskRoute(f.actor);f.sync();
  if(unbound){assert(f.roster.releaseNativeTaskSettlement(f.actor,settled.nativeTaskSettlementBinding));f.flush();}
  const r=settled.nativeTaskSettlementBinding.reference,p=r.pose,prepared=f.planner.prepareNativeTaskStartProposal(request,{bodyId:r.bodyId,radius:p.radius,runRemaining:p.runRemaining,runPhase:p.runPhase,walkPhase:p.walkPhase,carryPhase:p.carryPhase});assert.equal(prepared.status,'proposed');const support=f.terrain.prepareNativeTaskStartProposal(prepared.proposal,{terrainManifest:f.manifest});let candidateClockReads=0,submitted=false;
  next=await f.roster.prepareNativeTaskStartProposal(support,{getPickTime:()=>{candidateClockReads++;if(!submitted)throw Error('Candidate has no submitted image');return prepared.proposal.startTime+.1;}});if(activate)next.activate();
  const actor=f.roster.get(f.actor),camera=new PerspectiveCamera(45,1,.1,100),y=f.residency.surface(p.x,p.z);camera.position.set(p.x,y+3,p.z+6);camera.lookAt(p.x,y+.8,p.z);camera.updateMatrixWorld(true);const picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});
  const pick=()=>{for(const h of [.7,1,1.3,.4,1.5]){const point=new Vector3(p.x,y+h,p.z).project(camera),hit=picker.pick({x:point.x,y:point.y});if(hit.entityId===f.actor)return hit;}throw Error('Original settled image missed its body');};
  return {...f,residentActor:actor,next,prepared,settled,pick,get candidateClockReads(){return candidateClockReads;},submit(){submitted=true;},close(){next?.cancel();idle?.cancel();f.close();}};
 }catch(error){next?.cancel();idle?.cancel();f.close();throw error;}
}

test('pending second Task picks the actual retained Idle image without borrowing its unpublished clock',async()=>{
 const f=await pending();try{const root=f.residentActor.root,body=f.body(f.reference.bodyId),count=f.w.spatial_body_count(),acquires=f.acquires;assert.throws(f.pick,/Candidate has no submitted image/);const reads=f.candidateClockReads;
  for(let i=0;i<3;i++){assert.equal(f.next.withSourcePresentation(f.pick).entityId,f.actor);assert(f.next.valid());assert.equal(f.roster.get(f.actor).root,root);assert.deepEqual(f.body(f.reference.bodyId),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.acquires,acquires);assert.equal(f.candidateClockReads,reads);}
  assert(f.next.cancel());assert.equal(f.pick().entityId,f.actor);assert.deepEqual(f.body(f.reference.bodyId),body);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const fault of ['throw','promise','nested'])test(`retained source picking restores the unpublished candidate after ${fault}`,async()=>{
 const f=await pending();try{const body=f.body(f.reference.bodyId);assert.throws(()=>f.next.withSourcePresentation(()=>{if(fault==='throw')throw Error('Injected picking failure');if(fault==='promise')return Promise.resolve(null);return f.next.withSourcePresentation(f.pick);}),fault==='throw'?/Injected picking failure/:/source|synchronous|presentation/i);assert(f.next.valid());assert.deepEqual(f.body(f.reference.bodyId),body);assert.throws(f.pick,/Candidate has no submitted image/);assert.equal(f.next.withSourcePresentation(f.pick).entityId,f.actor);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('a committed second Task cannot roll its physical presentation back to the previous Idle',async()=>{
 const f=await pending();try{assert.equal(f.next.withSourcePresentation(f.pick).entityId,f.actor);const p=f.prepared.proposal;assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);const data={nativeTaskStartBinding:f.planner.nativeTaskStartBinding(f.actor),resources:{kind:14,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(p.expectedRouteHandle)}};f.next.finalize(data);f.submit();assert.throws(()=>f.next.withSourcePresentation(f.pick),/source|presentation/i);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('the retained Idle remains pickable before capture activates its candidate',async()=>{
 const f=await pending({activate:false});try{const body=f.body(f.reference.bodyId);assert.equal(f.next.withSourcePresentation(f.pick).entityId,f.actor);assert.equal(f.candidateClockReads,0);assert(f.next.valid());f.next.activate();assert.throws(f.pick,/Candidate has no submitted image/);assert.equal(f.next.withSourcePresentation(f.pick).entityId,f.actor);assert.deepEqual(f.body(f.reference.bodyId),body);}finally{f.close();}
});

test('an actor without the acquired graphical Idle source cannot invent retained-source picking',async()=>{
 const f=await pending({unbound:true});try{assert.equal(f.next.withSourcePresentation,undefined);assert(f.next.valid());assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);}finally{f.close();}
});
