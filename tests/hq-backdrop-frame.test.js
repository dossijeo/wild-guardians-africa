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

test('one transparent column frames an odd-width generated source without changing any source pixel',async()=>{
 const name='volcanoes-ridge-d-v2.png',{data,info}=await read(name);
 assert.equal(info.width,2171);assert.equal(info.height,724);
 assert.throws(()=>hqBackdropCrop(data,info.width,info.height),/distortion/);
 const crop=hqBackdropCrop(data,info.width,info.height,{rightPadding:1});
 assert.deepEqual(crop,{left:0,top:181,width:2172,height:543});
 const framed=await sharp('assets-source/far-backdrops-hq/'+name).extend({right:1,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(framed.info.width,2172);assert.equal(framed.info.height,724);
 for(let y=0;y<724;y++){
  assert.deepEqual(framed.data.subarray(y*2172*4,(y*2172+2171)*4),data.subarray(y*2171*4,(y+1)*2171*4));
  assert.deepEqual([...framed.data.subarray((y*2172+2171)*4,(y+1)*2172*4)],[0,0,0,0]);
 }
 for(const rightPadding of [-1,4,.5,NaN])assert.throws(()=>hqBackdropCrop(data,2171,724,{rightPadding}),/padding/);
});
