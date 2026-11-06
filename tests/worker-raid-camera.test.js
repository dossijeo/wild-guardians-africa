import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {createWorkerRaidCamera} from '../src/app/worker-raid-camera.js';
import {CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';

function fixture(){
 const camera=new PerspectiveCamera(42,1,.1,500);camera.position.set(100,35,100);
 const controls={target:new Vector3(100,0,100),enableDamping:true,update(){}},calls=[];
 let terrain={surface:()=>0},allow=true;
 const guard={run(fn){if(!allow)return false;try{return fn();}catch(error){if(error instanceof CameraTerrainUnavailable)return false;throw error;}}};
 const state={pauses:[],structures:[{id:'c',kind:'center',x:0,z:0,status:'intact'}],plants:[],raid:{id:'r',animals:[{id:'a',x:50,z:50,status:'entering',species:'warthog',radius:1}]}};
 const director=createWorkerRaidCamera({camera,controls,field:()=>terrain,guard,runtime:()=>({submit(command){calls.push(command);return Promise.resolve({value:true});}})});
 return {state,controls,calls,director,terrain:value=>terrain=value,allow:value=>allow=value};
}
test('starts raid trip without mutating confirmed state and submits one ordered focus',async()=>{
 const {state,controls,calls,director}=fixture();director.update(state,.1);director.update(state,.1);await Promise.resolve();await Promise.resolve();
 assert.equal(state.raid.cameraFocusedAnimalId,undefined);assert.deepEqual(calls,[{kind:'raidCameraFocus',raidId:'r',animalId:'a'}]);assert(controls.target.x<100);director.dispose();
});
test('missing or blocked confirmed terrain neither focuses nor sends a command',async()=>{
 const {state,controls,calls,director,terrain,allow}=fixture();terrain(null);director.update(state,.1);terrain({surface:()=>0});allow(false);director.update(state,.1);await Promise.resolve();
 assert.equal(calls.length,0);assert.equal(controls.target.x,100);allow(true);director.update(state,.1);await Promise.resolve();assert.equal(calls.length,1);director.dispose();
});
test('unavailable terrain during framing leaves the focus retryable',async()=>{
 const {state,calls,director,terrain}=fixture();terrain({surface:()=>{throw new CameraTerrainUnavailable(50,50);}});director.update(state,.1);await Promise.resolve();assert.equal(calls.length,0);
 terrain({surface:()=>0});director.update(state,.1);await Promise.resolve();assert.equal(calls.length,1);director.dispose();
});
test('manual input cancels travel and a saved focus never replays',async()=>{
 const {state,controls,calls,director}=fixture();state.raid.cameraFocusedAnimalId='a';director.update(state,.2);assert.equal(controls.target.x,100);assert.equal(calls.length,0);
 delete state.raid.cameraFocusedAnimalId;director.beginManual();director.update(state,.2);assert.equal(controls.target.x,100);director.endManual();director.update(state,.2);await Promise.resolve();assert.equal(calls.length,1);director.beginManual();const x=controls.target.x;director.endManual();director.update(state,2);assert.equal(controls.target.x,x);director.dispose();
});
