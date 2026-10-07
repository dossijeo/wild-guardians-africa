// Encode only disabled pilot candidates. Reuse accepted runtime texture bytes;
// preserve accessor lanes and no vertex/index reordering (same codec as runtime).
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {MeshoptEncoder} from 'meshoptimizer';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {createHash} from 'node:crypto';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const receiptPath=process.argv[2]??'docs/qa/frontside-model-pilot/selective-candidate-receipts.json',outputPath=process.argv[3]??'docs/qa/frontside-model-pilot/packed-candidate-receipts.json';
const receipts=JSON.parse(await readFile(receiptPath,'utf8'));
const manifest=JSON.parse(await readFile('content/manifests/web-assets.json','utf8'));
const output=[];
for(const receipt of receipts){
 const input=await readFile(receipt.candidate),{json,bin}=readGlb(input),record=manifest.records.find(r=>'/'+r.source===receipt.source);
 const baseline=readGlb(await readFile('public/'+record.runtime));
 // Controlled liveness pruning removes replaced accessor/view records, never
 // reorders vertices or animation values. Explicitly remap every accessor use.
 const used=new Set();for(const mesh of json.meshes)for(const p of mesh.primitives){used.add(p.indices);Object.values(p.attributes).forEach(a=>used.add(a));for(const target of p.targets??[])Object.values(target).forEach(a=>used.add(a));}
 for(const skin of json.skins??[])if(skin.inverseBindMatrices!==undefined)used.add(skin.inverseBindMatrices);
 for(const animation of json.animations??[])for(const sampler of animation.samplers){used.add(sampler.input);used.add(sampler.output);}
 const remap=new Map([...used].sort((a,b)=>a-b).map((a,i)=>[a,i])),oldAccessorCount=json.accessors.length;
 json.accessors=[...remap.keys()].map(a=>json.accessors[a]);
 for(const mesh of json.meshes)for(const p of mesh.primitives){p.indices=remap.get(p.indices);for(const key of Object.keys(p.attributes))p.attributes[key]=remap.get(p.attributes[key]);for(const target of p.targets??[])for(const key of Object.keys(target))target[key]=remap.get(target[key]);}
 for(const skin of json.skins??[])if(skin.inverseBindMatrices!==undefined)skin.inverseBindMatrices=remap.get(skin.inverseBindMatrices);
 for(const animation of json.animations??[])for(const sampler of animation.samplers){sampler.input=remap.get(sampler.input);sampler.output=remap.get(sampler.output);}
 const usedViews=new Set([...json.accessors.map(a=>a.bufferView),...json.images.map(i=>i.bufferView)]),viewRemap=new Map([...usedViews].sort((a,b)=>a-b).map((a,i)=>[a,i]));
 json.bufferViews=[...viewRemap.keys()].map(v=>json.bufferViews[v]);for(const a of json.accessors)a.bufferView=viewRemap.get(a.bufferView);for(const image of json.images)image.bufferView=viewRemap.get(image.bufferView);
 const views=json.bufferViews,images=new Set(json.images.map(i=>i.bufferView)),chunks=[];let length=0;
 const append=bytes=>{const offset=length;chunks.push({offset,bytes});length+=Math.ceil(bytes.length/4)*4;return offset;};
 for(let i=0;i<json.images.length;i++){
  const source=baseline.json.bufferViews[baseline.json.images[i].bufferView],bytes=baseline.bin.subarray(source.byteOffset??0,(source.byteOffset??0)+source.byteLength),v=views[json.images[i].bufferView];
  v.buffer=0;v.byteOffset=append(bytes);v.byteLength=bytes.length;json.images[i].mimeType=baseline.json.images[i].mimeType;
 }
 const componentBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 for(const [id,view] of views.entries()){
  if(images.has(id))continue;
  const source=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const accessors=json.accessors.filter(a=>a.bufferView===id);
  const index=view.target===34963?accessors.find(a=>a.type==='SCALAR'&&[5123,5125].includes(a.componentType)):null;
  const lanes=[...new Set(accessors.map(a=>componentBytes[a.componentType]*components[a.type]))],lane=lanes.length===1&&lanes[0]%4===0&&source.length%lanes[0]===0?lanes[0]:4;
  const mode=index?'INDICES':'ATTRIBUTES',stride=index?componentBytes[index.componentType]:(view.byteStride??lane);
  if(source.length%stride)throw Error('Unaligned view '+receipt.category+'/'+id);
  const count=source.length/stride,encoded=MeshoptEncoder.encodeGltfBuffer(source,count,stride,mode,0),decoded=new Uint8Array(source.length);
  MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,encoded,mode,'NONE');if(!Buffer.from(decoded).equals(source))throw Error('Lane mismatch');
  view.buffer=1;view.extensions={...view.extensions,EXT_meshopt_compression:{buffer:0,byteOffset:append(encoded),byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}};
 }
 json.textures=structuredClone(baseline.json.textures);
 json.extensionsUsed=[...new Set([...(json.extensionsUsed??[]),'EXT_meshopt_compression','EXT_texture_webp'])];json.extensionsRequired=[...new Set([...(json.extensionsRequired??[]),'EXT_meshopt_compression','EXT_texture_webp'])];
 json.buffers=[{byteLength:length},{byteLength:bin.length,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 const packed=new Uint8Array(length);for(const chunk of chunks)packed.set(chunk.bytes,chunk.offset);
 const bytes=writeGlb(json,packed),path=receipt.candidate.replace('.glb','-web.glb');await writeFile(path,bytes);
 const sha256=createHash('sha256').update(bytes).digest('hex'),archivePath='.cache/frontside-model-pilot/candidates/archive/'+sha256+'.glb';await mkdir('.cache/frontside-model-pilot/candidates/archive',{recursive:true});
 let exists=true;try{await access(archivePath);}catch{exists=false;}
 if(exists){if(!Buffer.from(await readFile(archivePath)).equals(Buffer.from(bytes)))throw Error('Archive hash collision');}else await writeFile(archivePath,bytes);
 output.push({category:receipt.category,path,archivePath,sourceCandidateSha256:receipt.candidateSha256,bytes:bytes.length,baselineRuntimeBytes:record.afterBytes,growthPercent:100*(bytes.length/record.afterBytes-1),prunedUnusedAccessors:oldAccessorCount-json.accessors.length,sha256,codec:'Same lossless Meshopt lanes; exact existing web texture payloads; explicit accessor/view liveness remap',status:'NOT_APPROVED'});
}
await writeFile(outputPath,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
