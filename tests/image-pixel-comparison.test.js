import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {compareColorPixels} from '../tools/image-pixel-comparison.mjs';

const rgba=async bytes=>sharp(Buffer.from(bytes),{raw:{width:2,height:1,channels:4}}).png().toBuffer();
test('exact alpha is checked independently from lossy RGB color changes',async()=>{
 const a=await rgba([10,20,30,0,100,110,120,128]),b=await rgba([11,20,30,0,102,110,120,128]);
 const r=await compareColorPixels(a,b);assert.equal(r.dimensionsMatch,true);assert.equal(r.alphaDifferences,0);
 assert.equal(r.rgbMeanAbsoluteDifference,.5);assert.equal(r.maxRgbDifference,2);
});
test('detects one changed alpha sample even when RGB colors are identical',async()=>{
 const a=await rgba([10,20,30,0,100,110,120,128]),b=await rgba([10,20,30,0,100,110,120,127]);
 const r=await compareColorPixels(a,b);assert.equal(r.alphaDifferences,1);assert.equal(r.maxAlphaDifference,1);assert.equal(r.rgbMeanAbsoluteDifference,0);
});
test('grayscale is normalized explicitly into RGB before alpha comparison',async()=>{
 const gray=await sharp(Buffer.from([10,100]),{raw:{width:2,height:1,channels:1}}).png().toBuffer();
 const rgb=await rgba([10,10,10,255,100,100,100,255]);
 const r=await compareColorPixels(gray,rgb);assert.equal(r.rgbMeanAbsoluteDifference,0);assert.equal(r.alphaDifferences,0);
});
test('changed dimensions produce no invented color/alpha score',async()=>{
 const a=await rgba([10,20,30,0,100,110,120,128]),b=await sharp(a).resize(1,1).png().toBuffer();
 const r=await compareColorPixels(a,b);assert.equal(r.dimensionsMatch,false);assert.equal(r.alphaDifferences,null);assert.equal(r.rgbMeanAbsoluteDifference,null);
});
