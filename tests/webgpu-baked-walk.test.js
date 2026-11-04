import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Matrix4} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createBakedWalkNodes,createBakedWalkPresentation,createBakedWalkTexture} from '../src/rendering/webgpu-baked-walk.js';

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
 presentation.disable();assert.ok(originals.every(o=>o.visible));presentation.dispose();bake.dispose();
});
