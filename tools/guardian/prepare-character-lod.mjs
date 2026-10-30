import fs from 'node:fs';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
// Decode buffer views without changing nodes, skins, UVs or embedded images.
await MeshoptDecoder.ready;
const dir='content/source/character-lod';fs.mkdirSync(dir,{recursive:true});
const workers=JSON.parse(fs.readFileSync('public/content/worker-actions.json'));
const entries=[...Object.entries(ANIMAL_ACTIONS.animals),...Object.entries(workers),['guardian',{url:'/content/guardian/guardian.glb'}]];
const manifest=[];
for(const [id,asset] of entries){
 const source='public/'+asset.url.replace(/^\//,''),b=fs.readFileSync(source),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n),parts=[];let offset=0;
 for(const view of g.bufferViews??[]){const ext=view.extensions?.EXT_meshopt_compression;let data;
  if(ext){data=new Uint8Array(ext.count*ext.byteStride);MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,ext.filter??'NONE');delete view.extensions.EXT_meshopt_compression;}
  else data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const padded=Buffer.alloc(Math.ceil(data.length/4)*4);padded.set(data);view.buffer=0;view.byteOffset=offset;view.byteLength=data.length;parts.push(padded);offset+=padded.length;
 }
 // Blender 4.5 cannot import normalized byte custom scalar attributes.
 // Convert that storage representation losslessly to float, preserving AO.
 const packed=Buffer.concat(parts);
 for(const mesh of g.meshes??[])for(const primitive of mesh.primitives)for(const [name,index] of Object.entries(primitive.attributes)){
  const a=g.accessors[index];if(!name.startsWith('_')||a.componentType!==5121||a.type!=='SCALAR')continue;
  const view=g.bufferViews[a.bufferView],data=Buffer.alloc(a.count*4);
  for(let i=0;i<a.count;i++)data.writeFloatLE(packed[view.byteOffset+(a.byteOffset??0)+i*(view.byteStride??1)]/(a.normalized?255:1),i*4);
  a.bufferView=g.bufferViews.length;a.byteOffset=0;a.componentType=5126;delete a.normalized;g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});parts.push(data);offset+=data.length;
 }
 const ao=JSON.parse(fs.readFileSync('public/content/lighting/global-ao/models.json')).find(a=>a.source.replace(/^\//,'')===asset.url.replace(/^\//,''));
 if(ao){const meta=JSON.parse(fs.readFileSync('public/'+ao.metadata.replace(/^\//,''))),values=fs.readFileSync('public/'+meta.binary.replace(/^\//,''));for(const r of meta.records){const p=g.meshes[r.mesh]?.primitives[r.primitive];if(!p)continue;const data=Buffer.alloc(r.count*4);for(let i=0;i<r.count;i++)data.writeFloatLE(values[r.offset+i]/255,i*4);const view=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});p.attributes._AMBIENT_VISIBILITY=g.accessors.length;g.accessors.push({bufferView:view,componentType:5126,count:r.count,type:'SCALAR'});parts.push(data);offset+=data.length;}}
 for(const key of ['extensionsUsed','extensionsRequired'])if(g[key])g[key]=g[key].filter(x=>x!=='EXT_meshopt_compression');g.buffers=[{byteLength:offset}];
 const json=Buffer.from(JSON.stringify(g)),jp=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jp);const out=Buffer.alloc(28+jp.length+offset);out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jp.length,12);out.writeUInt32LE(0x4e4f534a,16);jp.copy(out,20);out.writeUInt32LE(offset,20+jp.length);out.writeUInt32LE(0x004e4942,24+jp.length);Buffer.concat(parts).copy(out,28+jp.length);
 const decoded=dir+'/'+id+'-decoded.glb';fs.writeFileSync(decoded,out);manifest.push({id,source,decoded,url:'/content/character-lod/'+id+'.glb'});
}
fs.writeFileSync(dir+'/sources.json',JSON.stringify(manifest,null,2));
