// Read-only geometry audit of the immutable Blender .5 leaf archive. No GLB,
// production model, view mask, shader, bridge data or candidate is written.
import fs from 'node:fs';import crypto from 'node:crypto';
import * as THREE from 'three';import {sharedLeafReverseGeometry} from './lib/frontside-shared-leaf-reverse.mjs';
import {readGlb} from './glb-container.mjs';
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(fs.readFileSync(folder+'maize-blender-leaf-reduction-diagnostic.json'));
const bytes=fs.readFileSync(receipt.archive),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(bytes)!==receipt.archiveSha256)throw Error('Immutable Blender archive hash mismatch');
const payload=JSON.parse(bytes),unique=new Map(),vertices=[],forward=[];
if(payload.mesh!==receipt.mesh||payload.sourceSha256!==receipt.sourceSha256||payload.ratio!==.5)throw Error('Archive recipe identity mismatch');
for(const face of payload.corners)for(const corner of face){
 if(corner.length!==8||!corner.every(Number.isFinite))throw Error('Invalid P/N/UV corner');
 const lanes=Float32Array.from(corner),key=Buffer.from(lanes.buffer).toString('hex');
 let id=unique.get(key);if(id===undefined){id=vertices.length;unique.set(key,id);vertices.push(lanes);}forward.push(id);
}
const core=[],leaf=[],reverse=[];
for(let face=0;face<payload.faceLabels.length;face++){
 const a=forward.slice(face*3,face*3+3);if(payload.faceLabels[face]<2)core.push(...a);else{leaf.push(...a);reverse.push(a[0],a[2],a[1]);}
}
const Type=vertices.length<=65535?Uint16Array:Uint32Array,indices=new Type([...core,...leaf,...reverse]);
// Reconstruct every forward corner through the controlled index writer and
// assert its original Float32 P/N/UV bits; reverse triangles borrow same IDs.
for(let face=0;face<payload.corners.length;face++)for(let lane=0;lane<3;lane++){
 const original=Float32Array.from(payload.corners[face][lane]),written=vertices[forward[face*3+lane]];
 if(!Buffer.from(original.buffer).equals(Buffer.from(written.buffer)))throw Error('Indexed corner bits changed');
}
const vertexBytes=vertices.length*32,total=vertexBytes+indices.byteLength,source=receipt.sourceStateGeometryBytes;
const sourceFile=fs.readFileSync('public/assets/'+receipt.sourceSha256+'.glb');if(sha(sourceFile)!==receipt.sourceSha256)throw Error('Original GLB hash mismatch');const originalGlb=readGlb(sourceFile),node=originalGlb.json.nodes.find(n=>n.name===receipt.mesh),primitive=originalGlb.json.meshes[node.mesh].primitives[0],accessor=originalGlb.json.accessors[primitive.indices],view=originalGlb.json.bufferViews[accessor.bufferView];if(accessor.componentType!==5123||view.extensions||accessor.sparse)throw Error('Unexpected original index encoding');
const originalIndex=new Uint16Array(originalGlb.bin.buffer,originalGlb.bin.byteOffset+(view.byteOffset??0)+(accessor.byteOffset??0),accessor.count);
const estimate=(draws,capacity)=>draws.reduce((sum,draw)=>{let misses=0;const cache=[];for(const id of draw){const old=cache.indexOf(id);if(old>=0)cache.splice(old,1);else misses++;cache.unshift(id);if(cache.length>capacity)cache.pop();}return sum+misses;},0);
const candidateDraws=[new Type(core),new Type(leaf),new Type(reverse)];
const perDrawUnique={original:new Set(originalIndex).size,candidate:candidateDraws.map(draw=>new Set(draw).size),meaning:'Unique-index lower bound per separate draw; not measured shader invocation count.'};
const simulatedVertexInvocations=[16,32,64].map(capacity=>({lruCacheEntries:capacity,original:estimate([originalIndex],capacity),candidate:estimate(candidateDraws,capacity)}));
const sourceGeometry=new THREE.InstancedBufferGeometry(),liveGrowth=new THREE.InstancedBufferAttribute(new Float32Array([1,1,1,0]),4);sourceGeometry.setAttribute('iGrowth',liveGrowth);
const actual=sharedLeafReverseGeometry(sourceGeometry,payload);
if(actual.geometry.getAttribute('iGrowth')!==liveGrowth||actual.uniqueVertices!==vertices.length||actual.attributeBytes!==vertexBytes||actual.indexBytes!==indices.byteLength||!Buffer.from(actual.geometry.index.array.buffer).equals(Buffer.from(indices.buffer)))throw Error('Controlled Three writer differs from independent budget');
for(const [name,size,offset] of [['position',3,0],['normal',3,3],['uv',2,6]]){
 const attr=actual.geometry.getAttribute(name),expected=Float32Array.from(vertices.flatMap(row=>Array.from(row.slice(offset,offset+size))));
 if(!Buffer.from(attr.array.buffer).equals(Buffer.from(expected.buffer)))throw Error('Controlled writer attribute bits differ: '+name);
}
const report={status:'SHARED_REVERSE_RESOURCE_AUDIT_NOT_VISUAL_OR_GPU_APPROVAL',sourceSha256:receipt.sourceSha256,archiveSha256:receipt.archiveSha256,mesh:receipt.mesh,ratio:payload.ratio,
 originalTriangles:receipt.sourceTriangles,forwardTriangles:payload.corners.length,bilateralTriangles:indices.length/3,uniquePNUVVertices:vertices.length,indexType:Type.name,vertexBytes,indexBytes:indices.byteLength,geometryBytes:total,sourceGeometryBytes:source,geometryChangePercent:100*(total/source-1),triangleChangePercent:100*((indices.length/3)/receipt.sourceTriangles-1),
 controlledWriterVerified:true,liveGrowthBorrowed:true,perDrawUnique,simulatedVertexInvocations,actualGroups:actual.geometry.groups,groups:[{meaning:'original core',triangles:core.length/3},{meaning:'derived leaf forward',triangles:leaf.length/3},{meaning:'same derived leaf reverse; original back-facing material recipe required',triangles:reverse.length/3}],
 nominalOriginalPlusCandidateGeometryBytes:source+total,nominalStandaloneGeometryPass:total<=source*1.1,trianglePass:indices.length/3<=receipt.sourceTriangles*1.1,
 limitations:['No new model exported or native draw executed; historical .5 visual rejection remains unchanged. Human policy3 reevaluation is pending.','No reverse normal/UV/flag vertex copies; uniform per-material source-back-facing recipe must be validated with real normal maps.','Three groups may increase color/shadow submissions, even with fewer unique vertices. Invocation counts, net GPU timing and resident memory are unmeasured.','Original/candidate coexistence shown separately; category, bridge, material, driver, full web bytes and measured peak GPU budgets remain unverified.','All leaf faces get geometric reverses, independent of camera visibility. Leaf driver labels remain explicit, but new bridge topology correspondence is still required.']};
fs.writeFileSync(folder+'maize-leaf-shared-reverse-budget.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
actual.geometry.dispose();sourceGeometry.dispose();
