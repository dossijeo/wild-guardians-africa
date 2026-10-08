// Source correspondence for real partition helper, no export or browser claim.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {readGlb} from './glb-container.mjs';
import {partitionCropGeometry} from './lib/frontside-crop-partition.mjs';
const folder='docs/qa/frontside-model-pilot/';
const receipt=JSON.parse(fs.readFileSync(folder+'selective-candidate-receipts.json')).find(r=>r.category==='crops');
const bytes=fs.readFileSync('public/'+receipt.source.replace(/^\//,''));
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
if(sha(bytes)!==receipt.sourceSha256)throw Error('Original source hash mismatch');
const {json:d,bin}=readGlb(bytes),node=d.nodes.find(n=>n.name==='maiz_02_joven'),primitive=d.meshes[node.mesh].primitives[0];
function attribute(index){
 const a=d.accessors[index],v=d.bufferViews[a.bufferView];if(a.sparse||a.normalized||v.buffer!==0)throw Error('Unexpected original accessor');
 const lanes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],Type={5126:Float32Array,5123:Uint16Array,5125:Uint32Array}[a.componentType];if(!lanes||!Type)throw Error('Unexpected original attribute type');
 const output=new Type(a.count*lanes),view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),stride=v.byteStride??lanes*Type.BYTES_PER_ELEMENT,start=v.byteOffset+(a.byteOffset??0);
 const get={5126:'getFloat32',5123:'getUint16',5125:'getUint32'}[a.componentType];
 for(let row=0;row<a.count;row++)for(let lane=0;lane<lanes;lane++)output[row*lanes+lane]=view[get](start+row*stride+lane*Type.BYTES_PER_ELEMENT,true);
 return new THREE.BufferAttribute(output,lanes);
}
const original=new THREE.InstancedBufferGeometry();for(const [name,id]of Object.entries(primitive.attributes)){const runtimeName={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[name];if(!runtimeName)throw Error('Unmapped source attribute');original.setAttribute(runtimeName,attribute(id));}original.setIndex(attribute(primitive.indices));
const labels=JSON.parse(fs.readFileSync('public/content/crop-bridges.json')).models[node.extras.cropIndex*5+node.extras.stage-1].faceLabels;
const result=partitionCropGeometry(original,labels,[1]),candidate=result.geometry;
if(original.index.count!==3762||result.frontFaces!==245||result.doubleFaces!==1009||result.reverseFaces!==0||candidate.index.count!==original.index.count)throw Error('Partition count contract mismatch');
const seen=new Set();for(let face=0;face<result.sourceFaceOrder.length;face++){
 const sourceFace=result.sourceFaceOrder[face];if(seen.has(sourceFace))throw Error('Duplicated source triangle');seen.add(sourceFace);
 for(let lane=0;lane<3;lane++)if(candidate.index.array[face*3+lane]!==original.index.array[sourceFace*3+lane])throw Error('Winding/source corner order changed');
 if(candidate.userData.qaFaceLabels[face]!==labels[sourceFace])throw Error('Face driver correspondence changed');
}
const rows=Object.entries(original.attributes).map(([name,a])=>{if(candidate.getAttribute(name)!==a)throw Error('Borrowed attribute object changed');return{name,sharedObject:true,vertices:a.count,itemSize:a.itemSize,bytes:a.array.byteLength,sha256:sha(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength))};});
const originalAttributeBytes=rows.reduce((sum,r)=>sum+r.bytes,0),originalIndexBytes=original.index.array.byteLength,newIndexBytes=candidate.index.array.byteLength;
const report={status:'SOURCE_PARTITION_CORRESPONDENCE_NOT_NATIVE_QUALITY_OR_GPU_APPROVAL',sourceSha256:receipt.sourceSha256,target:node.name,triangles:seen.size,selectedStemTriangles:result.frontFaces,otherTriangles:result.doubleFaces,newOrReverseTriangles:0,attributes:rows,groups:candidate.groups,
 originalAttributeBytes,originalIndexBytes,newIndexBytes,sourceRawStateBytes:originalAttributeBytes+originalIndexBytes,
 retainedBothIndicesRawStateBytes:originalAttributeBytes+originalIndexBytes+newIndexBytes,retainedBothIndicesGrowthPercent:100*newIndexBytes/(originalAttributeBytes+originalIndexBytes),
 limitations:['Real source PN/UV/index parsed without browser decoder; native web decode/contracts and live iGrowth/material/shadow checks remain required.',
 'Source face order map preserves each original triangle, its cyclic order and driver exactly; attributes are the same objects, not rebuilt or normalized.',
 'Raw CPU coexistence includes both private index allocations. GPU uploads/old index residency, live buffers/material/program/textures/peak allocations are unmeasured.',
 'No culling/material/shader change or model export by this source correspondence audit; native Double-only pilot remains pending.']};
fs.writeFileSync(folder+'local-stem-partition-source-correspondence.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
