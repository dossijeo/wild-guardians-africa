// Targeted source/runtime provenance and decoded PN/UV/index equality.
import fs from 'node:fs';import crypto from 'node:crypto';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {readGlb} from './glb-container.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync('content/manifests/web-assets.json'));
const record=manifest.records.find(r=>r.sourceSha256==='be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef');
const sourceBytes=fs.readFileSync('public/'+record.source),runtimeBytes=fs.readFileSync('public/'+record.runtime);
if(sha(sourceBytes)!==record.sourceSha256||sha(runtimeBytes)!==record.runtimeSha256)throw Error('Source/runtime bytes mismatch manifest');
const source=readGlb(sourceBytes),runtime=readGlb(runtimeBytes);await MeshoptDecoder.ready;
const target=process.argv[2]??'maiz_02_joven';
if(!/^[a-z]+_[0-9]{2}_[a-z]+$/.test(target))throw Error('Expected an exact crop mesh name');
function primitive(glb){const node=glb.json.nodes.find(n=>n.name===target);if(!node)throw Error('Missing target mesh: '+target);return glb.json.meshes[node.mesh].primitives[0];}
function accessor(glb,id){
 const a=glb.json.accessors[id],v=glb.json.bufferViews[a.bufferView];if(a.sparse)throw Error('Sparse accessor not supported');
 const bytesPerLane={5126:4,5123:2,5125:4}[a.componentType],lanes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];if(!bytesPerLane||!lanes)throw Error('Unexpected source lane');
 const ext=v.extensions?.EXT_meshopt_compression;let decoded;
 if(ext){if(ext.buffer!==0)throw Error('Expected runtime BIN compressed source');decoded=new Uint8Array(ext.count*ext.byteStride);MeshoptDecoder.decodeGltfBuffer(decoded,ext.count,ext.byteStride,glb.bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,ext.filter??'NONE');}
 else{if((v.buffer??0)!==0)throw Error('Unexpected uncompressed external buffer');decoded=glb.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);}
 const itemBytes=bytesPerLane*lanes,stride=v.byteStride??itemBytes,bytes=new Uint8Array(a.count*itemBytes);
 for(let row=0;row<a.count;row++)bytes.set(decoded.subarray((a.byteOffset??0)+row*stride,(a.byteOffset??0)+row*stride+itemBytes),row*itemBytes);
 return{bytes,layout:{count:a.count,type:a.type,componentType:a.componentType,normalized:!!a.normalized},
  storage:{bufferView:a.bufferView,byteStride:stride,accessorByteOffset:a.byteOffset??0,decodedViewBytes:decoded.byteLength,meshopt:!!ext}};
}
const sp=primitive(source),rp=primitive(runtime),rows=[];
for(const name of ['POSITION','NORMAL','TEXCOORD_0','indices']){
 const s=accessor(source,name==='indices'?sp.indices:sp.attributes[name]),r=accessor(runtime,name==='indices'?rp.indices:rp.attributes[name]);
 if(JSON.stringify(s.layout)!==JSON.stringify(r.layout)||!Buffer.from(s.bytes).equals(Buffer.from(r.bytes)))throw Error('Decoded source/runtime lane mismatch: '+name);
 rows.push({name,...s.layout,bytes:s.bytes.length,sourceSha256:sha(s.bytes),runtimeDecodedSha256:sha(r.bytes),sourceStorage:s.storage,runtimeStorage:r.storage,bitExact:true});
}
const receipt={status:'TARGET_SOURCE_RUNTIME_BITS_VERIFIED_NOT_VISUAL_GPU_APPROVAL',mesh:target,source:record.source,runtime:record.runtime,sourceSha256:sha(sourceBytes),runtimeSha256:sha(runtimeBytes),runtimeBytes:runtimeBytes.length,codec:manifest.codec,accessors:rows,
 limitations:['URL basename is original source hash, not compressed runtime byte hash. Assets.model resolves original URL to web counterpart.',
 'Only target PN/UV/index accessors decoded and compared; no statement about every state/bridge, GPU texels, skin/animations or runtime rendering follows.',
 'Web atlas images use the established web compression recipes, not source image byte equality; all pilot arms borrow the same original runtime maps.',
 'No source or runtime model written, no browser/driver/quality/cost measurement.']};
const output=target==='maiz_02_joven'?'local-stem-source-web-input-verification.json':`${target}-source-web-input-verification.json`;
fs.writeFileSync('docs/qa/frontside-model-pilot/'+output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
