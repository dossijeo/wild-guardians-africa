import {MeshoptDecoder} from './meshopt_decoder.module.js';
// Native reference labs read conventional bufferViews directly. Decode only in
// memory so the downloadable package contains one compressed variant per model.
export async function decodeWebGlb(buffer) {
  const view=new DataView(buffer),bytes=new Uint8Array(buffer);let doc,bin;
  for(let o=12;o<bytes.length;){const n=view.getUint32(o,true),type=view.getUint32(o+4,true);if(type===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(bytes.subarray(o+8,o+8+n)));if(type===0x004e4942)bin=bytes.subarray(o+8,o+8+n);o+=8+n;}
  if(!doc?.extensionsUsed?.includes('EXT_meshopt_compression'))return buffer;
  await MeshoptDecoder.ready;const chunks=[];let length=0;
  for(const bv of doc.bufferViews){const ext=bv.extensions?.EXT_meshopt_compression;let data;
    if(ext){data=new Uint8Array(bv.byteLength);MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,ext.filter);delete bv.extensions.EXT_meshopt_compression;if(!Object.keys(bv.extensions).length)delete bv.extensions;}
    else data=bin.subarray(bv.byteOffset??0,(bv.byteOffset??0)+bv.byteLength);
    bv.buffer=0;bv.byteOffset=length;chunks.push({offset:length,data});length+=Math.ceil(data.length/4)*4;
  }
  doc.extensionsUsed=doc.extensionsUsed.filter(x=>x!=='EXT_meshopt_compression');doc.extensionsRequired=doc.extensionsRequired.filter(x=>x!=='EXT_meshopt_compression');doc.buffers=[{byteLength:length}];
  const text=new TextEncoder().encode(JSON.stringify(doc)),jsonSize=Math.ceil(text.length/4)*4,result=new Uint8Array(28+jsonSize+length),out=new DataView(result.buffer);
  out.setUint32(0,0x46546c67,true);out.setUint32(4,2,true);out.setUint32(8,result.length,true);out.setUint32(12,jsonSize,true);out.setUint32(16,0x4e4f534a,true);result.fill(32,20,20+jsonSize);result.set(text,20);out.setUint32(20+jsonSize,length,true);out.setUint32(24+jsonSize,0x004e4942,true);
  for(const chunk of chunks)result.set(chunk.data,28+jsonSize+chunk.offset);return result.buffer;
}
