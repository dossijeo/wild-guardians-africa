import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {MeshoptEncoder} from 'meshoptimizer';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {applyApprovedEmbeddedColors} from './approved-embedded-colors.mjs';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
await mkdir(new URL('public/assets/web/',root),{recursive:true});
const records=[];
const approved=JSON.parse(await readFile(new URL('content/manifests/embedded-color-recipes.json',root),'utf8')),used=new Set();
for(const file of (await readdir(new URL('public/assets/',root))).filter(f=>f.endsWith('.glb')).sort()){
  const original=await readFile(new URL('public/assets/'+file,root)),{json,bin}=readGlb(original),views=json.bufferViews,images=[],chunks=[];let length=0;
  const append=bytes=>{const offset=length;chunks.push({offset,bytes});length+=Math.ceil(bytes.length/4)*4;return offset;};
  for(const [i,image] of (json.images??[]).entries()){
    if(image.bufferView===undefined)throw Error('External image in '+file);
    const v=views[image.bufferView],source=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),info=await sharp(source).metadata();
    const textureIds=new Set((json.textures??[]).flatMap((t,id)=>t.source===i?[id]:[])),color=(json.materials??[]).some(m=>textureIds.has(m.pbrMetallicRoughness?.baseColorTexture?.index)||textureIds.has(m.emissiveTexture?.index)),normal=(json.materials??[]).some(m=>textureIds.has(m.normalTexture?.index)),quality=color?90:95;
    // High-quality WebP with lossless alpha; higher quality for normal/ORM maps.
    // A 2048 limit bounds web texture allocations; no upscaling.
    const output=await sharp(source).resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality,lossless:normal,alphaQuality:100,effort:6}).toBuffer(),after=await sharp(output).metadata();
    const offset=append(output);v.buffer=0;v.byteOffset=offset;v.byteLength=output.length;image.mimeType='image/webp';
    images.push({index:i,beforeBytes:source.length,afterBytes:output.length,before:[info.width,info.height],after:[after.width,after.height],alpha:info.hasAlpha,quality,lossless:normal,role:normal?'normal':color?'color':'data',alphaQuality:100});
  }
  const imageViews=new Set((json.images??[]).map(im=>im.bufferView));let compressedViews=0;
  for(const [i,v] of views.entries()){
    if(imageViews.has(i))continue;
    const source=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
    // Native accessor lanes avoid any vertex/index reordering and preserve offsets,
    // strides, float bit patterns and correspondence with calibrated morph bridges.
    const indexAccessors=new Set((json.meshes??[]).flatMap(m=>m.primitives.map(p=>p.indices))),index=json.accessors.find((a,id)=>a.bufferView===i&&indexAccessors.has(id));
    const componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
    const lanes=[...new Set(json.accessors.filter(a=>a.bufferView===i).map(a=>componentBytes[a.componentType]*components[a.type]))],lane=lanes.length===1&&lanes[0]%4===0&&source.length%lanes[0]===0?lanes[0]:4;
    const mode=index?'INDICES':'ATTRIBUTES',stride=index?(index.componentType===5123?2:4):(v.byteStride??lane);if(source.length%stride)throw Error('Unaligned geometry view in '+file+'/'+i);
    const count=source.length/stride,encoded=MeshoptEncoder.encodeGltfBuffer(source,count,stride,mode,0),decoded=new Uint8Array(source.length);
    MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,encoded,mode,'NONE');
    if(!Buffer.from(decoded).equals(source))throw Error('Meshopt byte mismatch: '+file+'/'+i);
    v.buffer=1;v.extensions={...v.extensions,EXT_meshopt_compression:{buffer:0,byteOffset:append(encoded),byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}};compressedViews++;
  }
  for(const texture of json.textures??[]){texture.extensions={...texture.extensions,EXT_texture_webp:{source:texture.source}};delete texture.source;}
  json.extensionsUsed=[...new Set([...(json.extensionsUsed??[]),'EXT_meshopt_compression','EXT_texture_webp'])];json.extensionsRequired=[...new Set([...(json.extensionsRequired??[]),'EXT_meshopt_compression','EXT_texture_webp'])];
  json.buffers=[{byteLength:length},{byteLength:bin.length,extensions:{EXT_meshopt_compression:{fallback:true}}}];
  const packed=new Uint8Array(length);for(const chunk of chunks)packed.set(chunk.bytes,chunk.offset);
  const baseline=writeGlb(json,packed),runtime='assets/web/'+file;
  const result=await applyApprovedEmbeddedColors(original,baseline,'assets/'+file,approved,path=>readFile(new URL(path,root))),output=result.bytes;
  for(const recipe of result.applied){
    used.add(recipe);const image=images.find(image=>image.index===recipe.index);
    image.afterBytes=recipe.outputBytes;delete image.quality;delete image.alphaQuality;
    image.encoding={provider:recipe.provider,outputSha256:recipe.outputSha256,recipe:'content/manifests/embedded-color-recipes.json'};
  }
  await writeFile(new URL('public/'+runtime,root),output);
  records.push({source:'assets/'+file,runtime,sourceSha256:hash(original),runtimeSha256:hash(output),beforeBytes:original.length,afterBytes:output.length,compressedViews,images,geometryTolerance:0,animationTolerance:0});
  console.log(file.slice(0,12),original.length,'->',output.length);
}
if(used.size!==approved.images.length)throw Error('Approved image recipe was not used');
const manifest={version:1,codec:'EXT_meshopt_compression (v0, lossless, no reorder)',textures:'EXT_texture_webp (default color quality 90, ORM 95, normals lossless, alpha 100, max 2048; reviewed color overrides in embedded-color-recipes.json)',records};
await writeFile(new URL('content/manifests/web-assets.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('TOTAL',records.reduce((n,r)=>n+r.beforeBytes,0),'->',records.reduce((n,r)=>n+r.afterBytes,0));
