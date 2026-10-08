import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {AlphaSamplerExperiment} from './browser/alpha-sampler.js';
test('QA alpha filters touch shared maps once, retain texels, and restore authored filters',()=>{
 for(const mode of ['linear','nearest']){
  const scene=new THREE.Scene(),map=new THREE.Texture(),untouched=new THREE.Texture(),image={data:new Uint8Array([1,2,3,4])};map.image=image;
  const source=new THREE.MeshStandardMaterial({map,alphaTest:.35}),other=new THREE.MeshBasicMaterial({map:untouched});
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(),[source,source,other]));
  const before={minFilter:map.minFilter,magFilter:map.magFilter},version=map.version,otherVersion=untouched.version;
  const experiment=new AlphaSamplerExperiment({scene},mode);
  assert.equal(map.minFilter,mode==='linear'?THREE.LinearFilter:THREE.NearestFilter);assert.equal(map.magFilter,map.minFilter);
  assert.equal(map.version,version+1);assert.equal(map.image,image);assert.equal(untouched.version,otherVersion);assert.equal(experiment.report().textures.length,1);
  experiment.dispose();assert.equal(map.minFilter,before.minFilter);assert.equal(map.magFilter,before.magFilter);assert.equal(map.image,image);assert.equal(experiment.saved.size,0);
 }
});
test('invalid sampler refuses to traverse or change scene',()=>{
 assert.throws(()=>new AlphaSamplerExperiment({},'mipmap'),/Unknown/);
});
