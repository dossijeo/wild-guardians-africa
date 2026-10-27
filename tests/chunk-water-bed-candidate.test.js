import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareNaturalWaterBed,prepareNaturalWater} from '../src/rendering/natural-water-edges.js';
import {prepareChunkWaterBed} from '../tools/experiments/chunk-water-bed-candidate.js';
test('chunk candidate preserves sampling order, packed bytes and installs without resampling',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,-24,24,0,24,-24,0,-24,24,0,24,-24,0,24],3));
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
  let calls=[];const sample=(x,z)=>{calls.push([x,z]);return Math.sin(x*.13)*Math.cos(z*.17);};
  const world={state:{biome},nav:{field:{canyon:biome==='gran-canon',wetland:biome==='manglares',surface:sample,wetlandLevel:()=>2,waterInfo:(x,z)=>({mask:.6+.2*sample(x,z)})}}};
  const expected=prepareNaturalWaterBed(world,geometry,2,-3,{yielding:false}).next().value,order=calls;calls=[];let clock=0,units=0;
  const steps=prepareChunkWaterBed(world,geometry,2,-3,{now:()=>++clock});let step;while(!(step=steps.next()).done)units++;
  assert.deepEqual(step.value,expected);assert.deepEqual(calls,order);if(expected){assert(units>0);const count=calls.length,m=new THREE.MeshStandardMaterial();prepareNaturalWater(world,geometry,2,-3,m,step.value);assert.equal(calls.length,count);m.dispose();}
 }
 geometry.dispose();
});
test('cancelled preparation stops querying and never disposes borrowed geometry',()=>{
 let calls=0,clock=0,released=0;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,24],3));geometry.addEventListener('dispose',()=>released++);
 const steps=prepareChunkWaterBed({state:{biome:'gran-rio'},nav:{field:{surface:()=>{calls++;return 0;}}}},geometry,0,0,{now:()=>++clock});assert.equal(steps.next().done,false);const count=calls;steps.return();assert.equal(steps.next().done,true);assert.equal(calls,count);assert.equal(released,0);geometry.dispose();
});
