import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {NativeSky,skyNight} from '../src/rendering/sky.js';
import {decodeRadiance,SKY_VERTEX,SKY_FRAGMENT,SKY_SOURCE_SHA256} from '../src/rendering/sky-source.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const hash=data=>createHash('sha256').update(data).digest('hex');
test('sky shader and raw HDR decoder preserve the original lab output',()=>{
  assert.equal(hash(source),SKY_SOURCE_SHA256);
  const core=source.match(/const SKY_CORE=`([\s\S]*?)`;/)[1];
  assert.equal(SKY_VERTEX,source.match(/const SKY_VS=`([\s\S]*?)`;/)[1]);
  const fragment=source.match(/const SKY_FS=`([\s\S]*?)`\+SKY_CORE\+`([\s\S]*?)`;/);
  assert.equal(SKY_FRAGMENT,fragment[1]+core+fragment[2]);
  const original=source.slice(source.indexOf('function decodeRadiance(encoded){'),source.indexOf('\n// These surface recipes'));
  const decodeOriginal=Function(original+';return decodeRadiance;')();
  for(const p of JSON.parse(readFileSync('public/content/skies.json')).panoramas){
    const buffer=readFileSync('public'+p.url);assert.equal(buffer.length,p.bytes);assert.equal(hash(buffer),p.sha256);
    const image=decodeRadiance(buffer),reference=decodeOriginal(buffer.toString('base64'));
    assert.deepEqual(image,reference);assert.ok(image.width>=1024);assert.ok(image.height>=512);
  }
});
test('native exponential sky fade follows simulated day time and survives reload',()=>{
  assert.equal(skyNight({day:1,time:0}),0);assert.equal(skyNight({day:1,time:299}),0);
  const state={day:1,time:300.5};assert.equal(skyNight(state),1-Math.exp(-1.2));
  assert.equal(skyNight(JSON.parse(JSON.stringify(state))),skyNight(state));
  assert.equal(skyNight({day:1,time:600}),1);assert.equal(skyNight({day:2,time:0}),1);
  assert.equal(skyNight({day:2,time:.5}),Math.exp(-1.2));assert.equal(skyNight({day:2,time:5}),0);
});
test('sky keeps camera rotation independent of translation and restores renderer on failure',()=>{
  const sky=new NativeSky(),camera=new THREE.PerspectiveCamera(42,1.7,.1,600);
  sky.materials=[{uniforms:{}},{uniforms:{uSkyOpacity:{value:0}}}];sky.scene.add(new THREE.Object3D(),new THREE.Object3D());
  camera.lookAt(1,.2,-1);const renderer={autoClear:true,shadowMap:{enabled:true},render(){}};
  sky.render(renderer,camera,{day:1,time:0});const forward=sky.uniforms.uForward.value.clone();
  camera.position.set(100,50,-80);sky.render(renderer,camera,{day:1,time:600});assert.deepEqual(sky.uniforms.uForward.value,forward);
  assert.equal(sky.scene.children[0].visible,false);assert.equal(sky.scene.children[1].visible,true);assert.equal(sky.materials[1].uniforms.uSkyOpacity.value,1);
  assert.ok(Math.abs(sky.uniforms.uForward.value.dot(sky.uniforms.uRight.value))<1e-12);
  assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.enabled,true);
  renderer.render=()=>{throw Error('GPU failure');};assert.throws(()=>sky.render(renderer,camera,{day:1,time:0}),/GPU failure/);
  assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.enabled,true);
});
