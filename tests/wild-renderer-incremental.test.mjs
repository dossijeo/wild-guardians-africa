import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {WildRenderer} from '../src/rendering/wild-renderer/adapter.js';
import {IncrementalWildRenderer} from '../src/rendering/wild-renderer/incremental.js';
import {EventLifecycleWildRenderer} from '../src/rendering/wild-renderer/event-lifecycle.js';
const load=async()=> (await WebAssembly.instantiate(await readFile(new URL('../src/rendering/wild-renderer/core.wasm',import.meta.url)),{wasi_snapshot_preview1:{proc_exit(){throw Error('exit')}}})).instance.exports;
for(const Candidate of [IncrementalWildRenderer,EventLifecycleWildRenderer])test(`${Candidate.name}: parity, camera, LOD, fade, invalidation and retirement`,async()=>{
 const original=new WildRenderer(await load()),candidate=new Candidate(await load());
 const geometry=new THREE.BoxGeometry(2,4,3);geometry.translate(.2,1,-.5);geometry.computeBoundingSphere();
 const group=new THREE.Group();group.position.set(12,2,-9);group.rotation.y=.2;group.updateMatrixWorld(true);
 const dummy=new THREE.Object3D();
 function batch(n,offset){const instances=Array.from({length:n},(_,i)=>({x:offset+(i%8)*3-12,y:i%2,z:Math.floor(i/8)*4-8,yaw:i*.37,sx:.8+i%3,sy:1.2,sz:.7+i%2}));const levels=[{geometry}],orders=[Array.from({length:n},(_,i)=>i)],fade={attribute:new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1),1)},mesh=new THREE.InstancedMesh(geometry.clone(),new THREE.MeshBasicMaterial(),n);mesh.geometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(n),1));return {instances,levels,orders,fade,chunkOrigin:[0,0],mesh};}
 const a=batch(32,0),b=batch(17,-15);group.userData.lodBatches=[a,b];const chunks=new Map([['test',group]]);const parent=new THREE.Group();parent.add(group);
 if(candidate.eventLifecycle)chunks.values=()=>{throw Error('Event lifecycle must not scan chunks');};
 let entries=[a,b].map(batch=>({batch,mesh:batch.mesh,group,level:0}));
 function sync(batch){const mesh=batch.mesh;mesh.count=batch.orders[0].length;for(const [j,i] of batch.orders[0].entries()){const p=batch.instances[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);mesh.geometry.attributes.nativeVisibility.array[j]=batch.fade.attribute.array[i];}mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.nativeVisibility.needsUpdate=true;}
 const makeGroup=()=>{const g=new THREE.BufferGeometry();g.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(128),1));return {capacity:128,mesh:new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial(),128)};};
 const ga=makeGroup(),gb=makeGroup(),camera=new THREE.PerspectiveCamera(55,1.6,.1,150),frustum=new THREE.Frustum();camera.position.set(15,12,40);
 const origin={x:0,z:0};
 function check(){camera.lookAt(0,0,0);camera.updateMatrixWorld();frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));candidate.metrics={};candidate.beginFrame(chunks,frustum,origin);const ca=original.pack(ga,entries,{geometry},frustum,origin,true),cb=candidate.pack(gb,entries,{geometry},frustum,origin,true);assert.equal(cb,ca);assert.deepEqual(Array.from(gb.mesh.instanceMatrix.array.subarray(0,cb*16)),Array.from(ga.mesh.instanceMatrix.array.subarray(0,ca*16)));assert.deepEqual(Array.from(gb.mesh.geometry.attributes.nativeVisibility.array.subarray(0,cb)),Array.from(ga.mesh.geometry.attributes.nativeVisibility.array.subarray(0,ca)));}
 sync(a);sync(b);check();camera.position.x-=4;check();assert.equal(candidate.metrics.copiedBytes??0,0);assert.equal(candidate.metrics.registrations??0,0);check();assert.equal(candidate.lastUpdated,false);
 a.orders[0]=a.orders[0].filter(i=>i%2).reverse();sync(a);check();assert.ok(candidate.metrics.orderUploads>0);assert.equal(candidate.metrics.registrations??0,0);
 a.fade.attribute.array[3]=0;a.fade.attribute.needsUpdate=true;sync(a);check();
 a.instances[5].x+=20;candidate.invalidate(a);sync(a);check();assert.ok(candidate.metrics.registeredInstances>0);
 group.position.x+=48;group.updateMatrixWorld(true);origin.x=48;check();assert.ok(candidate.metrics.registrations>0);
 if(candidate.eventLifecycle){b.mesh.dispose();assert.equal(candidate.sources.size,1);parent.remove(group);assert.equal(candidate.sources.size,0);parent.add(group);}
 group.userData.lodBatches=[a];entries=entries.slice(0,1);check();assert.equal(candidate.sources.size,1);
 candidate.dispose();assert.equal(candidate.liveBytes,0);candidate.dispose();original.release(ga);assert.equal(original.liveBytes,0);
});
