import test from 'node:test';import assert from 'node:assert/strict';import {ShaderChunk} from 'three';import {densityFogFactor,densityFogFragment} from '../tools/experiments/far-density-fog.js';
test('density removal approaches atmospheric color before visible Bayer coverage is lost',()=>{
 assert.equal(densityFogFactor(1),0);assert.equal(densityFogFactor(0),1);assert.ok(densityFogFactor(.6903984055605633)>.94);let previous=1;for(let i=0;i<=1000;i++){const f=densityFogFactor(i/1000);assert.ok(f<=previous);previous=f;}for(const c of [-.1,1.1,NaN])assert.throws(()=>densityFogFactor(c),/Invalid/);
});
test('far density atmosphere reuses the existing fog mix and preserves linear and exponential recipes',()=>{
 const mix='gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );';assert.equal(densityFogFragment.split(mix).length-1,1);assert.ok(densityFogFragment.includes('smoothstep( fogNear, fogFar, vFogDepth )'));assert.ok(densityFogFragment.includes('exp( - fogDensity * fogDensity * vFogDepth * vFogDepth )'));assert.ok(!/texture|sampler|vMix|uniform|pow\(/.test(densityFogFragment));assert.equal(densityFogFragment.replace(/float densitySquared[\s\S]*?gl_FragColor.rgb = mix/, 'gl_FragColor.rgb = mix'),ShaderChunk.fog_fragment);
});
