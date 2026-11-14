import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {guardianMaterial} from '../src/rendering/guardian-material.js';

test('spirit AO is optional, shares its toggle and preserves reveal/glow and borrowed textures',()=>{
 const source=new THREE.MeshStandardMaterial({map:new THREE.Texture(),normalMap:new THREE.Texture()});
 const toon={uniforms:{uLightDir:{value:new THREE.Vector3(1,1,0)},uNight:{value:0}}};
 const original=guardianMaterial(source,toon);assert.ok(!original.vertexShader.includes('ambientVisibility'));
 source.userData.modelAmbientVisibility={value:1};const candidate=guardianMaterial(source,toon);
 assert.equal(candidate.uniforms.uModelAOOn,source.userData.modelAmbientVisibility);
 assert.equal(candidate.userData.modelAmbientVisibility,candidate.uniforms.uModelAOOn);
 assert.equal(candidate.uniforms.map.value,source.map);assert.equal(candidate.uniforms.normalMap.value,source.normalMap);
 // Every line from height/reveal through emission and output is identical.
 const tail=s=>s.slice(s.indexOf('float height='));
 assert.equal(tail(candidate.fragmentShader),tail(original.fragmentShader));
 source.userData.modelAmbientVisibility.value=0;assert.equal(candidate.uniforms.uModelAOOn.value,0);
 let disposed=0;source.map.addEventListener('dispose',()=>disposed++);candidate.dispose();original.dispose();assert.equal(disposed,0);
 source.map.dispose();source.normalMap.dispose();source.dispose();
});
