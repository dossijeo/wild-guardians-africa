import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingSparkles} from '../src/rendering/webgpu-loading-sparkles.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1.5,.1,80),jobs=[],releases=[],errors=[];camera.position.set(4,3,6);camera.lookAt(0,1.15,0);camera.updateMatrixWorld();
 const admission={prepareAndPublish(mesh,{signal},publish){return new Promise(resolve=>jobs.push({mesh,signal,finish(){publish();resolve();}}));},deferRelease(mesh,release){releases.push({mesh,release});}};
 const sparkles=createWebGpuLoadingSparkles({scene,admission,onError:error=>errors.push(error.message)});return {scene,camera,jobs,releases,errors,sparkles};
}
test('loading sparkles wait for admission and defer resource release',async()=>{
 const f=fixture();await tick();const job=f.jobs[0],mesh=job.mesh;assert.equal(mesh.visible,false);assert.equal(mesh.geometry.instanceCount,24);assert.equal(mesh.geometry.getAttribute('aSeed').count,24);assert.equal(mesh.material.blending,THREE.AdditiveBlending);assert.equal(mesh.material.depthWrite,false);let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);f.sparkles.update({day:1,time:0},1.25,true);job.finish();assert.equal(await f.sparkles.ready,true);assert.equal(mesh.visible,true);f.sparkles.dispose();assert.equal(mesh.parent,null);assert.equal(disposed,0);f.releases[0].release();assert.equal(disposed,1);assert.deepEqual(f.errors,[]);
});
test('disposing pending sparkles prevents late publication',async()=>{
 const f=fixture();await tick();f.sparkles.dispose();assert.equal(f.jobs[0].signal.aborted,true);assert.throws(()=>f.jobs[0].finish(),{name:'AbortError'});f.releases[0].release();assert.equal(f.jobs[0].mesh.visible,false);
});
test('loading sparkle nodes generate WGSL for instancing and fragment glow',async()=>{
 const f=fixture();await tick();const mesh=f.jobs[0].mesh,canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=f.scene;builder.camera=f.camera;builder.build();assert.match(builder.vertexShader,/fn main/);assert.match(builder.fragmentShader,/exp/);}finally{f.sparkles.dispose();f.releases[0].release();}
});
