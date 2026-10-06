import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AlphaDepthExperiment} from './browser/alpha-depth-experiment.js';
const scene=objects=>({traverseVisible(callback){objects.forEach(callback);}});
test('Disabled QA alpha adapter preserves receiver, arguments, return and authored depth',()=>{
 const object={material:new THREE.MeshStandardMaterial({alphaTest:.3}),customDepthMaterial:{authored:true}},world=scene([object]),camera={};
 const pass={captureDepth(c,s){assert.equal(this,pass);assert.equal(c,camera);assert.equal(s,world);assert.ok(object.customDepthMaterial.authored);return 7;}},original=pass.captureDepth,probe=new AlphaDepthExperiment(pass);
 assert.equal(pass.captureDepth(camera,world),7);assert.equal(probe.applications,0);probe.dispose();assert.equal(pass.captureDepth,original);
});
test('Eligible native alpha uses matching stock depth only during capture and restores shape on error',()=>{
 const material=new THREE.MeshStandardMaterial({alphaTest:.3,side:THREE.DoubleSide}),object={material};
 const pass={captureDepth(){assert.equal(object.material,material);assert.equal(object.customDepthMaterial.alphaTest,.3);assert.equal(object.customDepthMaterial.side,THREE.DoubleSide);assert.ok(object.customDepthMaterial.userData.worldDepthCompatible);throw Error('capture failure');}},probe=new AlphaDepthExperiment(pass);probe.enabled=true;
 assert.throws(()=>pass.captureDepth({},scene([object])),/capture failure/);assert.equal(object.material,material);assert.equal(Object.hasOwn(object,'customDepthMaterial'),false);assert.equal(probe.applications,1);probe.dispose();material.dispose();
});
test('Unknown hooks, rasterization exceptions, material arrays and authored depth retain originals',()=>{
 const unknown=new THREE.MeshStandardMaterial({alphaTest:.3});unknown.onBeforeCompile=()=>{};
 const objects=[{material:unknown},{material:new THREE.MeshStandardMaterial({alphaTest:.3,polygonOffset:true})},{material:[new THREE.MeshStandardMaterial({alphaTest:.3})]},{material:new THREE.MeshStandardMaterial({alphaTest:.3}),customDepthMaterial:{authored:true}},{material:new THREE.MeshStandardMaterial({alphaTest:0})}];
 const pass={captureDepth(){assert.ok(objects.every(o=>!o.customDepthMaterial||o.customDepthMaterial.authored));}},probe=new AlphaDepthExperiment(pass);probe.enabled=true;pass.captureDepth({},scene(objects));assert.equal(probe.applications,0);probe.dispose();
});
