import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {attachNativeFarGround} from '../tools/experiments/native-far-ground.js';
test('regional ground clips the current native rectangle and follows the shared render origin',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){this.originalDisposed=true;}},origin={value:new THREE.Vector2(192,0)},world={nearBounds:[100,-50,200,50],toon:{uniforms:{uWorldOrigin:origin,uNight:{value:0}}}};
 const positions=new Float32Array([0,0,0,1,0,0,0,0,1]),colors=new Float32Array(9).fill(.5),indices=new Uint32Array([0,2,1]);
 attachNativeFarGround(candidate,{positions,colors,indices},world);const mesh=candidate.impostors.children[0],shader={uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);
 assert.equal(mesh.userData.materialRegistryExcluded,true);assert.equal(mesh.material.toneMapped,false);assert.ok(Math.abs(mesh.geometry.attributes.color.getX(0)-.21404114)<1e-6);assert.equal(colors[0],.5);
 assert.equal(shader.uniforms.uFarGroundNight,world.toon.uniforms.uNight);assert.ok(shader.vertexShader.includes('vColor.rgb*=mix'));world.toon.uniforms.uNight.value=1;assert.equal(shader.uniforms.uFarGroundNight.value,1);
 assert.equal(shader.uniforms.uFarGroundOrigin,origin);assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.ok(shader.fragmentShader.includes('discard;'));
 world.nearBounds=[200,-50,300,50];candidate.updateGroundBounds();assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.equal(mesh.geometry.attributes.position.array,positions);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);candidate.dispose();assert.equal(disposed,2);assert.equal(candidate.impostors.children.length,0);assert.equal(candidate.originalDisposed,true);
});
