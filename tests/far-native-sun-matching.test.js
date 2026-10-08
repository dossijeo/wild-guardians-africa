import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {updateShadowCamera} from '../src/rendering/shadow-camera.js';
const manifest=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
for(const phase of ['day','night'])test(`offline native-sun ${phase} pilot matches live world light direction and existing source frame`,async()=>{
 const metadata=JSON.parse(await fs.readFile(`docs/qa/far-native-sun-matching/acacia-${phase}.json`,'utf8'));
 const light=new THREE.DirectionalLight(),toon=new AfricanToon();updateShadowCamera(light,new THREE.Vector3(48,12,144));toon.update(phase==='night'?1:0,light,'sabana');
 const baked=new THREE.Vector3().fromArray(metadata.sunPosition).normalize();assert.ok(baked.distanceTo(toon.uniforms.uLightDir.value)<1e-12);assert.equal(metadata.nativeSunDirection,true);assert.equal(metadata.bakedLod,2);assert.equal(metadata.nightAmount,phase==='night'?1:0);
 for(const field of ['localBase','sourceBounds','impostorWidth','impostorHeight','baseV'])assert.deepEqual(metadata[field],manifest.biomes.savanna[0][field]);toon.shadowUniforms.fallback.dispose();
});
