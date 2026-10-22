import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BiomeGround} from '../../src/rendering/biome-ground.js';
import {mangroveShoreEnabled} from '../../src/rendering/mangrove-shore.js';
assert.equal(mangroveShoreEnabled(''),false);
assert.equal(mangroveShoreEnabled('?mangroveShore=sediment'),false);
assert.equal(mangroveShoreEnabled('?visualLab=global-lighting&mangroveSubstrate=full&mangroveShore=sediment'),true);
for(const sceneFirst of [false,true]){const b=new BiomeGround(),mask=new THREE.Texture(),shore=new THREE.Texture();b.field={c:{biome:'mangrove'}};b.masks.add(mask);b.masks.add(shore);b.uniforms=()=>({uGroundMask:{value:mask},uWetBank:{value:shore}});let released=0;shore.addEventListener('dispose',()=>released++);const a=new THREE.MeshStandardMaterial(),c=new THREE.MeshStandardMaterial();b.attach(a,0,0);a.userData.retainBiomeGround(c);if(sceneFirst)b.dispose();a.dispose();if(!sceneFirst)assert.equal(released,0);c.dispose();b.dispose();assert.equal(released,1);assert.equal(b.masks.size,0);}
console.log('Native shore opt-in and shared ownership pass');
