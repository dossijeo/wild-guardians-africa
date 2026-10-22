import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareNaturalWater} from '../src/rendering/natural-water-edges.js';
import {prepareCanyonWater} from '../tools/experiments/qa-canyon-water-worldbank-20261022.js';
test('skipping unused Canyon boundary extraction preserves packed maps',()=>{
 for(const [cx,cz] of [[0,0],[-3,4]]){
  const geometry=new THREE.PlaneGeometry(48,48,12,12).rotateX(-Math.PI/2).toNonIndexed();
  const oldGeometry=geometry.clone(),source=new THREE.MeshStandardMaterial();source.onBeforeCompile=()=>{};
  const world={state:{biome:'gran-canon'},nav:{field:{canyon:true,surface:(x,z)=>Math.sin(x*.2)+Math.cos(z*.13)}}};
  prepareCanyonWater(world,oldGeometry,cx,cz,source);prepareNaturalWater(world,geometry,cx,cz,source);
  const a={uniforms:{},fragmentShader:'#include <opaque_fragment>'},b={uniforms:{},fragmentShader:'#include <opaque_fragment>'};
  oldGeometry.userData.qaMaterial.onBeforeCompile(a,{});source.onBeforeCompile(b,{});
  assert.deepEqual(a.uniforms.qaBed.value.image.data,b.uniforms.qaBed.value.image.data);
  assert.deepEqual(a.uniforms.qaBedBounds.value,b.uniforms.qaBedBounds.value);
  oldGeometry.userData.qaMaterial.dispose();source.dispose();oldGeometry.dispose();geometry.dispose();
 }
});
