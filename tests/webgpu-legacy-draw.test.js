import test from 'node:test';
import assert from 'node:assert/strict';
import {exclusiveWebGpuDrawEnabled,renderWithOptionalWebGpuPresentation} from '../src/app/webgpu-legacy-draw.js';
import {WorldScene} from '../src/rendering/scene.js';
import {PerspectiveCamera,Vector3} from 'three';

test('WebGPU development world uses exclusive draw unless comparison is explicit',()=>{
 assert.equal(exclusiveWebGpuDrawEnabled(new URLSearchParams('qa-webgpu-world'),true),true);
 assert.equal(exclusiveWebGpuDrawEnabled(new URLSearchParams('qa-webgpu-world&qa-webgpu-allow-legacy-draw'),true),false);
 assert.equal(exclusiveWebGpuDrawEnabled(new URLSearchParams(''),true),false);
 assert.equal(exclusiveWebGpuDrawEnabled(new URLSearchParams('qa-webgpu-world'),false),false);
});

test('legacy draw remains active until WebGPU has submitted its first frame',()=>{
 let renders=0,updates=0,status={phase:'running',backend:'WebGPU',firstFrameRendered:false};
 const world={webGpuWorld:{client:{status:()=>status}},render(){renders++;},*renderFrameUpdates(){updates++;}};
 renderWithOptionalWebGpuPresentation(world,.1,true);assert.deepEqual({renders,updates},{renders:1,updates:0});
 status={...status,firstFrameRendered:true};renderWithOptionalWebGpuPresentation(world,.1,true);assert.deepEqual({renders,updates},{renders:1,updates:1});
});

test('only suppresses duplicate draws while the WebGPU worker is running',()=>{
 let renders=0,updates=0,status={phase:'running',backend:'WebGPU',firstFrameRendered:true};
 const world={webGpuWorld:{client:{status:()=>status}},render(){renders++;},*renderFrameUpdates(dt,farDt,options){assert.equal(dt,.1);assert.equal(farDt,.1);assert.deepEqual(options,{legacyDraw:false});updates++;yield;}};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 assert.deepEqual({renders,updates},{renders:0,updates:1});
 status={phase:'failed',backend:'WebGPU'};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 status={phase:'running',backend:'WebGL'};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 renderWithOptionalWebGpuPresentation(world,.1,false);
 assert.deepEqual({renders,updates},{renders:3,updates:1});
});

test('WebGPU keeps interaction phases but resumes legacy visual preparation before fallback draw',()=>{
 const calls=[],camera=new PerspectiveCamera(),target=new Vector3(),originalStats={old:true};let status={phase:'running',backend:'WebGPU',firstFrameRendered:true};
 const world={webGpuWorld:{client:{status:()=>status}},shaderFailure:{current:null},resize(){calls.push('resize');},cinematic:false,updateCamera(){calls.push('camera');},raidCamera:{update(){calls.push('raid-camera');}},strokePreview:{render(){calls.push('stroke');}},camera,nav:{field:{}},renderOrigin:{x:0,z:0,update:()=>false},controls:{target},syncChunks(){calls.push('chunks');},chunks:new Map(),quality:'media',state:{elapsed:0},simElapsed:0,scene:{fog:null},sync(){calls.push('sync');},obstructionStats:originalStats,farVegetation:{update(){calls.push('far');}},assetGroups:{update(){calls.push('asset-groups');}},updateHands(){calls.push('hands');},workVfx:{update(){calls.push('vfx');}},toon:{uniforms:{uWorldOrigin:{value:{set(){calls.push('toon');}}}}},prepareFrameResources(){calls.push('legacy-preparation');},renderFrameUpdates:WorldScene.prototype.renderFrameUpdates,render:WorldScene.prototype.render,drawRenderFrame(){calls.push('draw');}};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 assert.deepEqual(calls,['resize','camera','raid-camera','stroke','chunks','sync','far','hands','vfx']);assert.equal(world.obstructionStats,originalStats);
 calls.length=0;status={phase:'failed',backend:'WebGPU'};renderWithOptionalWebGpuPresentation(world,.1,true);
 assert.deepEqual(calls,['resize','camera','raid-camera','stroke','chunks','sync','far','asset-groups','hands','vfx','toon','legacy-preparation','draw']);assert.notEqual(world.obstructionStats,originalStats);
});
