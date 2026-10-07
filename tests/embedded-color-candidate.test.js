import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {prepareEmbeddedColorInput} from '../tools/embedded-color-input.mjs';
import {replaceWebGlbColorImages} from '../tools/repack_web_glb_images.mjs';
import {verifyEmbeddedColorCandidate} from '../tools/verify-embedded-color-candidate.mjs';
import {readGlb,writeGlb} from '../tools/glb-container.mjs';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('content/manifests/web-assets.json',root),'utf8'));
const record=manifest.records.find(record=>record.runtime.includes('cb7a23479fb9'));
const [original,runtime]=await Promise.all([record.source,record.runtime].map(path=>readFile(new URL('public/'+path,root))));
const prepared=await prepareEmbeddedColorInput(original,runtime,1);
const lossless=await sharp(prepared.bytes).webp({lossless:true}).toBuffer(),candidate=await replaceWebGlbColorImages(runtime,new Map([[1,lossless]]));

test('independent decoded gate verifies original geometry and color pixels without a provider',async()=>{
 const report=await verifyEmbeddedColorCandidate(original,runtime,candidate,1);
 assert.equal(report.decodedGeometryViews,1521);assert.ok(report.decodedGeometryBytes>0);
 assert.equal(report.decodedGeometryMaxError,0);assert.equal(report.otherImagesByteExact,2);
 assert.equal(report.alphaDifferences,0);assert.equal(report.colorPixelsExact,true);assert.equal(report.rmse,0);
 assert.deepEqual(report.newErrors,[]);
});

test('validly encoded changed geometry is rejected against the original, not accepted from container validity',async()=>{
 const g=readGlb(candidate),view=g.json.bufferViews.find(view=>view.extensions?.EXT_meshopt_compression?.mode==='ATTRIBUTES');
 // A decoder-valid byte stream from another block cannot be assumed equivalent.
 const ext=view.extensions.EXT_meshopt_compression,other=g.json.bufferViews.find(other=>other!==view&&other.extensions?.EXT_meshopt_compression?.mode==='ATTRIBUTES'&&other.extensions.EXT_meshopt_compression.count===ext.count&&other.extensions.EXT_meshopt_compression.byteStride===ext.byteStride&&other.extensions.EXT_meshopt_compression.byteLength!==ext.byteLength);
 assert.ok(other,'Real model must provide a same-layout replacement block');
 view.extensions.EXT_meshopt_compression={...other.extensions.EXT_meshopt_compression};
 await assert.rejects(verifyEmbeddedColorCandidate(original,runtime,writeGlb(g.json,g.bin),1),/Decoded geometry changed/);
});

test('changed animation metadata is rejected before it can be attributed to color conversion',async()=>{
 const g=readGlb(candidate);g.json.animations[0].name+=' changed';
 await assert.rejects(verifyEmbeddedColorCandidate(original,runtime,writeGlb(g.json,g.bin),1),/Runtime metadata changed: animations/);
});
