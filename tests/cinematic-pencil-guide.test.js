import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {prepareCinematicGuide} from '../src/ui/cinematic-pencil-guide.js';

test('WebGPU supplies a guide URL without decoding on the interface thread; WebGL keeps its existing loader',async()=>{
 const calls=[],loadImage=async path=>{calls.push(path);return {decoded:true};},imageUrl=path=>`/cinematics/${path}`;
 const common={pencil:{},sceneId:'01',loadImage,imageUrl};
 assert.deepEqual(await prepareCinematicGuide({...common,backend:'webgpu-worker'}),{src:'/cinematics/pencil-guides/scene-01.webp'});
 assert.deepEqual(calls,[]);
 assert.deepEqual(await prepareCinematicGuide({...common,backend:'webgl'}),{decoded:true});
 assert.deepEqual(calls,['pencil-guides/scene-01.webp']);
 assert.equal(await prepareCinematicGuide({...common,backend:'webgl',loadImage:async()=>{throw Error('missing');}}),null);
 assert.equal(await prepareCinematicGuide({...common,sceneId:'extra',backend:'webgpu-worker'}),null);
});

test('a missing WebGPU guide skips only that scene and a later scene remains available',async()=>{
 const messages=[],self={},device={lost:new Promise(()=>{}),createShaderModule:()=>({}),createRenderPipelineAsync:async()=>({getBindGroupLayout:()=>({})}),createSampler:()=>({}),createBuffer:()=>({destroy(){}}),createTexture:()=>({createView:()=>({}),destroy(){}}),createBindGroup:()=>({}),queue:{copyExternalImageToTexture(){},onSubmittedWorkDone:async()=>{}}};
 const context={self,postMessage:message=>messages.push(message),navigator:{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=> 'rgba8unorm'}},GPUBufferUsage:{UNIFORM:1,COPY_DST:2},GPUTextureUsage:{TEXTURE_BINDING:1,COPY_DST:2,RENDER_ATTACHMENT:4},fetch:async url=>({ok:url!=='missing',blob:async()=>({})}),createImageBitmap:async()=>({width:2,height:2,close(){}}),AbortController,Promise,Float32Array,close(){}};
 vm.runInNewContext(await readFile(new URL('../src/ui/cinematic-pencil-webgpu-worker.js',import.meta.url),'utf8'),context);
 self.onmessage({data:{kind:'initialize',canvas:{getContext:()=>({configure(){}})}}});
 await new Promise(resolve=>setImmediate(resolve));
 self.onmessage({data:{kind:'scene',scene:1,image:'image',guide:'missing',seed:0,width:2,height:2}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.some(message=>message.kind==='failure'),false);
 assert.equal(messages.some(message=>message.kind==='scene-ready'&&message.scene===1),false);
 self.onmessage({data:{kind:'scene',scene:2,image:'image',guide:'guide',seed:0,width:2,height:2}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.some(message=>message.kind==='scene-ready'&&message.scene===2),true);
});
