import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import sharp from 'sharp';
import {backdropBiomes,backdropProfile,backdropSvg} from '../tools/experiments/far-backdrop-data.js';
test('offline backdrop silhouettes are deterministic, periodic and fit their fixed transparent atlas',()=>{
 for(const biome of backdropBiomes){assert.equal(backdropSvg(biome),backdropSvg(biome));for(let layer=0;layer<3;layer++){const p=backdropProfile(biome,layer);assert.equal(p[0][1],p.at(-1)[1]);assert.equal(p[0][0],0);assert.equal(p.at(-1)[0],2048);assert.ok(p.every(([,y])=>y>0&&y<512));}}
 assert.throws(()=>backdropSvg('unknown'),/Invalid/);
});
test('savanna layers have independent relief instead of sharing parallel height offsets',()=>{
 const a=backdropProfile('savanna',0),b=backdropProfile('savanna',1);const differences=a.map((p,i)=>b[i][1]-p[1]);assert.ok(Math.max(...differences)-Math.min(...differences)>80);assert.ok(Math.max(...a.map(p=>p[1]))-Math.min(...a.map(p=>p[1]))>130);
});
test('deployed backdrops match the offline generator and retain transparent sky at fixed resolution',async()=>{
 for(const biome of backdropBiomes){const actual=await fs.readFile(`public/assets/far-vegetation/${biome}-backdrop.webp`),expected=await sharp(Buffer.from(backdropSvg(biome))).webp({lossless:true,effort:4}).toBuffer();assert.deepEqual(actual,expected,biome);const {data,info}=await sharp(actual).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,2048);assert.equal(info.height,512);assert.equal(info.channels,4);assert.ok(data.some((v,i)=>i%4===3&&v===0));assert.ok(data.some((v,i)=>i%4===3&&v===255));}
});
