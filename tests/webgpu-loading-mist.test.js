import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingMist} from '../src/rendering/webgpu-loading-mist.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1.5,.1,80),jobs=[],releases=[],errors=[];camera.position.set(4,3,6);camera.lookAt(0,1.15,0);camera.updateMatrixWorld();
 const admission={prepareAndPublish(mesh,{signal},publish){return new Promise(resolve=>jobs.push({mesh,signal,finish(){publish();resolve();}}));},deferRelease(mesh,release){releases.push({mesh,release});}};
 const mist=createWebGpuLoadingMist({scene,camera,admission,onError:error=>errors.push(error.message)});return {scene,camera,jobs,releases,errors,mist};
}
test('loading mist is admitted behind the mountains and releases its resources safely',async()=>{
 const f=fixture();await tick();const job=f.jobs[0],mesh=job.mesh;assert.equal(mesh.visible,false);assert.equal(mesh.material.depthTest,true);assert.equal(mesh.material.depthWrite,false);assert.ok(mesh.renderOrder< -1000);let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);f.mist.update({day:1,time:0});job.finish();assert.equal(await f.mist.ready,true);assert.equal(mesh.visible,true);f.mist.dispose();assert.equal(mesh.parent,null);assert.equal(disposed,0);f.releases[0].release();assert.equal(disposed,1);assert.deepEqual(f.errors,[]);
});
test('disposing a pending mist prevents a late publication',async()=>{
 const f=fixture();await tick();f.mist.dispose();assert.equal(f.jobs[0].signal.aborted,true);assert.throws(()=>f.jobs[0].finish(),{name:'AbortError'});f.releases[0].release();assert.equal(f.jobs[0].mesh.visible,false);
});
test('analytic mist produces WGSL for its screen quad and night variation',async()=>{
 const f=fixture();await tick();const mesh=f.jobs[0].mesh,canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=f.scene;builder.camera=f.camera;builder.build();assert.match(builder.vertexShader,/fn main/);assert.match(builder.fragmentShader,/smoothstep/);}finally{f.mist.dispose();f.releases[0].release();}
});
