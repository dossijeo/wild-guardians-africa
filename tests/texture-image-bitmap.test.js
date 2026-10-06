import test from 'node:test';import assert from 'node:assert/strict';
import {Texture} from 'three';
import {textureImageBitmap} from '../tools/experiments/texture-image-bitmap.js';
test('bitmap conversion preserves texture upload orientation and restores source on release',async()=>{
 const image={},texture=new Texture(image);texture.flipY=true;texture.premultiplyAlpha=true;let closes=0;const bitmap={width:4,height:8,close(){closes++;}};
 const result=await textureImageBitmap(texture,{createBitmap:async(source,options)=>{assert.equal(source,image);assert.deepEqual(options,{imageOrientation:'flipY',premultiplyAlpha:'premultiply',colorSpaceConversion:'none'});return bitmap;}});
 assert.equal(texture.image,bitmap);result.release();result.release();assert.equal(texture.image,image);assert.equal(closes,1);
});
test('conversion cancelled while waiting closes bitmap without replacing original image',async()=>{
 const image={},texture=new Texture(image);let cancelled=false,closed=false;
 await assert.rejects(textureImageBitmap(texture,{cancelled:()=>cancelled,createBitmap:async()=>{cancelled=true;return {close(){closed=true;}};}}),/cancelled/);
 assert.equal(closed,true);assert.equal(texture.image,image);
});
