import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';

test('experimental constant palettes cannot reuse a shader program across biomes',()=>{
 const toon=new AfricanToon();toon.globalVisualLighting=true;
 const keys=['savanna','grand_river','mangrove','canyons','volcanoes','desert'].map(groundBiome=>{
  const material=new THREE.MeshStandardMaterial();Object.assign(material.userData,{toonGround:true,groundBiome});toon.material(material);
  const key=material.customProgramCacheKey();material.dispose();return key;
 });
 assert.equal(new Set(keys).size,6);
});
