import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readGlb,writeGlb} from '../tools/glb-container.mjs';
import {replaceWebGlbColorImages} from '../tools/repack_web_glb_images.mjs';
import {gltfImageRoles} from '../tools/audit_image_assets.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const physical=(bin,range)=>bin.subarray(range.byteOffset??0,(range.byteOffset??0)+range.byteLength);
function withJunkChunk(source){
 const chunk=Buffer.alloc(72);chunk.write('JUNK');chunk.writeUInt32LE(64,4);
 const bytes=Buffer.concat([source,chunk]);bytes.writeUInt32LE(bytes.length-8,4);return bytes;
}
function stableMetadata(source){
 const j=structuredClone(source),images=new Set(j.images.map(image=>image.bufferView));delete j.buffers[0].byteLength;
 for(const [i,v] of j.bufferViews.entries())if(images.has(i)){delete v.byteOffset;delete v.byteLength;}else delete v.extensions.EXT_meshopt_compression.byteOffset;
 return j;
}
function assertPreserved(before,after,changed){
 assert.deepEqual(stableMetadata(after.json),stableMetadata(before.json));
 for(const [index,view] of before.json.bufferViews.entries())if(view.extensions?.EXT_meshopt_compression){
  assert.deepEqual(physical(after.bin,after.json.bufferViews[index].extensions.EXT_meshopt_compression),physical(before.bin,view.extensions.EXT_meshopt_compression),'compressed view '+index);
 }
 for(const [index,image] of before.json.images.entries())if(!changed.has(index))assert.deepEqual(physical(after.bin,after.json.bufferViews[after.json.images[index].bufferView]),physical(before.bin,before.json.bufferViews[image.bufferView]),'untouched image '+index);
}
async function fixture(){
 const rgba=Buffer.from(Array.from({length:4*4*4},(_,i)=>i%4===3?i%8===3?255:100:60+i));
 const color=await sharp(rgba,{raw:{width:4,height:4,channels:4}}).webp({lossless:true}).toBuffer(),normal=await sharp({create:{width:4,height:4,channels:3,background:'#8080ff'}}).webp({lossless:true}).toBuffer();
 const parts=[],append=bytes=>{const byteOffset=parts.reduce((n,b)=>n+b.length,0);parts.push(bytes,Buffer.alloc((4-bytes.length%4)%4));return {buffer:0,byteOffset,byteLength:bytes.length};};
 const colorView=append(color),normalView=append(normal),compressed=append(Buffer.from([4,3,2,1,9,8,7,6]));
 const json={asset:{version:'2.0'},buffers:[{byteLength:parts.reduce((n,b)=>n+b.length,0)},{byteLength:48,extensions:{EXT_meshopt_compression:{fallback:true}}}],bufferViews:[colorView,normalView,{buffer:1,byteOffset:0,byteLength:48,extensions:{EXT_meshopt_compression:{...compressed,byteStride:12,count:4,mode:'ATTRIBUTES',filter:'NONE'}}}],images:[{mimeType:'image/webp',bufferView:0},{mimeType:'image/webp',bufferView:1}],textures:[{extensions:{EXT_texture_webp:{source:0}}},{extensions:{EXT_texture_webp:{source:1}}}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}},normalTexture:{index:1}}],extensionsUsed:['EXT_meshopt_compression','EXT_texture_webp'],extensionsRequired:['EXT_meshopt_compression','EXT_texture_webp']};
 return {bytes:writeGlb(json,Buffer.concat(parts)),color,normal,rgba};
}
test('all textured runtime GLBs retain exact compressed geometry, animation and skin storage',async t=>{
 const manifest=JSON.parse(await readFile(new URL('../content/manifests/web-assets.json',import.meta.url),'utf8'));assert.ok(manifest.records.length>=20);
 for(const record of manifest.records){
  const bytes=await readFile(new URL('../public/'+record.runtime,import.meta.url)),before=readGlb(bytes);
  if(!(before.json.images?.length)){assert.ok(before.json.bufferViews.some(v=>v.extensions?.EXT_meshopt_compression),'Geometry-only GLB retains compressed payloads');continue;}
  const index=before.json.images.findIndex((_,i)=>!gltfImageRoles(before.json,i).requiresExactPixels);
  assert.ok(index>=0);const source=physical(before.bin,before.json.bufferViews[before.json.images[index].bufferView]),originalHash=hash(bytes);
  const replacement=withJunkChunk(source),output=await replaceWebGlbColorImages(bytes,new Map([[index,replacement]])),after=readGlb(output);
  assertPreserved(before,after,new Set([index]));assert.equal(hash(bytes),originalHash);
  assert.ok(Buffer.from(physical(after.bin,after.json.bufferViews[after.json.images[index].bufferView])).equals(replacement));
  const compressedIndex=before.json.bufferViews.findIndex(view=>view.extensions?.EXT_meshopt_compression);
  assert.notEqual(after.json.bufferViews[compressedIndex].extensions.EXT_meshopt_compression.byteOffset,before.json.bufferViews[compressedIndex].extensions.EXT_meshopt_compression.byteOffset);
  t.diagnostic(record.runtime+' compressed views and metadata unchanged');
 }
});
test('changed color byte length relocates compressed payloads without changing any bytes or GLTF references',async()=>{
 const {bytes,rgba}=await fixture(),before=readGlb(bytes),replacement=await sharp(rgba,{raw:{width:4,height:4,channels:4}}).webp({lossless:true,effort:0}).toBuffer();
 // A valid, ignored RIFF JUNK chunk changes file length without changing pixels.
 const padded=withJunkChunk(replacement),output=await replaceWebGlbColorImages(bytes,new Map([[0,padded]])),after=readGlb(output);
 assert.notEqual(after.json.bufferViews[2].extensions.EXT_meshopt_compression.byteOffset,before.json.bufferViews[2].extensions.EXT_meshopt_compression.byteOffset);
 assert.ok(Buffer.from(physical(after.bin,after.json.bufferViews[0])).equals(padded));assertPreserved(before,after,new Set([0]));
 assert.deepEqual(await sharp(physical(after.bin,after.json.bufferViews[0])).raw().toBuffer(),await sharp(physical(before.bin,before.json.bufferViews[0])).raw().toBuffer());
});
test('the native two-material model accepts both color replacements in any Map order',async()=>{
 const bytes=await readFile(new URL('../public/assets/web/be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb',import.meta.url)),before=readGlb(bytes);
 const indices=before.json.images.flatMap((_,i)=>gltfImageRoles(before.json,i).requiresExactPixels?[]:[i]);assert.deepEqual(indices,[1,4]);
 const replacements=new Map(indices.reverse().map(i=>[i,withJunkChunk(physical(before.bin,before.json.bufferViews[before.json.images[i].bufferView]))]));
 const after=readGlb(await replaceWebGlbColorImages(bytes,replacements));assertPreserved(before,after,new Set(indices));
 for(const [i,expected] of replacements)assert.ok(Buffer.from(physical(after.bin,after.json.bufferViews[after.json.images[i].bufferView])).equals(expected));
});
test('empty replacement preserves the original container byte for byte',async()=>{
 const {bytes}=await fixture();assert.deepEqual(await replaceWebGlbColorImages(bytes,new Map()),bytes);
});
test('normal, mixed-use, alpha-changing, wrong-size and non-WebP images are rejected',async()=>{
 const {bytes,color,normal,rgba}=await fixture();await assert.rejects(replaceWebGlbColorImages(bytes,new Map([[1,normal]])),/exclusively a color/);
 const mixed=readGlb(bytes);mixed.json.materials[0].normalTexture.index=0;await assert.rejects(replaceWebGlbColorImages(writeGlb(mixed.json,mixed.bin),new Map([[0,color]])),/exclusively a color/);
 const altered=Buffer.from(rgba);altered[3]=0;await assert.rejects(replaceWebGlbColorImages(bytes,new Map([[0,await sharp(altered,{raw:{width:4,height:4,channels:4}}).webp({lossless:true}).toBuffer()]])),/alpha coverage/);
 for(const replacement of [await sharp(color).resize(2,2).webp().toBuffer(),await sharp(color).png().toBuffer()])await assert.rejects(replaceWebGlbColorImages(bytes,new Map([[0,replacement]])),/preserve dimensions/);
});
test('unsupported storage and extensions fail before changing the source container',async()=>{
 const {bytes,color}=await fixture();
 for(const mutate of [j=>j.extensionsUsed.push('EXT_unreviewed_offsets'),j=>j.images[1].bufferView=0,j=>j.bufferViews[2].buffer=0,j=>j.bufferViews[2].extensions.EXT_meshopt_compression.byteOffset=999999,j=>j.buffers[0].byteLength=1,j=>j.images[0].uri='external.webp']){
  const {json,bin}=readGlb(bytes);mutate(json);const bad=writeGlb(json,bin),original=hash(bad);await assert.rejects(replaceWebGlbColorImages(bad,new Map([[0,color]])),/Web GLB image replacement/);assert.equal(hash(bad),original);
 }
 for(const replacements of [new Map([[9,color]]),new Map([[.5,color]]),new Map([[0,new Uint8Array()]]),new Map([[0,'bytes']])])await assert.rejects(replaceWebGlbColorImages(bytes,replacements),/invalid replacement/);
});
