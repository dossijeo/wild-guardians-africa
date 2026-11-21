import test from 'node:test';
import assert from 'node:assert/strict';
import {DirectionalLight,HemisphereLight} from 'three';
import {skyNight} from '../src/rendering/sky.js';
import {syncWebGpuWorldLighting} from '../src/rendering/webgpu-world-lighting.js';
test('WebGPU lights use the same confirmed game clock as the current scene',()=>{const sun=new DirectionalLight(),ambient=new HemisphereLight();for(const state of [{day:1,time:0},{day:1,time:300.2},{day:1,time:305},{day:2,time:0},{day:2,time:3}]){const expected=skyNight(state),night=syncWebGpuWorldLighting(state,sun,ambient);assert.equal(night,expected);assert.equal(sun.intensity,3-2.6*expected);assert.equal(ambient.intensity,2-.9*expected);}assert.throws(()=>syncWebGpuWorldLighting(null,sun,ambient),/Invalid/);});
