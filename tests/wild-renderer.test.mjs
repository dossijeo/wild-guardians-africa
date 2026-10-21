import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {WildRenderer} from '../src/rendering/wild-renderer/adapter.js';
test('WASM packing matches Three.js, tracks updates, rebases and releases memory',async()=>{
 const {instance}=await WebAssembly.instantiate(await readFile(new URL('../src/rendering/wild-renderer/core.wasm',import.meta.url)),{wasi_snapshot_preview1:{proc_exit(){throw Error('exit')}}});
 const wr=new WildRenderer(instance.exports),geometry=new THREE.BoxGeometry(2,3,4);geometry.translate(.3,2,-.8);geometry.computeBoundingSphere();
 const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),128),group=new THREE.Group();group.position.set(31,2,-17);group.rotation.y=.17;group.updateMatrixWorld(true);
 const visibility=new THREE.InstancedBufferAttribute(new Float32Array(128).fill(1),1);geometry.setAttribute('nativeVisibility',visibility);
 const dummy=new THREE.Object3D();for(let i=0;i<128;i++){dummy.position.set((i%16)*4-32,0,Math.floor(i/16)*5-20);dummy.scale.set(.7+i%3,.8+i%2,1.3);dummy.rotation.y=i*.37;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;
 const camera=new THREE.PerspectiveCamera(50,1.6,.1,140);camera.position.set(20,12,35);camera.lookAt(0,0,0);camera.updateMatrixWorld();const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const outGeometry=new THREE.BufferGeometry();outGeometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(128),1));const g={capacity:128,mesh:new THREE.InstancedMesh(outGeometry,mesh.material,128)},entries=[{mesh,group}],source={geometry};
 function check(origin,omit){const matrices=[],vis=[],matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();for(const entry of entries)for(let i=0;i<entry.mesh.count;i++){if(omit&&visibility.array[i]<=0)continue;matrix.fromArray(entry.mesh.instanceMatrix.array,i*16).premultiply(entry.group.matrixWorld);sphere.copy(geometry.boundingSphere).applyMatrix4(matrix);sphere.radius+=2.5;if(!frustum.intersectsSphere(sphere))continue;matrix.elements[12]-=origin.x;matrix.elements[14]-=origin.z;matrices.push(...matrix.elements.map(Math.fround));vis.push(visibility.array[i]);}const count=wr.pack(g,entries,source,frustum,origin,omit);assert.equal(count,vis.length);assert.deepEqual(Array.from(g.mesh.instanceMatrix.array.subarray(0,count*16)),matrices);assert.deepEqual(Array.from(g.mesh.geometry.attributes.nativeVisibility.array.subarray(0,count)),vis);}
 check({x:0,z:0},false);wr.metrics={};check({x:48,z:-48},false);assert.equal(wr.metrics.copiedBytes,0);
 visibility.array[33]=0;visibility.needsUpdate=true;check({x:48,z:-48},true);mesh.instanceMatrix.array[12]+=30;mesh.instanceMatrix.needsUpdate=true;check({x:0,z:0},true);
 mesh.count=32;const second={count:16,instanceMatrix:mesh.instanceMatrix,geometry:mesh.geometry};entries.push({mesh:second,group});check({x:0,z:0},false);mesh.count=24;check({x:0,z:0},false);entries.pop();mesh.count=0;check({x:0,z:0},false);assert.ok(wr.liveBytes>0);wr.release(g);assert.equal(wr.liveBytes,0);wr.release(g);
});
