import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {losslessDataWebp,compareDataPixels,requireDataImage,dataPixels} from '../tools/lossless-data-image.mjs';
test('lossless data conversion preserves independent RGB channels, dimensions and all opaque alpha samples',async()=>{
 const raw=Buffer.from(Array.from({length:8*8*3},(_,i)=>(i*37+Math.floor(i/3)*13)%256));
 const input=await sharp(raw,{raw:{width:8,height:8,channels:3}}).png().toBuffer(),r=await losslessDataWebp(input),decoded=await dataPixels(r.output);
 assert(r.comparison.rawPixelsEqual);assert.equal(decoded.info.width,8);assert.equal(decoded.info.height,8);
 for(let p=0;p<64;p++){assert.equal(decoded.data[p*4+3],255);for(let c=0;c<3;c++)assert.equal(decoded.data[p*4+c],raw[p*3+c]);}
});
test('data comparison rejects one changed channel even if image dimensions and visible alpha match',async()=>{
 const a=Buffer.from([128,127,254,20,40,60]),b=Buffer.from(a);b[2]--;
 const encode=x=>sharp(x,{raw:{width:2,height:1,channels:3}}).png().toBuffer();
 const r=await compareDataPixels(await encode(a),await encode(b));assert(r.dimensionsMatch);assert.equal(r.rawPixelsEqual,false);assert.notEqual(r.sourcePixelSha256,r.runtimePixelSha256);
});
test('16-bit PNG is rejected instead of silently truncating data',async()=>{
 const input=await sharp({create:{width:2,height:2,channels:3,background:'#abcdef'}}).toColourspace('rgb16').png().toBuffer();
 assert.equal((await sharp(input).metadata()).bitsPerSample,16);await assert.rejects(losslessDataWebp(input),/depth/);
});
test('profiles, orientation, animation and unsupported channel layouts need review',()=>{
 const m={format:'png',space:'srgb',depth:'uchar',channels:3};requireDataImage(m);
 for(const change of [{hasProfile:true},{icc:Buffer.from('profile')},{orientation:6},{pages:2},{channels:5},{space:'cmyk'}])assert.throws(()=>requireDataImage({...m,...change}),/review/);
});

test('grayscale mask conversion replicates each exact scalar into RGB and keeps opaque alpha',async()=>{
 const raw=Buffer.from([0,1,42,100,127,128,200,255]);
 const input=await sharp(raw,{raw:{width:8,height:1,channels:1}}).toColourspace('b-w').png().toBuffer();
 assert.equal((await sharp(input).metadata()).space,'b-w');const r=await losslessDataWebp(input),decoded=await dataPixels(r.output);assert(r.comparison.rawPixelsEqual);
 for(let i=0;i<8;i++){for(let c=0;c<3;c++)assert.equal(decoded.data[i*4+c],raw[i]);assert.equal(decoded.data[i*4+3],255);}
});
