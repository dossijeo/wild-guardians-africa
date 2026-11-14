import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {smallerLosslessImage} from '../tools/smaller-lossless-image.mjs';
test('retain original JPEG only when its decoded pixels equal the larger lossless conversion',async()=>{
 const source=await sharp({create:{width:16,height:16,channels:3,background:'#6792ca'}}).jpeg().toBuffer();
 const encoded=Buffer.concat([await sharp(source).webp({lossless:true}).toBuffer(),Buffer.alloc(1024)]);
 const options={lossless:true,mimeType:'image/jpeg',width:16,height:16};
 const result=await smallerLosslessImage(source,encoded,options);assert.equal(result.retained,true);assert.equal(result.bytes,source);assert.equal(result.mimeType,'image/jpeg');
 for(const changes of [{lossless:false},{width:4096},{mimeType:'image/unknown'}])assert.equal((await smallerLosslessImage(source,encoded,{...options,...changes})).retained,false);
 const different=Buffer.concat([await sharp({create:{width:16,height:16,channels:3,background:'#ff0000'}}).webp({lossless:true}).toBuffer(),Buffer.alloc(1024)]);
 assert.equal((await smallerLosslessImage(source,different,options)).retained,false,'a lossless label alone cannot establish pixel equality');
});
