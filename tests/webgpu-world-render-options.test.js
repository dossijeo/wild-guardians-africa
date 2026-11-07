import test from 'node:test';
import assert from 'node:assert/strict';
import {WebGPURenderer} from 'three/webgpu';
import {webGpuWorldRenderOptions} from '../src/rendering/webgpu-world-render-options.js';

test('the world requests four-sample MSAA by default and keeps an explicit fallback',()=>{
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}};
 assert.equal(new WebGPURenderer(webGpuWorldRenderOptions(canvas)).samples,4);
 assert.equal(new WebGPURenderer(webGpuWorldRenderOptions(canvas,'true')).samples,4);
 assert.equal(new WebGPURenderer(webGpuWorldRenderOptions(canvas,'false')).samples,0);
 assert.throws(()=>webGpuWorldRenderOptions(canvas,'unexpected'),/options/);
});
