// CPU contracts only; no renderer, shader, texture upload or acceptance gate.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSupportedFieldGeometry} from './lib/frontside-supported-field-data.mjs';
const dir='docs/qa/frontside-model-pilot/';
const metadata=JSON.parse(fs.readFileSync(dir+'maize-mature-supported-field-tables.json'));
const bytes=fs.readFileSync(dir+metadata.payload);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(bytes.length,metadata.payloadBytes);assert.equal(sha(bytes),metadata.payloadSha256);
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),views={};
const types={Float32:Float32Array,Uint32:Uint32Array,Uint16:Uint16Array};
let end=0,tableBytes=0;
for(const [name,e] of Object.entries(metadata.arrays)){
 assert.equal(e.byteOffset,end);assert.equal(sha(bytes.subarray(e.byteOffset,e.byteOffset+e.byteLength)),e.sha256);
 const T=types[e.dtype];assert.equal(e.byteLength%T.BYTES_PER_ELEMENT,0);
 views[name]=new T(buffer,e.byteOffset,e.byteLength/T.BYTES_PER_ELEMENT);
 assert.ok(e.scalarCount<=views[name].length);
 if(e.texture){assert.equal(views[name].length,e.texture.width*e.texture.height*e.components);tableBytes+=e.byteLength;}
 else assert.equal(views[name].length,e.scalarCount);
 if(T===Float32Array)assert.ok(views[name].every(Number.isFinite));
 end=e.byteOffset+e.byteLength;
}
assert.equal(end,bytes.length);
const raw=fs.readFileSync('public/'+metadata.source);assert.equal(sha(raw),metadata.sourceSha256);
const jl=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jl).toString()),bin=raw.subarray(28+jl);
const primitive=doc.meshes.flatMap(m=>m.primitives).find(p=>doc.accessors[p.indices]?.count===14805&&doc.accessors[p.attributes.POSITION]?.count===8983);
assert.ok(primitive);const geometry=new THREE.BufferGeometry();
function accessor(i){const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],T=a.componentType===5126?Float32Array:Uint16Array,n={SCALAR:1,VEC2:2,VEC3:3}[a.type],offset=(v.byteOffset||0)+(a.byteOffset||0),length=a.count*n*T.BYTES_PER_ELEMENT;assert.ok(!v.byteStride||v.byteStride===n*T.BYTES_PER_ELEMENT);const b=bin.subarray(offset,offset+length),copy=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new THREE.BufferAttribute(new T(copy),n);}
for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const attr=accessor(primitive.attributes[semantic]);geometry.setAttribute(name,attr);assert.equal(sha(new Uint8Array(attr.array.buffer)),metadata.sourceAccessors.find(a=>a.name===semantic).sourceSha256);}
geometry.setIndex(accessor(primitive.indices));geometry.setAttribute('iGrowth',new THREE.InstancedBufferAttribute(new Float32Array([1,1,1,0]),4));
const snapshot=Object.fromEntries(Object.entries(geometry.attributes).map(([k,a])=>[k,sha(new Uint8Array(a.array.buffer))]));
const data={metadata,views},built={};for(const kind of ['fallback','proxy','sourceFine'])built[kind]=createSupportedFieldGeometry(kind,geometry,data);
assert.equal(built.fallback.index.count/3,3063);assert.equal(built.proxy.index.count/3,1182);assert.equal(built.sourceFine.attributes.position.count/3,1872);
for(const g of Object.values(built)){assert.ok(g.attributes.position.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));assert.equal(g.attributes.iGrowth,geometry.attributes.iGrowth);if(g.index)assert.ok(g.index.array.every(i=>i<g.attributes.position.count));}
for(const [k,a] of Object.entries(geometry.attributes))assert.equal(sha(new Uint8Array(a.array.buffer)),snapshot[k]);
const partition=[...views.supportedOriginalFaces,...views.fallbackOriginalFaces].sort((a,b)=>a-b);assert.deepEqual(partition,Array.from({length:4935},(_,i)=>i));
let maxResidual=0;
for(let f=0;f<metadata.sourceFaces;f++){
 const domain=views.supportedSourceDomain.subarray(f*6,f*6+6),coef=views.faceCoefficients.subarray(f*8,f*8+8),chart=views.supportedSourceChart[f];
 assert.ok((domain[2]-domain[0])*(domain[5]-domain[1])-(domain[3]-domain[1])*(domain[4]-domain[0])>0);
 assert.equal(coef[7],views.supportedOriginalFaces[f]);
 for(let lane=0;lane<3;lane++)assert.equal(views.faceVertices[f*4+lane],geometry.index.getX(views.supportedOriginalFaces[f]*3+lane));
 const x=(domain[0]+domain[2]+domain[4])/3,y=(domain[1]+domain[3]+domain[5])/3;
 const b1=coef[2]*(x-coef[0])+coef[3]*(y-coef[1]),b2=coef[4]*(x-coef[0])+coef[5]*(y-coef[1]);maxResidual=Math.max(maxResidual,Math.abs(b1-1/3),Math.abs(b2-1/3));
 const gx=Math.min(15,Math.max(0,Math.floor(x*16))),gy=Math.min(15,Math.max(0,Math.floor(y*16))),cell=chart*256+gy*16+gx;
 const start=views.cellRanges[cell*2],count=views.cellRanges[cell*2+1];assert.ok(start+count<=metadata.faceCandidateEntries);assert.ok(views.cellFaces.subarray(start,start+count).includes(f));
}
for(let t=0;t<views.proxyIndices.length;t+=3){const ids=views.proxyIndices.subarray(t,t+3);assert.equal(views.proxyVertexChart[ids[0]],views.proxyVertexChart[ids[1]]);assert.equal(views.proxyVertexChart[ids[0]],views.proxyVertexChart[ids[2]]);const U=views.proxyDomain,a=ids[0]*2,b=ids[1]*2,c=ids[2]*2;assert.ok((U[b]-U[a])*(U[c+1]-U[a+1])-(U[b+1]-U[a+1])*(U[c]-U[a])>0);}
const report={status:'CPU_DATA_GEOMETRY_CONTRACTS_PASS_NOT_APPROVED',payloadSha256:metadata.payloadSha256,tableBytes,payloadBytes:bytes.length,sourceFaces:1872,proxyTriangles:1182,fallbackTriangles:3063,maxCentroidBarycentricResidual:maxResidual,sourceAttributesUnchanged:true,limitations:['No GPU texture, shader, visual, growth/bridge, shadow or performance validation.','Centroid checks do not prove full domain lookup coverage or GPU precision.','Proxy placeholder normals/UV must not be rendered using the original material.']};
fs.writeFileSync(dir+'crop-supported-field-cpu-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
