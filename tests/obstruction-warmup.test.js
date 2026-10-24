import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NativeAssetGroups,createSmoothObstructionMaterial} from '../src/rendering/asset-groups.js';
test('warmup borrows geometry, deduplicates materials and releases only owned resources',()=>{
 const groups=new NativeAssetGroups(new THREE.Scene());groups.smoothObstruction=true;
 const geometry=new THREE.BoxGeometry(),base=new THREE.MeshStandardMaterial();let geometryDisposals=0,baseDisposals=0;
 geometry.addEventListener('dispose',()=>geometryDisposals++);base.addEventListener('dispose',()=>baseDisposals++);
 for(const key of ['a','b']){const mesh=new THREE.InstancedMesh(geometry,base,1);mesh.receiveShadow=true;groups.colors.set(key,{mesh});}
 const warm=groups.prepareSmoothWarmup();assert.equal(warm.group.children.length,1);
 const mesh=warm.group.children[0];assert.equal(mesh.geometry,geometry);assert.equal(mesh.receiveShadow,true);assert.notEqual(mesh.material,base);
 let materialDisposals=0;mesh.material.addEventListener('dispose',()=>materialDisposals++);
 warm.dispose();warm.dispose();assert.equal(materialDisposals,1);assert.equal(geometryDisposals,0);assert.equal(baseDisposals,0);
});
test('warm and live fade material share the original recipe and custom compile callback',()=>{
 const base=new THREE.MeshStandardMaterial();base.customProgramCacheKey=()=> 'base';let calls=0;
 base.onBeforeCompile=function(shader){assert.equal(this,base);calls++;shader.fragmentShader+='\n// original';};
 const material=createSmoothObstructionMaterial(base),shader={fragmentShader:'if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}\n#include <opaque_fragment>'};
 material.onBeforeCompile(shader,{});assert.equal(calls,1);assert(!shader.fragmentShader.includes('coverageThreshold'));assert(shader.fragmentShader.includes('diffuseColor.a*=clamp'));assert.equal(material.customProgramCacheKey(),'base|native-partial-blend-v1');assert.equal(material.side,THREE.FrontSide);assert.equal(material.depthWrite,false);
});

test('warmup includes resident LOD recipes before merged groups exist',()=>{
 const groups=new NativeAssetGroups(new THREE.Scene());groups.smoothObstruction=true;
 const source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 const chunk=new THREE.Group();chunk.userData.lodBatches=[{levels:[source]}];
 const warm=groups.prepareSmoothWarmup(new Map([['0,0',chunk]]));assert.equal(warm.group.children.length,1);assert.equal(warm.group.children[0].receiveShadow,true);warm.dispose();
});
