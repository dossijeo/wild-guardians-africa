import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {residentMaterialTextures,prepareResidentTextures} from '../tools/experiments/prepare-resident-textures.js';

test('resident scan includes hidden materials, deduplicates shared maps and excludes render-target ownership',()=>{
 const scene=new THREE.Scene(),map=new THREE.Texture(),target=new THREE.WebGLRenderTarget(1,1);
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({map}));mesh.visible=false;scene.add(mesh);
 scene.add(new THREE.Mesh(new THREE.BufferGeometry(),new THREE.ShaderMaterial({uniforms:{maps:{value:[map,target.texture]}}})));
 assert.deepEqual(residentMaterialTextures(scene),[map]);
 target.dispose();
});
test('uploads yield one texture at a time without disposing borrowed textures',async()=>{
 const textures=[new THREE.Texture(),new THREE.Texture()],calls=[];
 for(const texture of textures)texture.dispose=()=>assert.fail('borrowed texture disposed');
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.BufferGeometry(),textures.map(map=>new THREE.MeshBasicMaterial({map}))));
 const world={scene,loading:new AbortController(),renderer:{initTexture(texture){calls.push(texture);}}};
 await prepareResidentTextures(world,{nextFrame:async()=>calls.push('frame')});
 assert.deepEqual(calls,['frame',textures[0],'frame',textures[1]]);
});
test('cancellation while yielding prevents any texture upload',async()=>{
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({map:new THREE.Texture()})));
 const world={scene,loading:new AbortController(),renderer:{initTexture(){assert.fail('upload after cancellation');}}};
 await assert.rejects(prepareResidentTextures(world,{nextFrame:async()=>world.loading.abort()}),/cancelled/);
});
