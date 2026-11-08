import test from 'node:test';
import assert from 'node:assert/strict';
import {useRealAdmissionScene,useRealAdmissionLighting} from '../tools/experiments/admission-scene-reference.mjs';
import {readFileSync} from 'node:fs';

test('QA override still applies to integrated admission source',()=>{
 const source=readFileSync(new URL('../src/rendering/webgpu-pipeline-admission.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>useRealAdmissionLighting(useRealAdmissionScene(source)));
});

test('QA scene override restores the original hook on success and synchronous failure',()=>{
 const original={},target={},object={},camera={},source='let pending;pending=renderer.compileAsync(object,passCamera,targetScene);return pending;',fn=new Function('renderer','object','passCamera','targetScene',useRealAdmissionScene(source));let calls=0;
 const renderer={_wgCompileSceneReference:original,compileAsync(o,c,s){calls++;assert.equal(this._wgCompileSceneReference,target);assert.equal(o,object);assert.equal(c,camera);assert.equal(s,target);if(calls===2)throw Error('failed');return 42;}};
 assert.equal(fn(renderer,object,camera,target),42);assert.equal(renderer._wgCompileSceneReference,original);assert.throws(()=>fn(renderer,object,camera,target),/failed/);assert.equal(renderer._wgCompileSceneReference,original);assert.throws(()=>useRealAdmissionScene('unexpected'),/anchor missing/);
});

test('QA lighting override restores list and light references on success and failure',()=>{
 const object={traverseVisible:()=>{}},camera={},scene={isScene:true},oldScene={},oldNode={},oldLights=[{id:1}],shared={lights:oldLights,getLights(){return this.lights;},setLights(value){this.lights=value;}},list={lightsNode:oldNode},source='let pending;pending=renderer.compileAsync(object,passCamera,targetScene);return pending;',fn=new Function('renderer','object','passCamera','targetScene',useRealAdmissionLighting(useRealAdmissionScene(source)));let calls=0;
 const renderer={_wgCompileSceneReference:oldScene,_renderLists:{get:()=>list},lighting:{getNode:()=>shared},compileAsync(){calls++;assert.equal(this._wgCompileSceneReference,scene);assert.equal(list.lightsNode,shared);shared.setLights([{id:2}]);if(calls===2)throw Error('failed');return 42;}};
 assert.equal(fn(renderer,object,camera,scene),42);assert.equal(list.lightsNode,oldNode);assert.equal(shared.lights,oldLights);assert.equal(renderer._wgCompileSceneReference,oldScene);assert.throws(()=>fn(renderer,object,camera,scene),/failed/);assert.equal(list.lightsNode,oldNode);assert.equal(shared.lights,oldLights);assert.equal(renderer._wgCompileSceneReference,oldScene);assert.throws(()=>useRealAdmissionLighting('unexpected'),/anchor missing/);
});

test('QA lighting override does not restore a list already using the target light node',()=>{
 const node={lights:[1],getLights(){return this.lights;},setLights(value){this.lights=value;}},list={lightsNode:node},scene={isScene:true},renderer={_renderLists:{get:()=>list},lighting:{getNode:()=>node},compileAsync(){node.setLights([2]);return 7;}},source='let pending;pending=renderer.compileAsync(object,passCamera,targetScene);return pending;',fn=new Function('renderer','object','passCamera','targetScene',useRealAdmissionLighting(useRealAdmissionScene(source)));
 assert.equal(fn(renderer,scene,{},scene),7);assert.deepEqual(node.lights,[2]);assert.equal(list.lightsNode,node);
});

test('QA override falls back for embedded lights and non-scene targets',()=>{
 const source='let pending;pending=renderer.compileAsync(object,passCamera,targetScene);return pending;',fn=new Function('renderer','object','passCamera','targetScene',useRealAdmissionLighting(useRealAdmissionScene(source))),scene={isScene:true},camera={layers:{}},light={isLight:true,layers:{test:()=>true}},object={traverseVisible:fn=>fn(light)},renderer={compileAsync:()=>3};
 assert.equal(fn(renderer,object,camera,scene),3);assert.equal(fn(renderer,{traverseVisible(){throw Error('should not traverse');}},camera,{}),3);
});
