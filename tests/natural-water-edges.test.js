import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareNaturalWaterBed,prepareNaturalAssetWaterBed,prepareNaturalAssetWater,prepareNaturalWater,naturalWaterEdgesEnabled,balancedCanyonBankEnabled} from '../src/rendering/natural-water-edges.js';
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


test('incremental asset bed preserves every sample and packed byte',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,24],3));
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon']){
  let queries=0;
  const field={canyon:biome==='gran-canon',wetland:biome==='manglares',surface:(x,z)=>{queries++;return 2+Math.sin(x*.13)*Math.cos(z*.17);},wetlandLevel:()=>2,waterInfo:(x,z)=>{queries++;return {mask:.6+.2*Math.sin(x*.13)*Math.cos(z*.17)};}};
  const world={state:{biome},nav:{field}};
  const expected=prepareNaturalWaterBed(world,geometry,2,-3,{yielding:false}).next().value,expectedQueries=queries;
  queries=0;let units=0,lastQueries=0;
  let clock=0;const steps=prepareNaturalAssetWaterBed(world,2,-3,{now:()=>++clock});let step;
  while(!(step=steps.next()).done){assert(queries-lastQueries<=128);lastQueries=queries;units++;}
  assert(units>70);assert.equal(queries,expectedQueries);assert.deepEqual(step.value,expected);
 }
 geometry.dispose();
});

test('cancelled incremental asset bed releases its private proxy',()=>{
 const original=THREE.BufferGeometry.prototype.dispose;let released=0,queries=0;
 THREE.BufferGeometry.prototype.dispose=function(){released++;return original.call(this);};
 try{
  let clock=0;const steps=prepareNaturalAssetWaterBed({state:{biome:'gran-rio'},nav:{field:{surface:()=>{queries++;return 0;}}}},0,0,{now:()=>++clock});
  assert.equal(steps.next().done,false);assert.equal(queries,128);steps.return();
  assert.equal(released,1);assert.equal(queries,128);
 }finally{THREE.BufferGeometry.prototype.dispose=original;}
});


test('prepared asset bed installs the identical shader without querying terrain again',()=>{
 let queries=0;const world={state:{biome:'gran-rio'},nav:{field:{surface:(x,z)=>{queries++;return Math.sin(x*.1)+Math.cos(z*.2);}}}};
 const steps=prepareNaturalAssetWaterBed(world,1,2);let step;while(!(step=steps.next()).done){}
 const bed=step.value,preparedQueries=queries;
 const make=()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-1,0,1,1,0,1],3));const m=new THREE.MeshStandardMaterial();m.onBeforeCompile=()=>{};return new THREE.Mesh(g,m);};
 const staged=make(),original=make();prepareNaturalAssetWater(world,staged,1,2,bed);assert.equal(queries,preparedQueries);
 prepareNaturalAssetWater(world,original,1,2);assert.equal(queries,preparedQueries*2);
 const compile=mesh=>{const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <opaque_fragment>'};mesh.material.onBeforeCompile(shader,{});return shader;};
 const a=compile(staged),b=compile(original);
 assert.equal(a.vertexShader,b.vertexShader);assert.equal(a.fragmentShader,b.fragmentShader);
 assert.deepEqual(a.uniforms.qaBed.value.image,b.uniforms.qaBed.value.image);
 assert.deepEqual(staged.userData.naturalWaterBed,original.userData.naturalWaterBed);
 assert.deepEqual(staged.geometry.getAttribute('qaEdgeDistance').array,original.geometry.getAttribute('qaEdgeDistance').array);
 for(const mesh of [staged,original]){mesh.material.dispose();mesh.geometry.dispose();}
});


test('cheap asset sample blocks are coalesced before yielding',()=>{
 let clock=0,queries=0,yields=0;
 const world={state:{biome:'gran-rio'},nav:{field:{surface:()=>{queries++;return 0;}}}};
 const steps=prepareNaturalAssetWaterBed(world,0,0,{now:()=>clock+=.1});let step;
 while(!(step=steps.next()).done)yields++;
 assert(yields>0&&yields<20);assert.equal(queries,99*99);assert.equal(step.value.bytes.length,99*99*4);
});
