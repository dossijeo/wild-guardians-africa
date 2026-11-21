import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleBodyGraphicsFixture} from './helpers/native-initial-idle-body-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {tick,emit} from '../src/simulation/game.js';
import {readFile} from 'node:fs/promises';
import {Scene,Vector3,PerspectiveCamera} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {vec4} from 'three/tsl';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
import {createNativeInitialIdleBodyGpuMotion} from '../src/rendering/native-initial-idle-body-gpu-motion.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} initial ${mode} prepares reversibly on its original actor and geometry`,async()=>{
 const f=await nativeInitialIdleBodyGraphicsFixture({mode,profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),rng=f.nativeState.rng,worker=structuredClone(f.worker);part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge});assert(part.valid());assert.equal(f.roster.get(f.actor),actor);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
  part.activate();assert(part.valid());part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}
  part.activate();const data=f.commit();assert(part.validateCommit(data));part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);assert.equal(f.carries,0);assert.deepEqual(f.errors,[]);assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);
  for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);
 }finally{part?.cancel();f.close();}
});

test('a genuine TaskStart takes over the prepared initial body on the same roster without another actor',async()=>{
 const f=await nativeInitialIdleBodyGraphicsFixture({mode:'watch'});let part,next;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge});part.activate();const data=f.commit();part.finalize(data);f.sync();f.flush();
  const p=f.point(6,0),plant=createPlant(`plant-${f.nativeState.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.nativeState.plants.push(plant);emit(f.nativeState,'CropPlaced',{targetId:plant.id});enqueue(f.nativeState,f.worker.centerId,'harvest',plant.id);tick(f.nativeState,.1,f.nav);f.sync();
  const r=data.nativeInitialIdleBodyBinding.reference,q=r.sourceRequest,prepared=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:r.bodyId,radius:q.pose.radius,urgent:false,runRemaining:q.pose.runRemaining,runPhase:q.pose.runPhase,walkPhase:q.pose.walkPhase,carryPhase:q.pose.carryPhase});assert.equal(prepared.status,'proposed');const support=f.terrain.prepareNativeTaskStartProposal(prepared.proposal,{terrainManifest:f.manifest});assert(support?.valid());
  next=await f.roster.prepareNativeTaskStartProposal(support,{getPickTime:()=>prepared.proposal.startTime});next.activate();next.rollback();assert(next.valid());next.activate();assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);const committed={nativeTaskStartBinding:f.planner.nativeTaskStartBinding(f.actor),resources:{kind:14,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(prepared.proposal.expectedRouteHandle)}};next.finalize(committed);f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);for(const item of before)assert.equal(item.mesh.geometry,item.geometry);assert.equal(f.roster.releaseNativeInitialIdleBody(f.actor,data.nativeInitialIdleBodyBinding),false);assert.deepEqual(f.errors,[]);
 }finally{next?.cancel();part?.cancel();f.close();}
});

for(const mode of ['rest','watch'])test(`expired initial ${mode} prepares actual Home from the same roster body and restores it on rollback`,async()=>{
 const f=await nativeInitialIdleBodyGraphicsFixture({mode});let part,home;try{
  const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge});part.activate();part.finalize(f.commit());f.sync();f.flush();f.worker.contractDay=f.nativeState.day-1;tick(f.nativeState,.1,f.nav);f.sync();const prepared=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(prepared.status,'proposed');const support=f.terrain.prepareNativeHomeRouteProposal(prepared.proposal,{terrainManifest:f.manifest});assert(support?.valid());home=await f.roster.prepareNativeHomeRouteProposal(support,{getPickTime:()=>prepared.proposal.startTime});assert(home.valid());home.activate();home.rollback();assert(home.valid());assert.equal(f.roster.get(f.actor),actor);home.activate();assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.proposal.ticket.ticket),1);home.finalize({nativeHomeRouteBinding:f.planner.nativeHomeRouteBinding(f.actor),resources:{kind:18,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(prepared.proposal.expectedRouteHandle)}});f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{home?.cancel();part?.cancel();f.close();}
});

for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} native held ${mode} phases match original CPU skinning at submitted ages`,async()=>{
 const f=await nativeInitialIdleBodyGraphicsFixture({profile:profile.id,mode}),asset=await actorAsset(f.bakes.get('Walk_Skip').meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile.id],motion=createNativeInitialIdleBodyGpuMotion({actorId:f.actor,support:f.support});let gpuActor,cpuActor,variant,age=0;
 // Local skinning oracle only. The source reference is genuine; world/body
 // placement and ownership are exercised by the roster and retained vertical.
 const make=async()=>{const entity={...structuredClone(f.worker),x:0,z:0,heading:0},state={workers:[entity],tasks:[],elapsed:10},model=clone(asset.scene),actor=await createWebGpuConfirmedWorker({scene:new Scene(),residency:{get:()=>null},state,actorId:f.actor,presentationWorkerHeadings:new Map([[f.actor,0]]),renderer:f.renderer,assetBank:{async acquire(){return {model,clips:prepareWorkerClips(asset.animations),library,release(){}};}}});actor.root.visible=true;return {actor,model};};
 try{
  const gpu=await make(),cpu=await make();gpuActor=gpu.actor;cpuActor=cpu.actor;const admission={async prepare(){},async prepareAndPublish(_r,_o,publish){publish();}};await gpu.actor.installBakedWalk(f.bakes.get('Walk_Skip'),{pipelineAdmission:admission});if(mode==='watch')await gpu.actor.installBakedAlert(f.bakes.get('Alert'),{pipelineAdmission:admission});else await gpu.actor.installBakedIdle(f.bakes.get('Idle'),{pipelineAdmission:admission});gpu.actor.root.visible=true;
  const phases={clipNames:motion.clipNames,clipNode:motion.clipNode,resolve:motion.resolve,sampleClip:()=>motion.sampleClip(age),sampleForClip:(clip,duration)=>motion.sampleForClip(age,clip,duration)};variant=gpu.actor.prepareNativeMotionVariant(phases,{clipBakes:[f.bakes.get('Idle'),f.bakes.get('Alert')],clip:mode==='watch'?'Alert':'Idle'});variant.activate();let maximum=0;
  for(const value of [0,Math.fround(.1),8192]){age=value;cpu.actor.update();cpu.actor.root.updateMatrixWorld(true);gpu.actor.root.updateMatrixWorld(true);const restore=variant.preparePick(),proxies=[];gpu.actor.root.traverse(n=>{if(n.isMesh&&n.visible&&n.userData.wgCpuPickProxy)proxies.push(n);});
   try{cpu.model.traverse(source=>{if(!source.isSkinnedMesh)return;const original=gpu.model.getObjectByName(source.name),proxy=proxies.find(n=>n.geometry.index===original.geometry.index);assert(proxy);for(let i=0;i<source.geometry.attributes.position.count;i+=Math.max(1,Math.floor(source.geometry.attributes.position.count/40))){const a=source.getVertexPosition(i,new Vector3()).applyMatrix4(source.matrixWorld),b=proxy.getVertexPosition(i,new Vector3()).applyMatrix4(proxy.matrixWorld);maximum=Math.max(maximum,a.distanceTo(b));}});}finally{restore();}
  }assert(maximum<.02,`Held ${mode} pose error ${maximum}`);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.errors,[]);
 }finally{variant?.dispose();gpuActor?.dispose();cpuActor?.dispose();motion.dispose();f.close();}
});

test('original held Idle/Alert color and shadow programs retain both banks and their typed body clock',async()=>{
 const f=await nativeInitialIdleBodyGraphicsFixture({mode:'watch'}),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;
 try{
  part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge});let tags=0;
  const verify=builder=>{builder.build();const textures=new Set([...builder.vertexShader.matchAll(/textureLoad\(\s*([A-Za-z0-9_]+)/g)].map(match=>match[1]));assert(textures.size>=2);for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const uniform of binding.uniforms??[]){const tag=uniform.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeInitialIdleBody){tags++;assert.deepEqual(tag.nativeInitialIdleBody,f.proposal.nativeInitialIdleBody);assert.equal(tag.nativeAction,undefined);assert.equal(tag.nativeSettlement,undefined);}}};
  for(const {mesh,material} of part.request.options.materialAlternatives){const before=mesh.material;try{mesh.material=material;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();verify(builder);
    const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);const saved=object.material;try{object.material=selected;const pass=gpu.backend.createNodeBuilder(object,gpu);pass.scene=scene;pass.camera=new PerspectiveCamera();verify(pass);}finally{object.material=saved;}}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
   }finally{mesh.material=before;}}
  assert(tags>0);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
