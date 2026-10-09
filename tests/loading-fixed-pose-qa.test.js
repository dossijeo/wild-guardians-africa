import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LoadingFixedPoseQa} from './browser/loading-fixed-pose-qa.js';

function fixture(){
 let pending=true,time=0;const labels=[],modes=[],camera=new THREE.PerspectiveCamera();camera.position.set(4,8,12);
 const adapter={preparationPending:()=>pending,preparationStatus:()=>({native:pending})};
 const world={camera,controls:{target:new THREE.Vector3(0,0,0),enabled:true},state:{day:1,time:0,elapsed:0},cinematic:false,renderer:{domElement:new EventTarget(),getContext:()=>({isContextLost:()=>false})},farVegetation:{adapters:[adapter]},render(){modes.push(this.cinematic);}};
 const owner={measure(label,run){labels.push(label);return run();},close(){return {supported:true,samples:[],unresolvedAtDispose:0};}};
 const qa=new LoadingFixedPoseQa(world,{samples:2,warmup:1,stableFrames:2,now:()=>time,gpuFactory:()=>owner});
 return {world,qa,labels,modes,setPending:value=>pending=value,frame:()=>qa.frame(time+=16)};
}
test('fixed-pose comparison waits for actual far quiescence then uses only the existing frame callbacks in ABBA order',()=>{
 const f=fixture();f.frame();f.frame();assert.equal(f.labels.length,0);f.setPending(false);
 for(let i=0;i<14;i++)f.frame();
 assert.deepEqual(f.labels,['fixed-pose-A1','fixed-pose-A1','fixed-pose-B1','fixed-pose-B1','fixed-pose-B2','fixed-pose-B2','fixed-pose-A2','fixed-pose-A2']);
 assert.equal(f.qa.report.workComparable,true);assert.equal(f.qa.report.frames.length,16);assert.equal(f.qa.report.frames[0].interval,null);
 assert.equal(f.world.cinematic,false);assert.equal(f.world.controls.enabled,true);
});
test('pending work and pose or clock differences invalidate comparability without hiding recorded frames',()=>{
 const f=fixture();f.setPending(false);f.frame();f.frame();f.setPending(true);f.frame();
 f.world.camera.position.x++;f.world.state.time++;f.frame();const report=f.qa.close();
 assert.equal(report.workComparable,false);assert.equal(report.contamination.length,2);assert.ok(report.poseMismatch.length);assert.ok(report.clockMismatch.length);assert.equal(report.frames.length,4);
});
test('render failure closes the query owner and restores flags without changing the camera',()=>{
 const f=fixture();f.setPending(false);f.frame();f.frame();f.frame();f.world.render=()=>{throw Error('native draw failed');};f.frame();
 assert.equal(f.qa.report.reason,'render-error');assert.equal(f.qa.report.errors.length,1);assert.equal(f.world.controls.enabled,true);assert.equal(f.world.cinematic,false);assert.deepEqual(f.world.camera.position.toArray(),[4,8,12]);
});

test('context-loss event closes immediately and cannot restart measurements after restoration',()=>{
 const f=fixture();f.world.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));assert.equal(f.qa.report.reason,'context-lost');
 f.setPending(false);for(let i=0;i<20;i++)f.frame();assert.equal(f.labels.length,0);assert.equal(f.world.controls.enabled,true);
});
