import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPresentationBackend} from '../src/app/select-presentation-backend.js';

test('the legacy backend does not request a graphics adapter',async()=>{
 const result=await selectPresentationBackend({requested:'legacy',gpu:{requestAdapter(){throw Error('must not probe');}},workerAvailable:false,offscreenAvailable:false});assert.deepEqual(result,{backend:'legacy',reason:null});
});
test('an explicit Worker renderer is selected only when its preflight succeeds',async()=>{
 let calls=0;const options={requested:'webgpu-worker',gpu:{async requestAdapter(){calls++;return {};}},workerAvailable:true,offscreenAvailable:true};assert.deepEqual(await selectPresentationBackend(options),{backend:'webgpu-worker',reason:null});assert.equal(calls,1);
 assert.deepEqual(await selectPresentationBackend({...options,workerAvailable:false}),{backend:'legacy',reason:'worker-canvas-unavailable'});assert.equal(calls,1);
 assert.deepEqual(await selectPresentationBackend({...options,offscreenAvailable:false}),{backend:'legacy',reason:'worker-canvas-unavailable'});assert.equal(calls,1);
 assert.deepEqual(await selectPresentationBackend({...options,gpu:null}),{backend:'legacy',reason:'webgpu-unavailable'});
});
test('adapter rejection, absence and timeout choose the legacy backend before world creation',async()=>{
 const options={requested:'webgpu-worker',workerAvailable:true,offscreenAvailable:true,timeoutMs:5};for(const gpu of [{requestAdapter:async()=>null},{requestAdapter:async()=>{throw Error('denied');}},{requestAdapter:()=>new Promise(()=>{})}])assert.deepEqual(await selectPresentationBackend({...options,gpu}),{backend:'legacy',reason:'adapter-unavailable'});
});
