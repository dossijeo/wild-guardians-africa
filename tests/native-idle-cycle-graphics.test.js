import {readFile} from 'node:fs/promises';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Scene,Vector3,PerspectiveCamera} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {vec4} from 'three/tsl';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
import {createNativeIdleCycleGpuMotion} from '../src/rendering/native-idle-cycle-gpu-motion.js';
import {floorFloat32,ceilFloat32} from '../src/float32-time.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleGraphicsFixture} from './helpers/native-idle-cycle-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {copyNativeIdleCycleResources,nativeIdleCyclePresentationMatches} from '../src/world/native-idle-cycle.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {cancelIdle} from '../src/simulation/idle.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} finite ${mode} reuses its actual admitted Idle body, actor and geometry with reversible preparation`,async()=>{
 const f=await nativeIdleCycleGraphicsFixture({mode,profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),rng=f.nativeState.rng;part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});assert(part.valid());assert.equal(f.roster.get(f.actor),actor);
  part.activate();assert(part.valid());part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}
  part.activate();const data=f.commit();assert(part.validateCommit(data));assert.deepEqual(copyNativeIdleCycleResources(data.resources),data.resources);assert(nativeIdleCyclePresentationMatches(f.proposal,data.resources,data.nativeIdleCycleBinding));part.finalize(data);f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);assert.equal(f.carries,0);assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.errors,[]);assert.equal(f.roster.releaseNativeInitialIdleBody(f.actor,f.bodyBinding),false);
 }finally{part?.cancel();f.close();}
});

test('a following native REST keeps the original actor and old-cycle release cannot retire it',async()=>{
 const f=await nativeIdleCycleGraphicsFixture({mode:'watch',remaining:.03});let first,second;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);first=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});first.activate();const a=f.commit();first.finalize(a);f.flush();f.advance(.2);const request=f.planner.nativeIdleCycleNextRequest(f.nativeActor);assert.equal(request.idleState.mode,'rest');
  // Semantic fixture only; ordinary Game21 projection remains a later step.
  f.worker.idleState=structuredClone(request.idleState);f.sync();const next=f.prepare();second=await f.roster.prepareNativeIdleCycleProposal(next.support,{getPickAge:f.getPickAge});second.activate();second.rollback();assert(second.valid());second.activate();const b=f.commit(next.proposal);second.finalize(b);f.flush();assert.equal(f.roster.releaseNativeIdleCycle(f.actor,a.nativeIdleCycleBinding),false);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);for(const item of before)assert.equal(item.mesh.geometry,item.geometry);assert.deepEqual(f.errors,[]);
 }finally{second?.cancel();first?.cancel();f.close();}
});

test('a foreign association cannot finalize the actual resident cycle and cancellation restores its previous presentation',async()=>{
 const f=await nativeIdleCycleGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();const data=f.commit(),foreign=structuredClone(data);foreign.nativeIdleCycleBinding.reference.bodyId++;
  assert.throws(()=>part.validateCommit(foreign));part.rollback();part.cancel();for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);}assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
  assert.throws(()=>copyNativeIdleCycleResources({...data.resources,kind:20}));assert.equal(nativeIdleCyclePresentationMatches(f.proposal,{...data.resources,nativeTaskSettlementBinding:{}},data.nativeIdleCycleBinding),false);
 }finally{part?.cancel();f.close();}
});

for(const transition of ['Task','Home'])test(`a genuine ${transition} takes over the admitted finite cycle without replacing its actor or geometry`,async()=>{
 const f=await nativeIdleCycleGraphicsFixture({mode:'watch'});let part,next;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();const cycle=f.commit();part.finalize(cycle);f.flush();
  if(transition==='Task'){
   const p=f.point(6,0),plant=createPlant(`plant-${f.nativeState.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.nativeState.plants.push(plant);emit(f.nativeState,'CropPlaced',{targetId:plant.id});enqueue(f.nativeState,f.worker.centerId,'harvest',plant.id);f.planner.flushTaskEvents();const plans=f.planner.planIfNeeded(f.nativeState.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.nativeState,plans,{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();
  }else{
   // Real Home request ABI; ordinary Game21 phase/Home projection is pending.
   const village=f.nativeState.villages.find(v=>v.id===f.worker.villageId),goal=village.entry;f.worker.contractDay=f.nativeState.day-1;assert.equal(f.w.nav_intent_initial_idle_home_request(f.nativeActor,f.w.nav_intent_session(),f.bodyBinding.bodySequence,Number(village.id.split('-').at(-1)),goal.x,goal.z),1);cancelIdle(f.worker);Object.assign(f.worker,{status:'returning',nativeRouteAdmission:'pending-home-resources'});f.planner.commitNativeCausalClock();
  }
  f.sync();const q=f.bodyBinding.reference.sourceRequest,prepared=transition==='Home'?f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.nativeActor)):f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:q.bodyId,radius:q.pose.radius,urgent:false,runRemaining:q.pose.runRemaining,runPhase:q.pose.runPhase,walkPhase:q.pose.walkPhase,carryPhase:q.pose.carryPhase});assert.equal(prepared.status,'proposed');const support=f.terrain[transition==='Home'?'prepareNativeHomeRouteProposal':'prepareNativeTaskStartProposal'](prepared.proposal,{terrainManifest:f.manifest});assert(support?.valid());
  next=await f.roster[transition==='Home'?'prepareNativeHomeRouteProposal':'prepareNativeTaskStartProposal'](support,{getPickTime:()=>prepared.proposal.startTime});next.activate();next.rollback();assert(next.valid());next.activate();
  assert.equal(f.w[transition==='Home'?'nav_home_route_proposal_commit_bound':'nav_task_start_proposal_commit_bound'](...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);const binding=f.planner[transition==='Home'?'nativeHomeRouteBinding':'nativeTaskStartBinding'](f.nativeActor),data={resources:{kind:transition==='Home'?18:14,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(prepared.proposal.expectedRouteHandle)},[transition==='Home'?'nativeHomeRouteBinding':'nativeTaskStartBinding']:binding};next.finalize(data);f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);for(const item of before)assert.equal(item.mesh.geometry,item.geometry);assert.equal(f.roster.releaseNativeIdleCycle(f.actor,cycle.nativeIdleCycleBinding),false);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{next?.cancel();part?.cancel();f.close();}
});

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} native finite ${mode} phases match original CPU skinning at submitted ages`,async()=>{
 const f=await nativeIdleCycleGraphicsFixture({profile:profile.id,mode}),asset=await actorAsset(f.bakes.get('Walk_Skip').meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile.id],motion=createNativeIdleCycleGpuMotion({actorId:f.actor,support:f.support});let gpuActor,cpuActor,variant,age=0;
 // Local skinning oracle only. The source reference is genuine; world/body
 // placement and ownership are exercised by the roster and retained vertical.
 const make=async()=>{const entity={...structuredClone(f.worker),x:0,z:0,heading:0},state={workers:[entity],tasks:[],elapsed:10},model=clone(asset.scene),actor=await createWebGpuConfirmedWorker({scene:new Scene(),residency:{get:()=>null},state,actorId:f.actor,presentationWorkerHeadings:new Map([[f.actor,0]]),renderer:f.renderer,assetBank:{async acquire(){return {model,clips:prepareWorkerClips(asset.animations),library,release(){}};}}});actor.root.visible=true;return {actor,model,entity};};
 try{
  const gpu=await make(),cpu=await make();gpuActor=gpu.actor;cpuActor=cpu.actor;const admission={async prepare(){},async prepareAndPublish(_r,_o,publish){publish();}};await gpu.actor.installBakedWalk(f.bakes.get('Walk_Skip'),{pipelineAdmission:admission});if(mode==='watch')await gpu.actor.installBakedAlert(f.bakes.get('Alert'),{pipelineAdmission:admission});else await gpu.actor.installBakedIdle(f.bakes.get('Idle'),{pipelineAdmission:admission});gpu.actor.root.visible=true;
  const phases={clipNames:motion.clipNames,clipNode:motion.clipNode,resolve:motion.resolve,sampleClip:()=>motion.sampleClip(age),sampleForClip:(clip,duration)=>motion.sampleForClip(age,clip,duration)};variant=gpu.actor.prepareNativeMotionVariant(phases,{clipBakes:[f.bakes.get('Idle'),f.bakes.get('Alert')],clip:mode==='watch'?'Alert':'Idle'});variant.activate();let maximum=0;
  f.commit();const r=f.proposal.nativeIdleCycle;for(const value of [0,Math.fround(.1),floorFloat32(Math.max(0,r.watchStartOffset-1e-7)),ceilFloat32(r.watchStartOffset),floorFloat32(r.duration),Math.fround(r.duration+1)].sort((a,b)=>a-b)){
   age=value;const delta=r.worldBoundary.effectiveTime+age-f.nativeState.elapsed;if(delta>0)f.advance(delta);cpu.entity.idleState=structuredClone(f.planner.nativeIdleCycleExecution(f.nativeActor).idleState);cpu.actor.update();cpu.actor.root.updateMatrixWorld(true);gpu.actor.root.updateMatrixWorld(true);const restore=variant.preparePick(),proxies=[];gpu.actor.root.traverse(n=>{if(n.isMesh&&n.visible&&n.userData.wgCpuPickProxy)proxies.push(n);});
   try{cpu.model.traverse(source=>{if(!source.isSkinnedMesh)return;const original=gpu.model.getObjectByName(source.name),proxy=proxies.find(n=>n.geometry.index===original.geometry.index);assert(proxy);for(let i=0;i<source.geometry.attributes.position.count;i+=Math.max(1,Math.floor(source.geometry.attributes.position.count/40))){const a=source.getVertexPosition(i,new Vector3()).applyMatrix4(source.matrixWorld),b=proxy.getVertexPosition(i,new Vector3()).applyMatrix4(proxy.matrixWorld);maximum=Math.max(maximum,a.distanceTo(b));}});}finally{restore();}
  }assert(maximum<.02,`Finite ${mode} pose error ${maximum}`);assert(f.planner.nativeIdleCycleBinding(f.nativeActor));assert.deepEqual(f.errors,[]);
 }finally{variant?.dispose();gpuActor?.dispose();cpuActor?.dispose();motion.dispose();f.close();}
});

test('original finite Idle/Alert color and shadow programs retain both banks and their typed native time and origin-derived knot',async()=>{
 const f=await nativeIdleCycleGraphicsFixture({mode:'watch'}),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;
 try{
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});let tags=0;const semantics=new Set();
  const verify=builder=>{builder.build();const textures=new Set([...builder.vertexShader.matchAll(/textureLoad\(\s*([A-Za-z0-9_]+)/g)].map(match=>match[1]));assert(textures.size>=2);for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const uniform of binding.uniforms??[]){const tag=uniform.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeIdleCycle){semantics.add(tag.semantic);tags++;assert.deepEqual(tag.nativeIdleCycle,f.proposal.nativeIdleCycle);assert.equal(tag.nativeAction,undefined);assert.equal(tag.nativeSettlement,undefined);}}};
  for(const {mesh,material} of part.request.options.materialAlternatives){const before=mesh.material;try{mesh.material=material;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();verify(builder);
    const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);const saved=object.material;try{object.material=selected;const pass=gpu.backend.createNodeBuilder(object,gpu);pass.scene=scene;pass.camera=new PerspectiveCamera();verify(pass);}finally{object.material=saved;}}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
   }finally{mesh.material=before;}}
  assert(tags>0);assert(semantics.has('relative'));assert(semantics.has('idle-cycle-watch-knot'));assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
