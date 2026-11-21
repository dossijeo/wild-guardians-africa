import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuLoadingBackdrop} from '../src/rendering/webgpu-loading-backdrop.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),image={closed:0,close(){this.closed++;}},errors=[],jobs=[],released=[];
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}}}},initTexture(){}},admission={prepareAndPublish(object,{signal},publish){return new Promise(resolve=>jobs.push({object,signal,finish(){publish();resolve();}}));},deferRelease(object,release){released.push({object,release});}};
 const backdrop=createWebGpuLoadingBackdrop({scene,camera,renderer,admission,fetchImpl:async()=>({ok:true,blob:async()=>({})}),decode:async()=>image,onError:error=>errors.push(error.message)});
 return {scene,camera,image,errors,jobs,released,backdrop};
}
test('loading backdrop publishes actual atlas geometry only after admission and follows camera',async()=>{
 const f=fixture();for(let i=0;i<10&&!f.jobs.length;i++)await tick();assert.equal(f.jobs.length,1);const mesh=f.jobs[0].object;assert.equal(mesh.visible,false);assert.ok(mesh.geometry.getAttribute('backdropHeight'));assert.ok(mesh.material.isNodeMaterial);f.camera.position.set(4,7,-3);f.backdrop.update({day:1,time:0});assert.deepEqual(mesh.position.toArray(),[4,0,-3]);f.jobs[0].finish();assert.equal(await f.backdrop.ready,true);assert.equal(mesh.visible,true);assert.equal(f.backdrop.status().ready,true);f.backdrop.dispose();assert.equal(mesh.parent,null);assert.equal(f.image.closed,0);f.released[0].release();assert.equal(f.image.closed,1);assert.deepEqual(f.errors,[]);
});
test('disposing while admission is pending cancels the publication without releasing early',async()=>{
 const f=fixture();for(let i=0;i<10&&!f.jobs.length;i++)await tick();f.backdrop.dispose();assert.equal(f.jobs[0].signal.aborted,true);assert.equal(f.image.closed,0);assert.throws(()=>f.jobs[0].finish(),{name:'AbortError'});f.released[0].release();assert.equal(f.image.closed,1);assert.deepEqual(f.errors,[]);
});
test('the mountain atlas, fog and fade generate a WebGPU shader',async()=>{
 const f=fixture();for(let i=0;i<10&&!f.jobs.length;i++)await tick();const mesh=f.jobs[0].object,canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=f.scene;builder.camera=f.camera;builder.build();assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/smoothstep/);}finally{f.backdrop.dispose();f.released[0].release();}
});
