import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Scene} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createWebGpuConfirmedAnimal} from '../src/rendering/webgpu-confirmed-animal.js';
const state=()=>JSON.parse(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('cancels a pending animal download on disposal signal',async()=>{
 const original=GLTFLoader.prototype.loadAsync,controller=new AbortController();let loaderSignal;
 GLTFLoader.prototype.loadAsync=function(){loaderSignal=this.manager.abortController.signal;return new Promise((resolve,reject)=>loaderSignal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));};
 try{const game=state(),pending=createWebGpuConfirmedAnimal({scene:new Scene(),residency:{},state:game,actorId:game.raid.animals[0].id,signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(loaderSignal.aborted,true);}finally{GLTFLoader.prototype.loadAsync=original;}
});
test('does not start a download when already cancelled',async()=>{
 const controller=new AbortController();controller.abort();const game=state();await assert.rejects(createWebGpuConfirmedAnimal({scene:new Scene(),residency:{},state:game,actorId:game.raid.animals[0].id,signal:controller.signal}),{name:'AbortError'});
});
