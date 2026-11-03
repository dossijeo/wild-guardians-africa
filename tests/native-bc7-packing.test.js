import test from 'node:test';import assert from 'node:assert/strict';
import {read,VK_FORMAT_BC7_SRGB_BLOCK,VK_FORMAT_BC7_UNORM_BLOCK} from 'three/addons/libs/ktx-parse.module.js';
import {packNativeBc7} from '../tools/experiments/pack_native_bc7.mjs';
test('native BC7 KTX2 stores exact mip blocks and preserves color transfer',()=>{
 const levels=[{width:8,height:4,data:Uint8Array.from({length:32},(_,i)=>i)},{width:4,height:2,data:Uint8Array.from({length:16},(_,i)=>i+32)}];
 for(const [colorSpace,format,transfer] of [['srgb',VK_FORMAT_BC7_SRGB_BLOCK,2],['srgb-linear',VK_FORMAT_BC7_UNORM_BLOCK,1]]){const result=read(packNativeBc7({width:8,height:4,colorSpace,levels}));assert.equal(result.vkFormat,format);assert.equal(result.supercompressionScheme,0);assert.equal(result.dataFormatDescriptor[0].colorModel,134);assert.equal(result.dataFormatDescriptor[0].transferFunction,transfer);assert.deepEqual(result.levels.map(l=>[...l.levelData]),levels.map(l=>[...l.data]));}
});
test('native BC7 packing rejects unsupported sizes and malformed mip blocks',()=>{
 const valid={width:4,height:4,colorSpace:'srgb',levels:[{width:4,height:4,data:new Uint8Array(16)}]};assert.throws(()=>packNativeBc7({...valid,width:5}),/metadata/);assert.throws(()=>packNativeBc7({...valid,colorSpace:'unknown'}),/metadata/);assert.throws(()=>packNativeBc7({...valid,levels:[{...valid.levels[0],data:new Uint8Array(15)}]}),/mip/);assert.throws(()=>packNativeBc7({...valid,levels:[{...valid.levels[0],width:8}]}),/mip/);
});
