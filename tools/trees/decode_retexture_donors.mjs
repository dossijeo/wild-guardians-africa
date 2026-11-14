// Decode authoring donors offline; runtime geometry remains authoritative.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const context={console,setTimeout,clearTimeout,TextDecoder,TextEncoder};
vm.createContext(context);
vm.runInContext(fs.readFileSync('node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js','utf8'),context);
const draco=await context.DracoDecoderModule({});
const inventory=JSON.parse(fs.readFileSync('docs/lighting/tree-near-retexture/donor-inventory.json'));
for(const row of inventory.assets){
 const raw=fs.readFileSync(path.join('.cache/tree-retexture/input',row.file));
 const size=raw.readUInt32LE(12),gltf=JSON.parse(raw.subarray(20,20+size)),bin=raw.subarray(28+size);
 const primitives=[];
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
  const ext=primitive.extensions.KHR_draco_mesh_compression,view=gltf.bufferViews[ext.bufferView];
  const bytes=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  const buffer=new draco.DecoderBuffer(),decoder=new draco.Decoder(),decoded=new draco.Mesh();
  buffer.Init(new Int8Array(bytes),bytes.length);
  const status=decoder.DecodeBufferToMesh(buffer,decoded);
  if(!status.ok())throw Error(`${row.file}: ${status.error_msg()}`);
  const attributes={};
  for(const [semantic,id]of Object.entries(ext.attributes)){
   const attribute=decoder.GetAttributeByUniqueId(decoded,id),values=new draco.DracoFloat32Array();
   decoder.GetAttributeFloatForAllPoints(decoded,attribute,values);
   attributes[semantic]=Array.from({length:values.size()},(_,i)=>values.GetValue(i));
   draco.destroy(values);
  }
  const face=new draco.DracoInt32Array(),indices=[];
  for(let i=0;i<decoded.num_faces();i++){decoder.GetFaceFromMesh(decoded,i,face);for(let j=0;j<3;j++)indices.push(face.GetValue(j));}
  primitives.push({attributes,indices,material:primitive.material});
  for(const object of [face,decoded,decoder,buffer])draco.destroy(object);
 }
 const out=path.join('.cache/tree-retexture/decoded',row.biome,row.slot);fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'mesh.json'),JSON.stringify({primitives,nodes:gltf.nodes,materials:gltf.materials}));
 gltf.images.forEach((image,i)=>{const view=gltf.bufferViews[image.bufferView];fs.writeFileSync(path.join(out,`image-${i}.webp`),bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength));});
 console.log(`${row.biome}/${row.slot}: decoded`);
}
