import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createWebGpuPicker,webGpuPickerReady} from '../src/rendering/webgpu-picker.js';
import {pickTerrainStroke} from '../src/rendering/webgpu-terrain-stroke.js';

function chunk(){const positions=new Float32Array(49*49*3),colors=new Float32Array(positions.length),indices=new Uint16Array(48*48*6);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const k=(z*49+x)*3;positions[k]=x-24;positions[k+2]=z-24;}for(let z=0;z<48;z++)for(let x=0;x<48;x++){const k=(z*48+x)*6,a=z*49+x;indices.set([a,a+49,a+1,a+1,a+49,a+50],k);}return {authority:'spatial-wasm',cx:0,cz:0,terrain:{positions,colors,indices}};}
test('confirmed but unadmitted terrain makes clicks and wall strokes incomplete without delaying the ACK',async()=>{
 const requests=[],acks=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),admission={prepare(){return new Promise(resolve=>requests.push(resolve));}},residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission}),port={postMessage:m=>acks.push(m),start(){},close(){}},terrain=createConfirmedTerrainReceiver({port,session:'s',residency});camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateProjectionMatrix();const terrainReady=()=>{const status=terrain.status();return !status.closed&&!status.pending&&!status.presentationPending;},state={},picker=createWebGpuPicker({scene,camera,state,animals:{get:()=>null},cropBounds:()=>[],isTerrainReady:terrainReady,isReady:()=>webGpuPickerReady(state,{terrain:terrain.status()})});
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:0,revision:1,payload:chunk()}});await Promise.resolve();assert.equal(acks[0].kind,'terrainAck');assert.equal(terrain.status().presentationPending,true);assert.equal(picker.pick({x:0,y:0,terrainOnly:true}).incomplete,true);assert.equal(picker.pick({x:0,y:0}).incomplete,true);await assert.rejects(pickTerrainStroke({scene,camera,samples:[[0,0],[.1,.1]],isReady:terrainReady}),/Terrain changed/);
 requests[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(terrain.status().presentationPending,false);assert.equal(picker.pick({x:0,y:0,terrainOnly:true}).incomplete,undefined);
 const stroke=pickTerrainStroke({scene,camera,samples:[[0,0],[.1,.1]],batchSize:1,isReady:terrainReady,yieldBatch:async()=>{port.onmessage({data:{kind:'terrain',session:'s',id:2,sequence:0,revision:2,payload:chunk()}});}});await assert.rejects(stroke,/Terrain changed/);terrain.dispose();residency.dispose();material.dispose();
});
