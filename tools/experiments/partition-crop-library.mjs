// Offline diagnostic only. Does not register assets or modify production manifests.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {readGlb,writeGlb} from '../glb-container.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),align=n=>Math.ceil(n/4)*4;
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
export function partitionCropLibrary(out=path.join(ROOT,'.cache/maize-partition-candidate')){
 out=path.resolve(out);const allowed=path.join(ROOT,'.cache')+path.sep;assert.ok(out.startsWith(allowed),'Candidate output must stay within own .cache');
 const authored=read('content/manifests/crops-v4.json'),crop={url:authored.steady.url},bridges=read('public/content/crop-bridges.json'),records=read('content/manifests/web-assets.json').records;
 const manifest={version:1,scope:'Offline candidate only; geometry slices copied without re-encoding, images external and shared by URI. A future canonical texture owner is required across parser instances.',sourceRecipeVersion:bridges.recipeVersion,sources:{},partitions:[],textures:[],metadata:{source:'public/content/crop-bridges.json',sha256:hash(fs.readFileSync(path.join(ROOT,'public/content/crop-bridges.json')))}};
 assert.equal(bridges.recipeVersion,4);fs.mkdirSync(path.join(out,'textures'),{recursive:true});
 for(const [kind,url]of [['steady',crop.url],['bridges',authored.bridges.url]]){
  const record=records.find(r=>'/'+r.source===url);assert.ok(record);const sourceBytes=fs.readFileSync(path.join(ROOT,'public',record.runtime));assert.equal(hash(sourceBytes),record.runtimeSha256);
  const original=readGlb(sourceBytes),j=original.json;assert.equal(j.nodes.length,kind==='steady'?40:32);assert.equal(j.scenes.length,1);assert.equal(j.scenes[0].nodes.length,j.nodes.length);assert.ok(!j.skins&&!j.animations);
  const identities=j.nodes.map(node=>kind==='steady'?node.extras.cropIndex*5+node.extras.stage-1:node.extras.bridgeIndex);assert.deepEqual([...identities].sort((a,b)=>a-b),j.nodes.map((_,i)=>i));
  if(kind==='bridges')for(const node of j.nodes){const pair=bridges.pairs.find(p=>p.a===node.extras.a&&p.b===node.extras.b);assert.ok(pair,'Baked bridge pair must match original metadata');}
  manifest.sources[kind]={logicalUrl:url,runtime:record.runtime,bytes:sourceBytes.length,sha256:hash(sourceBytes)};
  const sharedImages=(j.images??[]).map((image,index)=>{
   assert.notEqual(image.bufferView,undefined);const view=j.bufferViews[image.bufferView];assert.equal(view.buffer,0);const data=original.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),sha256=hash(data),relative='textures/'+sha256+'.webp';assert.equal(image.mimeType,'image/webp');
   fs.writeFileSync(path.join(out,relative),data);manifest.textures.push({index,name:image.name,uri:relative,bytes:data.length,sha256,mimeType:image.mimeType});const copy=structuredClone(image);delete copy.bufferView;copy.uri=relative;return copy;
  });
  for(const group of ['maize','remainder']){
   const selected=j.nodes.map((node,id)=>({node,id})).filter(({node})=>((kind==='steady'?node.extras.cropIndex:Math.floor(node.extras.bridgeIndex/4))===0)===(group==='maize'));
   const meshIds=[...new Set(selected.map(x=>x.node.mesh))].sort((a,b)=>a-b),accessorIds=new Set(),materialIds=new Set();
   for(const m of meshIds)for(const p of j.meshes[m].primitives){for(const id of Object.values(p.attributes))accessorIds.add(id);accessorIds.add(p.indices);assert.ok(!p.targets);if(p.material!==undefined)materialIds.add(p.material);}
   const sortedAccessors=[...accessorIds].sort((a,b)=>a-b),viewIds=[...new Set(sortedAccessors.map(a=>j.accessors[a].bufferView))].sort((a,b)=>a-b),sortedMaterials=[...materialIds].sort((a,b)=>a-b);
   const map=(list)=>new Map(list.map((id,i)=>[id,i])),meshMap=map(meshIds),accessorMap=map(sortedAccessors),viewMap=map(viewIds),materialMap=map(sortedMaterials);
   let packedLength=0,decodedLength=0;const chunks=[];
   const views=viewIds.map(id=>{const view=structuredClone(j.bufferViews[id]),ext=view.extensions.EXT_meshopt_compression;assert.equal(ext.buffer,0);const data=original.bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength);assert.equal(data.length,ext.byteLength);chunks.push({offset:packedLength,data});ext.byteOffset=packedLength;packedLength+=align(data.length);view.buffer=1;view.byteOffset=decodedLength;decodedLength+=align(view.byteLength);return view;});
   const packed=new Uint8Array(packedLength);for(const c of chunks)packed.set(c.data,c.offset);
   const json=structuredClone(j);json.nodes=selected.map(({node})=>{const result=structuredClone(node);assert.ok(!result.children);result.mesh=meshMap.get(node.mesh);return result;});json.scenes=[{...structuredClone(j.scenes[0]),nodes:json.nodes.map((_,i)=>i)}];json.scene=0;
   json.meshes=meshIds.map(id=>{const m=structuredClone(j.meshes[id]);for(const p of m.primitives){for(const name of Object.keys(p.attributes))p.attributes[name]=accessorMap.get(p.attributes[name]);p.indices=accessorMap.get(p.indices);if(p.material!==undefined)p.material=materialMap.get(p.material);}return m;});
   json.accessors=sortedAccessors.map(id=>{const a=structuredClone(j.accessors[id]);assert.ok(!a.sparse);a.bufferView=viewMap.get(a.bufferView);return a;});json.bufferViews=views;
   json.buffers=[{byteLength:packedLength},{byteLength:decodedLength,extensions:{EXT_meshopt_compression:{fallback:true}}}];
   if(j.materials)json.materials=sortedMaterials.map(id=>structuredClone(j.materials[id]));if(j.images)json.images=sharedImages;
   const bytes=writeGlb(json,packed),file=group+'-'+kind+'.glb';fs.writeFileSync(path.join(out,file),bytes);
   manifest.partitions.push({group,kind,file,bytes:bytes.length,sha256:hash(bytes),nodeSourceIndices:selected.map(x=>x.id),meshSourceIndices:meshIds,accessorSourceIndices:sortedAccessors,bufferViewSourceIndices:viewIds,materialSourceIndices:sortedMaterials,decodedGeometryViewBytes:viewIds.reduce((n,id)=>n+j.bufferViews[id].byteLength,0),compressedPayloadBytes:chunks.reduce((n,c)=>n+c.data.length,0)});
  }
 }
 assert.equal(manifest.textures.length,6);assert.equal(new Set(manifest.textures.map(t=>t.uri)).size,6);
 fs.writeFileSync(path.join(out,'partition-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=partitionCropLibrary(process.argv[2]);console.log(JSON.stringify({partitions:m.partitions.map(p=>({file:p.file,bytes:p.bytes,nodes:p.nodeSourceIndices.length})),textures:m.textures.reduce((n,t)=>n+t.bytes,0)}));}
