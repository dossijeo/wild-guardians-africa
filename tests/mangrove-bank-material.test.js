import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareMangroveBank} from '../src/rendering/mangrove-shore.js';
test('shore decoration patches the explicit owned water material',()=>{
 const previous=globalThis.location;globalThis.location={search:'?visualLab=global-lighting&mangroveSubstrate=full&mangroveShore=sediment'};
 const shared=new THREE.MeshStandardMaterial(),owned=new THREE.MeshStandardMaterial(),g=new THREE.PlaneGeometry();owned.onBeforeCompile=()=>{};
 try{
  prepareMangroveBank({state:{biome:'manglares'},fluidMaterial:shared,nav:{field:{waterInfo:()=>({inside:true,shore:1})}}},g,0,0,owned);
  assert.equal(owned.userData.wetShore,true);assert.equal(shared.userData.wetShore,undefined);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'vec3 base=uInk0*.72;'};owned.onBeforeCompile(shader,{});assert.ok(shader.fragmentShader.includes('vec3 sediment='));assert.ok(g.getAttribute('wetShore'));
 }finally{globalThis.location=previous;owned.dispose();shared.dispose();g.dispose();}
});
