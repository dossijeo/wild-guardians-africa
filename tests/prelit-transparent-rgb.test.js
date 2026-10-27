import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {downsamplePrelitLinear} from '../tools/experiments/downsample-prelit-linear.js';

test('premultiplied atlas removes RGB where quantized alpha is zero',()=>{
 const rgba=new Uint8Array(4*4*4);rgba.set([255,0,255,1]);
 const out=downsamplePrelitLinear(rgba,4,4,4);
 assert.deepEqual([...out.data],[0,0,0,0]);
});
test('lossless WebP exact preserves transparent RGB required by GPU mipmaps',async()=>{
 const rgba=new Uint8Array(32*32*4);
 for(let y=8;y<24;y++)for(let x=8;x<24;x++)rgba.set([40,160,20,255],(y*32+x)*4);
 const encoded=await sharp(rgba,{raw:{width:32,height:32,channels:4}}).webp({lossless:true,exact:true}).toBuffer();
 const decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
 assert.deepEqual(decoded,Buffer.from(rgba));
});
