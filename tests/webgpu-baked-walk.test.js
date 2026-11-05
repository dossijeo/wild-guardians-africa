import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AnimationMixer,Box3,Group,Matrix4,Raycaster,Scene,Vector3,Vector4} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createBakedWalkNodes,createBakedWalkPresentation,createBakedWalkTexture,sharedBakedWalkGraph} from '../src/rendering/webgpu-baked-walk.js';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareAnimalClips} from '../src/rendering/animal-actions.js';
import {createWebGpuConfirmedAnimal} from '../src/rendering/webgpu-confirmed-animal.js';

test('a live real rig remains unchanged until its walking alternative is admitted',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/content/gpu-walk/hyena/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/content/gpu-walk/hyena/walking.bin',import.meta.url)),bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),scene=new Scene(),model=asset.scene,originals=[];
 model.traverse(node=>{if(node.isSkinnedMesh)originals.push(node);});const game={elapsed:.3,raid:{animals:[{id:'a',species:'hyena',status:'walking',x:.2,z:.2}]}},renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},assetBank={async acquire(){return {model,clips:prepareAnimalClips(asset.animations),release(){}};}},actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state:game,actorId:'a',renderer,assetBank});
 const before=originals.map(mesh=>mesh.visible);let finish;const pending=actor.installBakedWalk(bake,{pipelineAdmission:{prepare(_root,{include}){assert.equal(include.length,originals.length*2);return new Promise(resolve=>{finish=resolve;});}}});assert.deepEqual(originals.map(mesh=>mesh.visible),before);assert.equal(actor.isBakedWalking(),false);finish();assert.equal(await pending,true);assert.equal(actor.isBakedWalking(),true);assert.ok(originals.every(mesh=>!mesh.visible));actor.dispose();bake.dispose();
});

test('real hyena picking pose stays close to the baked shader at samples and midpoints',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url)),bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),root=new Group();root.add(asset.scene);root.updateMatrixWorld(true);const mixer=new AnimationMixer(asset.scene),clip=prepareAnimalClips(asset.animations).find(c=>c.name==='Walking');assert.ok(clip);const action=mixer.clipAction(clip).play();action.paused=true;const meshes=[];asset.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});let max=0;
 for(const frame of Array.from({length:meta.frames-1},(_,i)=>i))for(const midpoint of [false,true]){const t=midpoint?(meta.sampleTimes[frame]+meta.sampleTimes[frame+1])/2:meta.sampleTimes[frame];action.time=t;mixer.update(0);root.updateMatrixWorld(true);for(const mesh of meshes){const inverse=new Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld).invert(),pos=mesh.geometry.attributes.position,index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;for(let i=0;i<pos.count;i+=Math.max(1,Math.floor(pos.count/100))){const input=new Vector4(pos.getX(i),pos.getY(i),pos.getZ(i),1).applyMatrix4(mesh.bindMatrix),output=new Vector4(0,0,0,0);for(let k=0;k<4;k++){const bone=index.getComponent(i,k),w=weight.getComponent(i,k),read=row=>new Matrix4().fromArray(bake.texture.image.data,(row*bake.bones.length+bone)*16),a=read(frame),b=read(frame+1);if(midpoint)for(let n=0;n<16;n++)a.elements[n]=(a.elements[n]+b.elements[n])/2;const v=input.clone().applyMatrix4(a).multiplyScalar(w);output.add(v);}output.applyMatrix4(inverse);const actual=mesh.getVertexPosition(i,new Vector3());max=Math.max(max,actual.distanceTo(new Vector3(output.x,output.y,output.z)));}}}
 bake.dispose();assert.ok(max<.04,`Maximum local position difference: ${max}`);
});

test('hyena walking bake packs the canonical shared matrices for TSL',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url)));
 const bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url));
 const input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),bake=createBakedWalkTexture(meta,input);
 assert.equal(bake.texture.image.width,bake.bones.length*4);assert.equal(bake.texture.image.height,meta.frames);
 const source=new Float32Array(input),output=bake.texture.image.data,offset=meta.channels[0].matrixOffset;
 for(let frame=0;frame<meta.frames;frame++)assert.deepEqual(output.subarray(frame*bake.bones.length*16,(frame+1)*bake.bones.length*16),source.subarray(frame*meta.strideFloats+offset,frame*meta.strideFloats+offset+bake.bones.length*16));
 const nodes=createBakedWalkNodes(bake,{bindMatrix:new Matrix4(),canonicalMeshInverse:new Matrix4()});assert.ok(nodes.position.isNode&&nodes.normal.isNode&&nodes.phase.isNode);
 assert.throws(()=>createBakedWalkTexture({...meta,byteLength:0},input));
 assert.throws(()=>createBakedWalkTexture({...meta,channels:[meta.channels[0],{...meta.channels[0],matrixOffset:0}]},input));
 const shifted=structuredClone(meta);shifted.sampleTimes[1]+=.001;assert.throws(()=>createBakedWalkTexture(shifted,input),/Unsupported/);
 const duplicate=structuredClone(meta);duplicate.channels[1].name=duplicate.channels[0].name;assert.throws(()=>createBakedWalkTexture(duplicate,input),/Unsupported/);
 const originalTime=bake.meta.sampleTimes[1],originalBone=bake.bones[0];meta.sampleTimes[1]+=.001;meta.channels[0].bones[0]='changed';assert.equal(bake.meta.sampleTimes[1],originalTime);assert.equal(bake.bones[0],originalBone);assert.ok(Object.isFrozen(bake.meta.sampleTimes));
 bake.dispose();
});

test('walking texture contract accepts known species and rejects unknown species',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url)),input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 for(const species of Object.keys(ANIMAL_ACTIONS.animals)){const bake=createBakedWalkTexture({...meta,species},input);assert.equal(bake.meta.species,species);bake.dispose();}assert.throws(()=>createBakedWalkTexture({...meta,species:'unknown'},input),/Invalid/);
});

test('real hyena rig retains original meshes for physical fallback',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url));
 const bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),root=new Group();root.add(asset.scene);
 const originals=[];let registered=0,released=0;asset.scene.traverse(o=>{if(o.isSkinnedMesh){originals.push(o);for(const material of Array.isArray(o.material)?o.material:[o.material])material._wgRegisterReplica=()=>{registered++;return ()=>released++;};}});
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},presentation=createBakedWalkPresentation({model:asset.scene,root,renderer,bake});
 presentation.set(.25);assert.ok(originals.every(o=>!o.visible));const admissionObjects=presentation.admissionObjects();assert.equal(admissionObjects.length,8);assert.ok(originals.every(mesh=>admissionObjects.includes(mesh)));let mirrors=0;asset.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.visible)mirrors++;});assert.equal(mirrors,4);
 const restore=presentation.preparePick();let proxies=0;const pickMeshes=[];asset.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.visible){proxies++;pickMeshes.push(o);assert.ok(o.geometry.boundingSphere);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.equal(proxies,4);root.updateMatrixWorld(true);const bounds=new Box3();for(const mesh of pickMeshes)bounds.expandByObject(mesh);const center=bounds.getCenter(new Vector3()),ray=new Raycaster(center.clone().add(new Vector3(0,0,10)),new Vector3(0,0,-1));assert.ok(ray.intersectObjects(pickMeshes).length>0);restore();assert.ok(presentation.isEnabled());assert.ok(pickMeshes.every(mesh=>!mesh.visible));
 presentation.disable();assert.ok(originals.every(o=>o.visible));presentation.dispose();assert.ok(registered>0);assert.equal(released,registered);bake.dispose();
});

test('two real hyena rigs share a confirmed clock while preserving phase and fallback',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url));
 const bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),clock=createConfirmedPresentationClock(10),renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},models=[clone(asset.scene),clone(asset.scene)],presentations=models.map(model=>{const root=new Group();root.add(model);return createBakedWalkPresentation({model,root,renderer,bake,confirmedClock:clock});});
 try{for(const [i,p] of presentations.entries()){const phase=i?.31:.25;p.set(phase);const status=p.status();assert.equal(status.clockWeight,1);assert.ok(Math.abs(Math.fround(Math.fround(clock.elapsed)+Math.fround(status.phaseOffset))-phase)<.0001);}
  const meshes=presentations.map(p=>p.admissionObjects().filter(object=>!object.isSkinnedMesh)),first=meshes[0][0].material,second=meshes[1][0].material;assert.notEqual(first,second);assert.equal(first.positionNode,second.positionNode);assert.equal(first.positionNode.getCacheKey(),second.positionNode.getCacheKey());assert.equal(first.customProgramCacheKey(),second.customProgramCacheKey());assert.notEqual(first._wgWalkPhaseOffset,second._wgWalkPhaseOffset);const graph=sharedBakedWalkGraph(bake,clock),frame=new NodeFrame();assert.equal(graph.position,first.positionNode);for(const [index,material] of [first,second].entries()){frame.material=material;frame.object=meshes[index][0];for(const ref of Object.values(graph.references)){frame.updateNode(ref);assert.equal(ref.node.value,material[ref.property]);}assert.ok(material._wgWalkBindMatrix.isMatrix4);assert.ok(material._wgWalkInverse.isMatrix4);assert.equal(material._wgWalkClockWeight,1);assert.equal(material._wgWalkFrames,meta.frames);}
  assert.ok(presentations.every(p=>p.status().confirmedClock));
  clock.commit(10);assert.equal(clock.node.value,10);clock.commit(10.05);const secondPhase=second._wgWalkPhaseOffset,program=first.customProgramCacheKey();presentations[0].set(.3);assert.equal(second._wgWalkPhaseOffset,secondPhase);assert.equal(first.customProgramCacheKey(),program);assert.ok(Math.abs(Math.fround(Math.fround(clock.elapsed)+Math.fround(presentations[0].status().phaseOffset))-.3)<.0001);
  presentations[0].disable();assert.equal(presentations[0].isEnabled(),false);presentations[0].set(.4);assert.equal(presentations[0].isEnabled(),true);
  clock.commit(1e8);presentations[1].set(.25);assert.equal(presentations[1].status().clockWeight,0);assert.equal(presentations[1].status().phaseOffset,.25);
 }finally{for(const p of presentations)p.dispose();clock.dispose();bake.dispose();}
});
