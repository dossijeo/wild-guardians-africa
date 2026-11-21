import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuMudPreparer} from '../src/rendering/webgpu-mud-preparer.js';

class WorkerFake extends EventTarget{
 constructor(){super();this.sent=[];this.terminated=false;}
 postMessage(value){this.sent.push(value);}
 terminate(){this.terminated=true;}
 reply(value){this.dispatchEvent(new MessageEvent('message',{data:value}));}
}
const payload=()=>({cx:0,cz:0,terrain:{positions:new Float32Array(49*49*3)},mudInputs:{cx:0,cz:0,seed:1,scale:.115,site:null,heights:new Float32Array(49*49),inside:Array.from({length:130},()=>[0,0,false]),slopes:Array.from({length:10},()=>[0,0,0])}});
const result=()=>({position:new Float32Array([0,0,0,1,0,0,0,0,1]),normal:new Float32Array([0,1,0,0,1,0,0,1,0]),uv:new Float32Array(6),userData:{mudPatches:1}});
test('mud preparation preserves the confirmed snapshot and returns owned geometry',async()=>{
 const worker=new WorkerFake(),preparer=createWebGpuMudPreparer({worker}),input=payload(),pending=preparer.prepare(input,1);assert.notEqual(worker.sent[0].input.heights,input.mudInputs.heights);worker.reply({id:worker.sent[0].id,result:result()});const geometry=await pending;assert.equal(geometry.attributes.position.count,3);assert.equal(input.mudInputs.heights.length,49*49);geometry.dispose();preparer.dispose();assert.equal(worker.terminated,true);
});
test('cancelled and superseded work cannot publish a geometry',async()=>{
 const worker=new WorkerFake(),preparer=createWebGpuMudPreparer({worker}),controller=new AbortController(),input=payload(),old=preparer.prepare(input,1,{signal:controller.signal}),oldFailure=assert.rejects(old,/stale|cancelled/i);controller.abort();const current=preparer.prepare(input,2);await oldFailure;worker.reply({id:worker.sent[0].id,result:result()});assert.equal(worker.sent.length,2);worker.reply({id:worker.sent[1].id,result:null});assert.equal(await current,null);preparer.dispose();
});
