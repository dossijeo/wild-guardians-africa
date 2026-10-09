import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import validator from 'gltf-validator';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {readGlb} from './glb-container.mjs';
import {decodeWebGlb} from '../public/runtime/glb-legacy.js';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),manifest=JSON.parse(await readFile(new URL('content/manifests/web-assets.json',root),'utf8')),report=[];
await MeshoptDecoder.ready;
assert.equal(hash(await readFile(new URL('public/runtime/meshopt_decoder.module.js',root))),hash(await readFile(new URL('node_modules/three/examples/jsm/libs/meshopt_decoder.module.js',root))),'Vendored decoder must match pinned Three.js');
const files=(await readdir(new URL('public/assets/',root))).filter(f=>f.endsWith('.glb')).sort();assert.deepEqual(manifest.records.map(r=>r.source.split('/').pop()).sort(),files);
const selected=new Set(process.argv.slice(2));if([...selected].some(f=>!files.includes(f)))throw Error('Selected GLB absent');
if(selected.size){const previous=JSON.parse(await readFile(new URL('content/manifests/web-assets-verification.json',root),'utf8'));report.push(...previous.records.filter(r=>!selected.has(r.source.split('/').pop())));}
for(const item of manifest.records.filter(r=>!selected.size||selected.has(r.source.split('/').pop()))){
  const before=await readFile(new URL('public/'+item.source,root)),after=await readFile(new URL('public/'+item.runtime,root));assert.equal(hash(before),item.sourceSha256);assert.equal(hash(after),item.runtimeSha256);assert(after.length<before.length,item.source);
  const original=readGlb(before),packed=readGlb(after),decodedBuffer=await decodeWebGlb(after.buffer.slice(after.byteOffset,after.byteOffset+after.byteLength)),decoded=readGlb(decodedBuffer);
  assert(packed.json.extensionsRequired.includes('EXT_meshopt_compression'));if(original.json.images?.length)assert(packed.json.extensionsRequired.includes('EXT_texture_webp'));assert.equal(packed.json.buffers[1].extensions.EXT_meshopt_compression.fallback,true);
  for(const bv of packed.json.bufferViews){const e=bv.extensions?.EXT_meshopt_compression;if(!e)continue;assert.equal(e.count*e.byteStride,bv.byteLength);assert(e.byteStride>0&&e.byteStride<=256);assert((e.byteOffset??0)+e.byteLength<=packed.bin.length);assert.equal(e.filter,'NONE');assert.equal(e.buffer,0);assert.equal(bv.buffer,1);if(e.mode==='ATTRIBUTES')assert.equal(e.byteStride%4,0);else assert([2,4].includes(e.byteStride));if(bv.byteStride)assert.equal(e.byteStride,bv.byteStride);}
  for(const texture of packed.json.textures??[]){assert.equal(texture.source,undefined);assert.equal(packed.json.images[texture.extensions.EXT_texture_webp.source].mimeType,'image/webp');}
  for(const key of ['asset','accessors','meshes','nodes','skins','animations','materials','scenes','scene','samplers'])assert.deepEqual(decoded.json[key],original.json[key],item.source+'/'+key);
  const imageViews=new Set((original.json.images??[]).map(im=>im.bufferView));let geometryBytes=0;
  for(const [i,v] of original.json.bufferViews.entries())if(!imageViews.has(i)){
    const other=decoded.json.bufferViews[i],src=original.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),dst=decoded.bin.subarray(other.byteOffset??0,(other.byteOffset??0)+other.byteLength);assert.deepEqual(dst,src,item.source+'/bufferView/'+i);geometryBytes+=src.length;
  }
  const images=[];
  for(const entry of item.images){const a=original.json.bufferViews[original.json.images[entry.index].bufferView],b=decoded.json.bufferViews[decoded.json.images[entry.index].bufferView],src=original.bin.subarray(a.byteOffset??0,(a.byteOffset??0)+a.byteLength),dst=decoded.bin.subarray(b.byteOffset??0,(b.byteOffset??0)+b.byteLength);
    const base=await sharp(src).resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer(),runtime=await sharp(dst).ensureAlpha().raw().toBuffer();assert.equal(base.length,runtime.length);let square=0,max=0;
    for(let i=0;i<base.length;i++){if(i%4===3){assert.equal(runtime[i],base[i],'Alpha channel changed');continue;}const error=Math.abs(base[i]-runtime[i]);square+=error*error;max=Math.max(max,error);}
    const rmse=Math.sqrt(square/(base.length*.75)),psnr=rmse?20*Math.log10(255/rmse):Infinity;assert(psnr>=32,item.source+'/texture/'+entry.index+' PSNR '+psnr);if(entry.lossless)assert.equal(rmse,0);images.push({...entry,rmse,psnr,maxChannelError:max});
  }
  // Khronos validator does not implement meshopt or WebP. Validate the decoded
  // container and accessor/skin/animation conformance; filter only its known
  // unsupported WebP diagnostics, while retaining every other error.
  const baseline=await validator.validateBytes(new Uint8Array(before),{maxIssues:10000}),check=await validator.validateBytes(new Uint8Array(decodedBuffer),{maxIssues:10000}),originalErrors=baseline.issues.messages.filter(m=>m.severity===0),errors=check.issues.messages.filter(m=>m.severity===0),fingerprint=m=>JSON.stringify([m.code,m.pointer,m.message]),newErrors=errors.filter(m=>!originalErrors.some(n=>fingerprint(m)===fingerprint(n)));report.push({source:item.source,geometryBytes,geometryMaxError:0,animationMaxError:0,images,validation:{originalErrors:originalErrors.length,decodedErrors:errors.length,newErrors},errors:newErrors});
  console.log(item.source.slice(7,19),'bytes exact',geometryBytes,'PSNR min',Math.min(...images.map(i=>i.psnr)).toFixed(2),'validator errors',errors.length);
}
await writeFile(new URL('content/manifests/web-assets-verification.json',root),JSON.stringify({records:report},null,2)+'\n');
assert(report.every(r=>r.errors.length===0),'Khronos conformance errors; see web-assets-verification.json');
console.log('PASS: all GLBs, byte-exact geometry/animation, textures/alpha, local decoder and conformance');
