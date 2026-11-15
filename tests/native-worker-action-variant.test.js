import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {Scene,Vector3,PerspectiveCamera} from 'three';
import {MeshStandardNodeMaterial,NodeMaterial,WebGPURenderer} from 'three/webgpu';
import {uniform,vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {loadBakedWorkerWalkAsset,BAKED_WORKER_WALK_PROFILES} from '../src/rendering/baked-worker-walk-catalog.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
import {createConfirmedGpuMotion} from '../src/rendering/confirmed-gpu-motion.js';
import {bindWebGpuActorMotion} from '../src/rendering/webgpu-actor-motion-binding.js';
import {PROFILES} from '../src/simulation/workforce.js';

const fetcher=async url=>{const bytes=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
const admission={prepare:async()=>{},async prepareAndPublish(_root,_options,publish){publish();}};
async function fixture(profile='youngMale',{retireSourceBinding=false,withCarry=false}={}){
 const clips=['Walk_Skip','Harvest','Plant','Water','Idle',...(withCarry?['Carry_Crate']:[])],values=await Promise.all(clips.map(clip=>loadBakedWorkerWalkAsset(profile,{clip,fetcher,subtle:webcrypto.subtle}))),bakes=new Map(clips.map((clip,i)=>[clip,values[i]])),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile];
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},scene=new Scene();
 async function make(){const asset=await actorAsset(bakes.get('Walk_Skip').meta.source),entity={id:'w',profile,status:'walking',running:false,walkPhase:0,x:0,z:0,taskId:'t'},state={workers:[entity],tasks:[{id:'t',kind:'initial'}],elapsed:0},model=asset.scene,actor=await createWebGpuConfirmedWorker({scene,residency:{get:()=>null},state,actorId:'w',renderer,assetBank:{async acquire(){return {model,clips:prepareWorkerClips(asset.animations),library,release(){}};}}});actor.root.visible=true;return {actor,entity,state,model};}
 const gpu=await make(),cpu=await make();let oldMotion,oldBinding;
 if(retireSourceBinding){oldMotion=createConfirmedGpuMotion({actorId:'w',clock:uniform(0)});oldMotion.bootstrap({at:0,x:0,y:0,z:0});oldBinding=bindWebGpuActorMotion({root:gpu.actor.root,renderer,motion:oldMotion,actorId:'w',getPickTime:()=>0});}
 await gpu.actor.installBakedWalk(bakes.get('Walk_Skip'),{pipelineAdmission:admission,...(oldBinding?{motionBinding:oldBinding}:{})});oldBinding?.dispose();oldMotion?.dispose();
 gpu.actor.root.visible=true;assert.equal(gpu.actor.isBakedWalking(),true);
 return {gpu,cpu,bakes,scene,renderer,speed:PROFILES.find(p=>p.id===profile).speed,close(){gpu.actor.dispose();cpu.actor.dispose();for(const bake of values)bake.dispose();}};
}
function phases(names){
 const clipNode=uniform(0),phase=uniform(0),canonical=[...names];
 return {clipNames:[...names],clipNode,phase,resolve:()=>phase,sampleForClip:()=>phase.value,sampleClip:()=>canonical[clipNode.value]};
}
function prepare(f,names){const source=phases(names),variant=f.gpu.actor.prepareNativeMotionVariant(source,{clipBakes:names.map(name=>f.bakes.get(name))});return {source,variant};}
function visibleMeshes(root){const result=[];root.traverse(node=>{if(node.isMesh&&node.visible&&node.userData.wgCpuPickProxy)result.push(node);});return result;}
function comparePose(f,variant,source,clip,time){
 source.clipNode.value=source.clipNames.indexOf(clip);source.phase.value=time;
 const cpu=f.cpu;cpu.entity.status=clip==='Idle'?'idle':'acting';cpu.state.tasks[0].kind=clip==='Harvest'?'harvest':'initial';
 if(clip==='Idle')cpu.entity.idleState={mode:'rest',elapsed:time};
 else cpu.entity.actionRemaining=(clip==='Harvest'?3.6-time*3.6/f.bakes.get(clip).meta.duration:7.2-(clip==='Water'?3.8:0)-time)/f.speed;
 cpu.actor.update();cpu.actor.root.updateMatrixWorld(true);f.gpu.actor.root.updateMatrixWorld(true);
 const restore=variant.preparePick();let maximum=0;
 try{
  const proxies=visibleMeshes(f.gpu.actor.root),skinned=[];cpu.model.traverse(node=>{if(node.isSkinnedMesh)skinned.push(node);});
  for(const mesh of skinned){const gpuSource=f.gpu.model.getObjectByName(mesh.name),proxy=proxies.find(node=>node.geometry.index===gpuSource.geometry.index);assert(proxy);
   for(let i=0;i<mesh.geometry.attributes.position.count;i+=Math.max(1,Math.floor(mesh.geometry.attributes.position.count/48))){const a=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld),b=proxy.getVertexPosition(i,new Vector3()).applyMatrix4(proxy.matrixWorld);maximum=Math.max(maximum,a.distanceTo(b));}
  }
  const tools=variant.materialAlternatives.filter(item=>item.mesh._wgWalkAttachmentIndex!==undefined);
  for(const {mesh} of tools){const proxy=proxies.find(node=>node.geometry===mesh.geometry);if(clip!=='Water'){assert.equal(proxy,undefined);continue;}assert(proxy);const original=cpu.model.getObjectByName(f.bakes.get('Water').meta.attachments[mesh._wgWalkAttachmentIndex].name);
   for(let i=0;i<mesh.geometry.attributes.position.count;i+=Math.max(1,Math.floor(mesh.geometry.attributes.position.count/12))){const a=original.getVertexPosition(i,new Vector3()).applyMatrix4(original.matrixWorld),b=proxy.getVertexPosition(i,new Vector3()).applyMatrix4(proxy.matrixWorld);maximum=Math.max(maximum,a.distanceTo(b));}
  }
  assert(maximum<.02,`${clip} pose error ${maximum}`);
 }finally{restore();}
 return maximum;
}

for(const profile of BAKED_WORKER_WALK_PROFILES)test(`${profile}: prepared actions reuse admitted body geometry and select original Plant/Water tools for picking`,async()=>{
 const f=await fixture(profile,{retireSourceBinding:true});let variant;
 try{const before=f.gpu.actor.admissionObjects().filter(node=>!node.isSkinnedMesh),geometry=new Map(before.map(mesh=>[mesh,mesh.geometry])),names=['Plant','Water','Idle'],prepared=prepare(f,names);variant=prepared.variant;
  const body=variant.materialAlternatives.filter(item=>item.mesh._wgWalkAttachmentIndex===undefined),tools=variant.materialAlternatives.filter(item=>item.mesh._wgWalkAttachmentIndex!==undefined);
  assert(body.length);assert.equal(tools.length,6);for(const {mesh} of body){assert(geometry.has(mesh));assert.equal(mesh.geometry,geometry.get(mesh));}for(const {mesh} of tools)assert.equal(mesh.geometry,f.gpu.model.getObjectByName(f.bakes.get('Water').meta.attachments[mesh._wgWalkAttachmentIndex].name).geometry);
  assert(variant.valid());assert(tools.every(item=>!item.mesh.visible));variant.activate();assert(variant.current());
  for(const [clip,time] of [['Plant',.3],['Water',.6],['Idle',.4],['Plant',1.1]])comparePose(f,variant,prepared.source,clip,time);
  variant.rollbackActivation();assert(variant.valid());assert.equal(f.gpu.actor.isBakedWalking(),true);assert(tools.every(item=>!item.mesh.visible));
 }finally{variant?.dispose();f.close();}
});

test('a Harvest variant samples its resident bake on the existing body and leaves no tool meshes',async()=>{
 const f=await fixture();let variant;
 try{const prepared=prepare(f,['Harvest']);variant=prepared.variant;assert(variant.materialAlternatives.every(item=>item.mesh._wgWalkAttachmentIndex===undefined));variant.activate();for(const time of [.2,1.1,2.9])comparePose(f,variant,prepared.source,'Harvest',time);variant.rollbackActivation();}finally{variant?.dispose();f.close();}
});

test('action variants compile body and conditional tools for both color and original shadow passes',async()=>{
 const f=await fixture(),prepared=prepare(f,['Plant','Water','Idle']),variant=prepared.variant,gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;
 try{const body=variant.materialAlternatives.find(item=>item.mesh._wgWalkAttachmentIndex===undefined),tool=variant.materialAlternatives.find(item=>item.mesh._wgWalkAttachmentIndex!==undefined);assert(body&&tool);
  for(const alternative of [body,tool]){const saved=alternative.mesh.material;try{alternative.mesh.material=alternative.material;const builder=gpu.backend.createNodeBuilder(alternative.mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);assert.match(builder.vertexShader,/select|if\s*\(/);
   const shadowScene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);shadowScene.overrideMaterial=shadow;let seen=false;
   Renderer.prototype.renderObject.call({_handleObjectFunction(object,material){seen=true;assert.equal(material.positionNode,alternative.material.positionNode);const old=object.material;try{object.material=material;const pass=gpu.backend.createNodeBuilder(object,gpu);pass.scene=shadowScene;pass.camera=new PerspectiveCamera();pass.build();assert.match(pass.vertexShader,/textureLoad/);assert.match(pass.vertexShader,/select|if\s*\(/);}finally{object.material=old;}}},alternative.mesh,shadowScene,{},alternative.mesh.geometry,alternative.material,null,null);assert(seen);
  }finally{alternative.mesh.material=saved;}}
 }finally{variant.dispose();f.close();}
});

test('a cancelled action replacement hides its new tools and restores the previous prepared selection',async()=>{
 const f=await fixture();let old,next;
 try{old=prepare(f,['Plant','Water','Idle']);old.variant.activate();const tools=old.variant.materialAlternatives.filter(item=>item.mesh._wgWalkAttachmentIndex!==undefined);assert(tools.every(item=>item.mesh.visible));next=prepare(f,['Harvest']);assert(next.variant.valid());next.variant.activate();assert(!old.variant.current());assert(tools.every(item=>!item.mesh.visible));next.variant.rollbackActivation();assert(old.variant.current());assert(tools.every(item=>item.mesh.visible));comparePose(f,old.variant,old.source,'Water',.7);old.variant.rollbackActivation();}finally{next?.variant.dispose();old?.variant.dispose();f.close();}
});

test('incomplete or incompatible action catalogs fail before changing the admitted presentation',async()=>{
 const f=await fixture();try{const before=[];f.gpu.actor.root.traverse(node=>before.push(node));
  for(const [source,clips] of [[phases(['Plant','Water']),[f.bakes.get('Plant')]],[phases(['Plant']),[f.bakes.get('Plant'),f.bakes.get('Plant')]],[phases(['fake']),[f.bakes.get('Plant')]],[{...phases(['Plant']),clipNode:null},[f.bakes.get('Plant')]],[phases(['Plant']),[{...f.bakes.get('Plant'),meta:{...f.bakes.get('Plant').meta,sourceSha256:'foreign'}}]]])assert.throws(()=>f.gpu.actor.prepareNativeMotionVariant(source,{clipBakes:clips}));
  const after=[];f.gpu.actor.root.traverse(node=>after.push(node));assert.deepEqual(after,before);assert.equal(f.gpu.actor.isBakedWalking(),true);
 }finally{f.close();}
});

test('discarding a prepared tool variant removes only its candidate meshes and keeps the body available',async()=>{
 const f=await fixture();try{const before=[];f.gpu.actor.root.traverse(node=>before.push(node));const {variant}=prepare(f,['Plant','Water','Idle']);assert(variant.valid());variant.dispose();variant.dispose();const after=[];f.gpu.actor.root.traverse(node=>after.push(node));assert.deepEqual(after,before);assert.equal(f.gpu.actor.isBakedWalking(),true);const next=prepare(f,['Harvest']);assert(next.variant.valid());next.variant.dispose();}finally{f.close();}
});

test('retiring the active action restores original tool visibility for subsequent ordinary presentation',async()=>{
 const f=await fixture();let variant;
 try{const attachments=f.bakes.get('Water').meta.attachments.map(value=>f.gpu.model.getObjectByName(value.name)),before=attachments.map(node=>node.visible);({variant}=prepare(f,['Plant','Water','Idle']));variant.activate();assert(attachments.every(node=>!node.visible));variant.deactivate();assert.deepEqual(attachments.map(node=>node.visible),before);variant.dispose();assert.deepEqual(attachments.map(node=>node.visible),before);
  f.gpu.entity.status='acting';f.gpu.state.tasks[0].kind='water';f.gpu.entity.actionRemaining=2/f.speed;f.gpu.actor.update();assert(attachments.every(node=>node.visible));
 }finally{variant?.dispose();f.close();}
});

test('mutating a candidate tool mesh prevents its variant from being activated',async()=>{
 const f=await fixture();let variant;
 try{({variant}=prepare(f,['Plant','Water','Idle']));const tool=variant.materialAlternatives.find(item=>item.mesh._wgWalkAttachmentIndex!==undefined),body=variant.materialAlternatives.find(item=>item.mesh._wgWalkAttachmentIndex===undefined);tool.mesh.geometry=body.mesh.geometry;assert.equal(variant.valid(),false);assert.throws(()=>variant.activate(),/changed/);assert.equal(f.gpu.actor.isBakedWalking(),true);
 }finally{variant?.dispose();f.close();}
});

test('the existing scoped motion binding atomically installs and rolls back body plus action tools',async()=>{
 const f=await fixture();let oldVariant,next,oldBinding,nextBinding;const oldMotion=createConfirmedGpuMotion({actorId:'w',clock:uniform(0)}),nextMotion=createConfirmedGpuMotion({actorId:'w',clock:uniform(0)});
 try{oldMotion.bootstrap({at:0,x:0,y:0,z:0});nextMotion.bootstrap({at:0,x:0,y:0,z:0});oldVariant=f.gpu.actor.prepareNativeMotionVariant({resolve:()=>uniform(0),sampleForClip:()=>0});oldBinding=bindWebGpuActorMotion({root:f.gpu.actor.root,renderer:f.renderer,motion:oldMotion,actorId:'w',getPickTime:()=>0,staged:true,materialAlternatives:oldVariant.materialAlternatives,replicaSources:oldVariant.replicaSources,meshes:oldVariant.materialAlternatives.map(item=>item.mesh)});oldVariant.activate();oldBinding.activate();assert(oldBinding.current());
  next=prepare(f,['Plant','Water','Idle']);nextBinding=oldBinding.prepareReplacement({motion:nextMotion,getPickTime:()=>0,materialAlternatives:next.variant.materialAlternatives,replicaSources:next.variant.replicaSources,meshes:next.variant.materialAlternatives.map(item=>item.mesh)});assert(nextBinding.canActivate());next.variant.activate();nextBinding.activate();assert(nextBinding.current());comparePose(f,next.variant,next.source,'Water',.7);nextBinding.rollbackActivation();next.variant.rollbackActivation();assert(oldBinding.current());assert(oldVariant.current());
 }finally{nextBinding?.dispose();next?.variant.dispose();oldBinding?.dispose();oldVariant?.dispose();nextMotion.dispose();oldMotion.dispose();f.close();}
});

test('retiring an older tool variant preserves its successor and the successor can restore the original tools',async()=>{
 const f=await fixture();let old,next;
 try{const attachments=f.bakes.get('Water').meta.attachments.map(value=>f.gpu.model.getObjectByName(value.name)),before=attachments.map(node=>node.visible);old=prepare(f,['Plant','Water','Idle']);old.variant.activate();next=prepare(f,['Harvest']);next.variant.activate();old.variant.dispose();assert(next.variant.current());assert(attachments.every(node=>!node.visible));next.variant.deactivate();assert.deepEqual(attachments.map(node=>node.visible),before);
 }finally{next?.variant.dispose();old?.variant.dispose();f.close();}
});


test('a Carry candidate can restore the previous action, native binding and authored box visibility without replacing its actor',async()=>{
 const f=await fixture('youngMale',{withCarry:true});let old,next,oldBinding,nextBinding;const oldMotion=createConfirmedGpuMotion({actorId:'w',clock:uniform(0)}),nextMotion=createConfirmedGpuMotion({actorId:'w',clock:uniform(0)});
 try{f.gpu.entity.walkPhase=.375;f.gpu.actor.update();f.gpu.actor.root.visible=true;oldMotion.bootstrap({at:0,x:0,y:0,z:0});nextMotion.bootstrap({at:0,x:0,y:0,z:0});old=prepare(f,['Harvest']);oldBinding=bindWebGpuActorMotion({root:f.gpu.actor.root,renderer:f.renderer,motion:oldMotion,actorId:'w',getPickTime:()=>0,staged:true,materialAlternatives:old.variant.materialAlternatives,replicaSources:old.variant.replicaSources,meshes:old.variant.materialAlternatives.map(i=>i.mesh)});old.variant.activate();oldBinding.activate();
  await f.gpu.actor.installBakedCarry(f.bakes.get('Carry_Crate'),{pipelineAdmission:admission,motionBinding:oldBinding});assert(old.variant.current());assert(oldBinding.current());assert.equal(f.gpu.actor.isBakedCarrying(),false);
  const root=f.gpu.actor.root,before=[];root.traverse(mesh=>{if(mesh.isMesh)before.push({mesh,geometry:mesh.geometry,material:mesh.material,visible:mesh.visible,phaseOffset:mesh._wgWalkPhaseOffset,clockWeight:mesh._wgWalkClockWeight});});
  next=f.gpu.actor.prepareNativeMotionVariant({resolve:()=>uniform(0),sampleForClip:()=>0},{clip:'Carry_Crate'});const box=next.materialAlternatives.filter(i=>i.mesh._wgWalkAttachmentIndex!==undefined);assert.equal(box.length,9);
  nextBinding=oldBinding.prepareReplacement({motion:nextMotion,getPickTime:()=>0,materialAlternatives:next.materialAlternatives,replicaSources:next.replicaSources,meshes:next.materialAlternatives.map(i=>i.mesh)});assert(nextBinding.canActivate());next.activate();nextBinding.activate();assert(next.current());assert(nextBinding.current());assert.equal(f.gpu.actor.isBakedWalking(),false);assert.equal(f.gpu.actor.isBakedCarrying(),true);assert(box.every(i=>i.mesh.visible));
  nextBinding.rollbackActivation();next.rollbackActivation();assert(old.variant.current());assert(oldBinding.current());assert.equal(f.gpu.actor.root,root);assert.equal(f.gpu.actor.isBakedWalking(),true);assert.equal(f.gpu.actor.isBakedCarrying(),false);assert(box.every(i=>!i.mesh.visible));for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh._wgWalkPhaseOffset,item.phaseOffset);assert.equal(item.mesh._wgWalkClockWeight,item.clockWeight);assert.equal(item.mesh.visible,item.visible,JSON.stringify({name:item.mesh.name,attachment:item.mesh._wgWalkAttachmentIndex,index:before.indexOf(item)}));}
  assert(next.valid());next.activate();nextBinding.activate();assert(next.current());assert(nextBinding.current());
 }finally{nextBinding?.dispose();next?.dispose();oldBinding?.dispose();old?.variant.dispose();nextMotion.dispose();oldMotion.dispose();f.close();}
});
