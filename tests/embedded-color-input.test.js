import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {prepareEmbeddedColorInput} from '../tools/embedded-color-input.mjs';
import {readGlb,writeGlb} from '../tools/glb-container.mjs';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile(new URL('content/manifests/web-assets.json',root),'utf8'));
const record=manifest.records.find(r=>r.runtime.includes('cb7a23479fb9'));
const [original,runtime]=await Promise.all([readFile(new URL('public/'+record.source,root)),readFile(new URL('public/'+record.runtime,root))]);
test('warthog color input derives from original 4096 PNG at unchanged runtime 2048 resolution',async()=>{
 const before=[hash(original),hash(runtime)],prepared=await prepareEmbeddedColorInput(original,runtime,1),meta=await sharp(prepared.bytes).metadata();
 assert.equal(meta.format,'png');assert.deepEqual([meta.width,meta.height],[2048,2048]);assert.equal(prepared.format,'png');
 assert.deepEqual(prepared.provenance.originalDimensions,[4096,4096]);assert.deepEqual(prepared.provenance.runtimeDimensions,[2048,2048]);
 const g=readGlb(original),v=g.json.bufferViews[g.json.images[1].bufferView],pixels=g.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
 const expected=await sharp(pixels).resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 assert.ok(prepared.bytes.equals(expected));assert.equal(prepared.provenance.originalImageSha256,hash(pixels));assert.equal(prepared.provenance.uploadSha256,hash(prepared.bytes));
 assert.notEqual(hash(prepared.bytes),prepared.provenance.runtimeImageSha256);assert.deepEqual([hash(original),hash(runtime)],before);
});
test('normal/data and mismatched original/runtime color consumers are excluded before any provider exists',async()=>{
 for(const index of [0,2,-1,.5])await assert.rejects(prepareEmbeddedColorInput(original,runtime,index));
 const g=readGlb(runtime);g.json.materials[0].pbrMetallicRoughness.baseColorTexture.index=0;
 await assert.rejects(prepareEmbeddedColorInput(original,writeGlb(g.json,g.bin),1),/matching exclusively color/);
});
test('external original image storage is rejected rather than guessed or fetched',async()=>{
 const g=readGlb(original);g.json.images[1].uri='https://example.invalid/image.png';
 await assert.rejects(prepareEmbeddedColorInput(writeGlb(g.json,g.bin),runtime,1),/storage/);
});

async function runtimeWithImage(width,height){
 const g=readGlb(runtime),image=await sharp({create:{width,height,channels:3,background:'#785b35'}}).webp().toBuffer();
 const offset=Math.ceil(g.bin.length/4)*4,bin=Buffer.concat([g.bin,Buffer.alloc(offset-g.bin.length),image]);
 const view=g.json.bufferViews[g.json.images[1].bufferView];view.byteOffset=offset;view.byteLength=image.length;
 g.json.buffers[0].byteLength=bin.length;return writeGlb(g.json,bin);
}

test('runtime dimensions cannot change the original aspect ratio or enlarge the source',async()=>{
 await assert.rejects(prepareEmbeddedColorInput(original,await runtimeWithImage(2048,1024),1),/aspect ratio mismatch/);
 await assert.rejects(prepareEmbeddedColorInput(original,await runtimeWithImage(8192,1),1),/runtime resolution/);
});

test('invalid embedded ranges are rejected before decoding any image',async()=>{
 for(const offset of [-1,Number.MAX_SAFE_INTEGER]){
  const g=readGlb(original);g.json.bufferViews[g.json.images[1].bufferView].byteOffset=offset;
  await assert.rejects(prepareEmbeddedColorInput(writeGlb(g.json,g.bin),runtime,1),/storage/);
 }
});
