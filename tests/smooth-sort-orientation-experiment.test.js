import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSmoothFarImpostor as original} from '../tools/experiments/smooth-sort-original.js';
import {createSmoothFarImpostor as candidate} from '../tools/experiments/smooth-sort-orientation.js';
function fixture(make){
 const scene=new THREE.Scene(),g=new THREE.InstancedBufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));g.setIndex([0,1,2]);
 g.setAttribute('aTreeBase',new THREE.InstancedBufferAttribute(new Float32Array([0,0,-10,2,1,-3,-4,2,-7]),3));
 g.setAttribute('aTreeScale',new THREE.InstancedBufferAttribute(new Float32Array([1,1,1,1,4,1,1,2,1]),3));
 g.setAttribute('aTreeReady',new THREE.InstancedBufferAttribute(new Float32Array([.2,.5,.8]),1));g.instanceCount=3;
 const m=new THREE.ShaderMaterial({uniforms:{uSize:{value:new THREE.Vector2(2,4)}}}),mesh=new THREE.Mesh(g,m);scene.add(mesh);
 const owner=make(mesh,scene);return {g,m,mesh,scene,owner,close(){owner.dispose();g.dispose();m.dispose();}};
}
function equal(a,b){for(const n of ['aTreeBase','aTreeScale','aTreeReady'])assert.deepEqual([...a.mesh.geometry.attributes[n].array],[...b.mesh.geometry.attributes[n].array]);}
test('orientation key preserves sorted buffers for translation, turns, attribute updates and origin shifts',()=>{
 const a=fixture(original),b=fixture(candidate),camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
 try{
  a.owner.prepare(camera);b.owner.prepare(camera);equal(a,b);
  const version=b.mesh.geometry.attributes.aTreeBase.version;
  for(let i=0;i<30;i++){camera.position.set(i*7,i*.1,-i*3);camera.updateMatrixWorld();a.owner.prepare(camera);b.owner.prepare(camera);equal(a,b);}
  assert.equal(b.mesh.geometry.attributes.aTreeBase.version,version);
  assert(a.mesh.geometry.attributes.aTreeBase.version>version);
  for(let i=0;i<12;i++){camera.rotation.set(i*.1,i*.3,0);camera.updateMatrixWorld();a.owner.prepare(camera);b.owner.prepare(camera);equal(a,b);}
  for(const f of [a,b]){f.g.attributes.aTreeReady.setX(1,.9);f.g.attributes.aTreeReady.needsUpdate=true;f.g.attributes.aTreeBase.setZ(0,14);f.g.attributes.aTreeBase.needsUpdate=true;}
  a.owner.prepare(camera);b.owner.prepare(camera);equal(a,b);
  camera.position.x-=192;camera.updateMatrixWorld();a.owner.prepare(camera);b.owner.prepare(camera);equal(a,b);
  for(const f of [a,b]){f.g.setDrawRange(0,0);f.g.instanceCount=2;f.owner.prepare(camera);assert.equal(f.mesh.geometry.drawRange.count,0);assert.equal(f.mesh.geometry.instanceCount,2);}
 }finally{a.close();b.close();}
});
test('height invalidation refreshes order and disposal remains safe',()=>{
 const b=fixture(candidate),camera=new THREE.PerspectiveCamera();camera.rotation.x=.6;camera.updateMatrixWorld();
 try{b.owner.prepare(camera);const v=b.mesh.geometry.attributes.aTreeBase.version;b.m.uniforms.uSize.value.y=30;b.owner.prepare(camera);assert.equal(b.mesh.geometry.attributes.aTreeBase.version,v+1);const fresh=fixture(original);try{fresh.m.uniforms.uSize.value.y=30;fresh.owner.prepare(camera);equal(fresh,b);}finally{fresh.close();}}finally{b.close();}
});
