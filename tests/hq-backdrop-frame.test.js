import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {hqBackdropCrop} from '../tools/experiments/hq-backdrop-frame.js';
const read=async filename=>sharp('assets-source/far-backdrops-hq/'+filename).ensureAlpha().raw().toBuffer({resolveWithObject:true});
test('original desert framing is rejected rather than cutting 52 runtime-visible pixels',async()=>{
 const {data,info}=await read('desert-v1.png');assert.throws(()=>hqBackdropCrop(data,info.width,info.height),/52 visible pixels/);
});
test('imagegen-reframed desert retains every visible peak under a proportional 4:1 crop',async()=>{
 const {data,info}=await read('desert-v2.png'),crop=hqBackdropCrop(data,info.width,info.height);
 assert.deepEqual(crop,{left:0,top:181,width:2172,height:543});assert.equal(crop.width/crop.height,4);
});
test('all five untouched original biome sources fit the same no-distortion crop',async()=>{
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons']){
  const {data,info}=await read(biome+'-v1.png'),crop=hqBackdropCrop(data,info.width,info.height);assert.equal(crop.width/crop.height,4);assert.equal(crop.top,181);
 }
});
test('unsafe dimensions and malformed RGBA input fail closed',()=>{
 assert.throws(()=>hqBackdropCrop(new Uint8Array(4),4,4),/RGBA/);
 assert.throws(()=>hqBackdropCrop(new Uint8Array(3*4*4),3,4),/distortion/);
});
