import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWebGpuCombatGraph,createWebGpuCombatTexture,bindWebGpuCombatSamples} from '../src/rendering/webgpu-combat-playback.js';
import {createWebGpuVfxSpriteGraph,createWebGpuVfxSpriteMaterial,bindWebGpuVfxSpriteObject} from '../src/rendering/webgpu-vfx-sprite-material.js';
import {createWebGpuVfxGeometry,webGpuVfxGeometryGraph} from '../src/rendering/webgpu-vfx-geometry.js';

test('combat sprite and changing-topology geometry share stable GPU programs across palette windows',()=>{
 const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});renderer.hasFeature=()=>true;
 const scene=new THREE.Scene(),playback=createWebGpuCombatGraph(uniform(0)),atlas=new THREE.DataTexture(new Uint8Array(4),1,1),palette=createWebGpuCombatTexture(),material=createWebGpuVfxSpriteMaterial(createWebGpuVfxSpriteGraph(atlas,null,playback.sprite)),geometry=new THREE.InstancedBufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));geometry.setAttribute('aCorner',new THREE.Float32BufferAttribute([0,0],2));for(const [name,size] of [['iPos',3],['iSize',2],['iAngle',1],['iRect',4],['iNext',4],['iColor',4],['iParams',4],['iDirection',3]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(4*size),size));
 const sprite=new THREE.Mesh(geometry,material);bindWebGpuVfxSpriteObject(sprite);bindWebGpuCombatSamples(sprite,palette);scene.add(sprite);
 const shape=createWebGpuVfxGeometry(scene,{graph:webGpuVfxGeometryGraph(playback.geometry)});shape.update(new Float32Array(33));bindWebGpuCombatSamples(shape.mesh,palette);
 const build=object=>{const builder=renderer.backend.createNodeBuilder(object,renderer);builder.scene=scene;builder.camera=new THREE.PerspectiveCamera();builder.build();return {vertex:builder.vertexShader,fragment:builder.fragmentShader};};
 try{for(const object of [sprite,shape.mesh]){const first=build(object);assert.match(first.vertex,/textureLoad/);object._wgCombatSampleStart=1.2;object._wgCombatFrames=31;assert.deepEqual(build(object),first);assert.doesNotMatch(first.fragment,/@builtin\(vertex_index\)/);}}
 finally{shape.dispose();geometry.dispose();material.dispose();atlas.dispose();palette.dispose();playback.dispose();}
});
