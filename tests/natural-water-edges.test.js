import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareNaturalWaterBed,prepareNaturalWater,naturalWaterEdgesEnabled,balancedCanyonBankEnabled} from '../src/rendering/natural-water-edges.js';
test('natural shore owns only its texture and disposes it once',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-1,1,0,-1,0,0,1],3));
 const material=new THREE.MeshStandardMaterial();material.onBeforeCompile=()=>{};
 const world={state:{biome:'sabana'},nav:{field:{surface:()=>-.2}}};
 prepareNaturalWater(world,geometry,0,0,material);
 assert.equal(geometry.userData.naturalWaterMaterial,material);
 const shader={uniforms:{},fragmentShader:'#include <opaque_fragment>'};material.onBeforeCompile(shader,{});
 let released=0;shader.uniforms.qaBed.value.addEventListener('dispose',()=>released++);
 material.dispose();material.dispose();assert.equal(released,1);geometry.dispose();
});
test('natural shores require explicit laboratory opt-in',()=>{
 assert.equal(naturalWaterEdgesEnabled('?waterEdges=natural'),false);
 assert.equal(naturalWaterEdgesEnabled('?visualLab=global-lighting&waterEdges=natural'),true);
});

test('balanced bank is opt-in and exclusive to Canyon',()=>{
 const q='?visualLab=global-lighting&waterEdges=natural&canyonBank=balanced';
 assert.equal(balancedCanyonBankEnabled('gran-canon',q),true);
 for(const biome of ['sabana','gran-rio','manglares','desierto','volcanes'])assert.equal(balancedCanyonBankEnabled(biome,q),false);
 for(const search of ['', '?canyonBank=balanced','?visualLab=global-lighting&canyonBank=balanced','?waterEdges=natural&canyonBank=balanced'])assert.equal(balancedCanyonBankEnabled('gran-canon',search),false);
});

test('direct wetland mask preserves every packed byte without querying unused shore or level',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,-24,24,0,24,-24,0,-24,24,0,24,-24,0,24],3));
 const mask=(x,z)=>.6+.2*Math.sin(x*.2)*Math.cos(z*.3);let queries=0;
 const field={wetland:true,wetlandLevel:()=>1.25,waterInfo:(x,z)=>{queries++;return {mask:mask(x,z)};},wetlandMask:mask};
 const world={state:{biome:'manglares'},nav:{field}};
 const sample=directWetland=>prepareNaturalWaterBed(world,geometry,2,-3,{yielding:false,directWetland}).next().value;
 const original=sample(false);assert(queries>9000);queries=0;const direct=sample(true);assert.deepEqual(direct,original);assert.equal(queries,0);
 delete field.wetlandMask;assert.deepEqual(sample(true),original);assert(queries>0);
});
