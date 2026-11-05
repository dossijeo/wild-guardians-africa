import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AnimationMixer,Box3,Group,Matrix4,Raycaster,Vector3,Vector4} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createBakedWalkNodes,createBakedWalkPresentation,createBakedWalkTexture} from '../src/rendering/webgpu-baked-walk.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareAnimalClips} from '../src/rendering/animal-actions.js';

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
 bake.dispose();
});

test('real hyena rig retains original meshes for physical fallback',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url));
 const bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),root=new Group();root.add(asset.scene);
 const originals=[];asset.scene.traverse(o=>{if(o.isSkinnedMesh)originals.push(o);});
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},presentation=createBakedWalkPresentation({model:asset.scene,root,renderer,bake});
 presentation.set(.25);assert.ok(originals.every(o=>!o.visible));let mirrors=0;asset.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.visible)mirrors++;});assert.equal(mirrors,4);
 const restore=presentation.preparePick();let proxies=0;const pickMeshes=[];asset.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o.visible){proxies++;pickMeshes.push(o);assert.ok(o.geometry.boundingSphere);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.equal(proxies,4);root.updateMatrixWorld(true);const bounds=new Box3();for(const mesh of pickMeshes)bounds.expandByObject(mesh);const center=bounds.getCenter(new Vector3()),ray=new Raycaster(center.clone().add(new Vector3(0,0,10)),new Vector3(0,0,-1));assert.ok(ray.intersectObjects(pickMeshes).length>0);restore();assert.ok(presentation.isEnabled());assert.ok(pickMeshes.every(mesh=>!mesh.visible));
 presentation.disable();assert.ok(originals.every(o=>o.visible));presentation.dispose();bake.dispose();
});

test('two real hyena rigs share a confirmed clock while preserving phase and fallback',async()=>{
 const meta=JSON.parse(await readFile(new URL('../public/qa/gpu-bake/walking.json',import.meta.url))),bytes=await readFile(new URL('../public/qa/gpu-bake/walking.bin',import.meta.url));
 const bake=createBakedWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.hyena.url),clock=createConfirmedPresentationClock(10),renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},models=[clone(asset.scene),clone(asset.scene)],presentations=models.map(model=>{const root=new Group();root.add(model);return createBakedWalkPresentation({model,root,renderer,bake,confirmedClock:clock});});
 try{for(const [i,p] of presentations.entries()){const phase=i?.31:.25;p.set(phase);const status=p.status();assert.equal(status.clockWeight,1);assert.ok(Math.abs(Math.fround(Math.fround(clock.elapsed)+Math.fround(status.phaseOffset))-phase)<.0001);}
  assert.ok(presentations.every(p=>p.status().confirmedClock));
  clock.commit(10);assert.equal(clock.node.value,10);clock.commit(10.05);presentations[0].set(.3);assert.ok(Math.abs(Math.fround(Math.fround(clock.elapsed)+Math.fround(presentations[0].status().phaseOffset))-.3)<.0001);
  presentations[0].disable();assert.equal(presentations[0].isEnabled(),false);presentations[0].set(.4);assert.equal(presentations[0].isEnabled(),true);
  clock.commit(1e8);presentations[1].set(.25);assert.equal(presentations[1].status().clockWeight,0);assert.equal(presentations[1].status().phaseOffset,.25);
 }finally{for(const p of presentations)p.dispose();clock.dispose();bake.dispose();}
});
