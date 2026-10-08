import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeDestruction} from '../src/rendering/destruction-native.js';
import {prepareBuildingDataAsync} from '../src/rendering/prepare-building-data.js';
const building={seed:712};
const input=()=>({positions:new Float32Array([-1,0,-1,1,0,-1,0,0,1,0,3,0]),normals:new Float32Array(12).fill(.5),uv:new Float32Array(8),indices:new Uint16Array([0,2,1,0,1,3,1,2,3,2,0,3]),bounds:{min:[-1,0,-1],max:[1,3,1]}});
const data=kernel=>Object.fromEntries(['positions','normals','uv','indices','bounds','triangles','vertices','repairNormals','ash','hull','noiseBytes','holes','hitSites'].map(key=>[key,kernel[key]]));
test('transferred building data retains byte-identical geometry, seeded groups and native damage/picking closures',()=>{
 const native=createNativeDestruction(building,input()),prepared=structuredClone(data(native)),restored=createNativeDestruction(building,{},prepared);
 for(const key of Object.keys(prepared))assert.deepEqual(restored[key],native[key],key);
 assert.equal(restored.triangles[0]===restored.triangles[1],native.triangles[0]===native.triangles[1]);
 for(const damage of [0,.2,.8,.95,1]){native.setDamage(damage);restored.setDamage(damage);assert.deepEqual(restored.holes,native.holes);assert.deepEqual(restored.stages(),native.stages());for(const point of [[0,0,0],[.2,1,.4]]){assert.equal(restored.field(point),native.field(point));assert.equal(restored.sampleNoise(point),native.sampleNoise(point));assert.deepEqual(restored.collapsedPoint(point,restored.triangles[0]),native.collapsedPoint(point,native.triangles[0]));}assert.deepEqual(restored.raycast([0,1,10],[0,0,-1]),native.raycast([0,1,10],[0,0,-1]));}
});
test('building Worker transfers only copied input, terminates on completion, and aborts late preparation',async()=>{
 let worker,terminations=0,transfers;const createWorker=()=>worker={terminate(){terminations++;},postMessage(message,buffers){transfers=buffers;}};
 const pending=prepareBuildingDataAsync(building,input(),{workerAvailable:true,createWorker});assert.equal(transfers.length,4);const prepared=data(createNativeDestruction(building,input()));worker.onmessage({data:prepared});assert.equal(await pending,prepared);assert.equal(terminations,1);
 const controller=new AbortController(),cancelled=prepareBuildingDataAsync(building,input(),{workerAvailable:true,createWorker,signal:controller.signal});controller.abort();await assert.rejects(cancelled,/cancelled/);worker.onmessage({data:prepared});assert.equal(terminations,2);
});
test('building Worker error fails gracefully and unavailable Worker fallback retains functionality',async()=>{
 let worker,terminated=0;const pending=prepareBuildingDataAsync(building,input(),{workerAvailable:true,createWorker:()=>worker={postMessage(){},terminate(){terminated++;}}});worker.onmessage({data:{error:'bad model'}});await assert.rejects(pending,/bad model/);assert.equal(terminated,1);const fallback=await prepareBuildingDataAsync(building,input(),{workerAvailable:false});assert.deepEqual(fallback.vertices,createNativeDestruction(building,input()).vertices);
});
