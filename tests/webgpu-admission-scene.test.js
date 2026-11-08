import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileWithAdmissionSceneLighting} from '../src/rendering/webgpu-admission-scene.js';

function fixture(){const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),object=new THREE.Group(),oldNode={},oldLights=[new THREE.HemisphereLight()],node={lights:oldLights,getLights(){return this.lights;},setLights(value){this.lights=value;}},list={lightsNode:oldNode,lightsArray:[new THREE.PointLight()]},renderer={_wgCompileSceneReference:null,_renderLists:{get:()=>list},lighting:{getNode:()=>node}};return {scene,camera,object,oldNode,oldLights,node,list,renderer};}
test('admission temporarily shares scene light identity and restores it before awaiting',async()=>{
 const {scene,camera,object,oldNode,oldLights,node,list,renderer}=fixture();let resolve;
 const pending=compileWithAdmissionSceneLighting(renderer,object,camera,scene,()=>{assert.equal(renderer._wgCompileSceneReference,scene);assert.equal(list.lightsNode,node);node.setLights(list.lightsArray);return new Promise(r=>{resolve=r;});});
 assert.equal(list.lightsNode,oldNode);assert.equal(node.lights,oldLights);assert.equal(renderer._wgCompileSceneReference,null);resolve(1);assert.equal(await pending,1);
});
test('admission restores shared state after a synchronous compile error',()=>{
 const {scene,camera,object,oldNode,oldLights,node,list,renderer}=fixture();assert.throws(()=>compileWithAdmissionSceneLighting(renderer,object,camera,scene,()=>{node.setLights(list.lightsArray);throw Error('compile failed');}),/compile failed/);assert.equal(list.lightsNode,oldNode);assert.equal(node.lights,oldLights);assert.equal(renderer._wgCompileSceneReference,null);
});
test('admission does not overwrite reentrant light ownership',()=>{
 const {scene,camera,object,oldNode,node,list,renderer}=fixture(),replacement=[new THREE.PointLight()];assert.throws(()=>compileWithAdmissionSceneLighting(renderer,object,camera,scene,()=>{node.setLights(replacement);return 1;}),{code:'admission-stale'});assert.equal(node.lights,replacement);assert.equal(list.lightsNode,oldNode);assert.equal(renderer._wgCompileSceneReference,null);
});
test('admission leaves incompatible targets and embedded lights on the original path',()=>{
 const {scene,camera,object,node,list,renderer}=fixture(),light=new THREE.PointLight();object.add(light);assert.equal(compileWithAdmissionSceneLighting(renderer,object,camera,scene,()=>{assert.notEqual(list.lightsNode,node);return 1;}),1);object.remove(light);assert.equal(compileWithAdmissionSceneLighting(renderer,object,camera,new THREE.Group(),()=>2),2);assert.equal(compileWithAdmissionSceneLighting(renderer,scene,camera,scene,()=>3),3);
});
