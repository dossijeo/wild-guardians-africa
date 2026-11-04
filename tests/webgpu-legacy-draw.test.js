import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWithOptionalWebGpuPresentation} from '../src/app/webgpu-legacy-draw.js';

test('only suppresses duplicate draws while the WebGPU worker is running',()=>{
 let renders=0,updates=0,status={phase:'running',backend:'WebGPU'};
 const world={webGpuWorld:{client:{status:()=>status}},render(){renders++;},*renderFrameUpdates(dt){assert.equal(dt,.1);updates++;yield;}};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 assert.deepEqual({renders,updates},{renders:0,updates:1});
 status={phase:'failed',backend:'WebGPU'};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 status={phase:'running',backend:'WebGL'};
 renderWithOptionalWebGpuPresentation(world,.1,true);
 renderWithOptionalWebGpuPresentation(world,.1,false);
 assert.deepEqual({renders,updates},{renders:3,updates:1});
});
