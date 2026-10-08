// Offline alternative to ratio-only decimation: bounded position/normal/UV
// simplification of driver1, retaining original vertex lanes. No raster input.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readGlb} from './glb-container.mjs';
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(await readFile(folder+'selective-candidate-receipts.json','utf8')).find(r=>r.category==='crops');
const raw=await readFile('public'+receipt.source),sha=b=>createHash('sha256').update(b).digest('hex');if(sha(raw)!==receipt.sourceSha256)throw Error('Source SHA mismatch');
const {json,bin}=readGlb(raw),node=json.nodes.find(n=>n.name==='maiz_05_maduro'),p=json.meshes[node.mesh].primitives[0];
if(node.skin!==undefined||p.targets)throw Error('Unexpected skin/morph contract');
function accessor(index){const a=json.accessors[index],v=json.bufferViews[a.bufferView],T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],width={SCALAR:1,VEC2:2,VEC3:3}[a.type];if(!T||!width||v.byteStride||a.sparse)throw Error('Unexpected source accessor layout');const bytes=bin.slice((v.byteOffset??0)+(a.byteOffset??0),(v.byteOffset??0)+(a.byteOffset??0)+a.count*width*T.BYTES_PER_ELEMENT);return new T(bytes.buffer);}
const positions=accessor(p.attributes.POSITION),normals=accessor(p.attributes.NORMAL),uv=accessor(p.attributes.TEXCOORD_0),indices=accessor(p.indices),bridges=JSON.parse(await readFile('public/content/crop-bridges.json','utf8'));
const model=node.extras.cropIndex*5+node.extras.stage-1,labels=bridges.models[model].faceLabels;if(labels.length*3!==indices.length)throw Error('Face label count mismatch');
const stemFaces=labels.flatMap((label,face)=>label===1?[face]:[]),stemIndices=Uint32Array.from(stemFaces.flatMap(face=>[...indices.subarray(face*3,face*3+3)])),attributes=new Float32Array(positions.length/3*5);
for(let i=0;i<positions.length/3;i++){attributes.set(normals.subarray(i*3,i*3+3),i*5);attributes.set(uv.subarray(i*2,i*2+2),i*5+3);}
await MeshoptSimplifier.ready;
const rows=[];for(const flags of [['LockBorder','ErrorAbsolute','Sparse'],['LockBorder','ErrorAbsolute','Sparse','Permissive']])for(const normalWeight of [.1,1,10])for(const uvWeight of [1,10])for(const limit of [.00001,.0001,.001,.003,.01]){
 const [out,error]=MeshoptSimplifier.simplifyWithAttributes(stemIndices,positions,3,attributes,5,[normalWeight,normalWeight,normalWeight,uvWeight,uvWeight],null,Math.floor(stemIndices.length*.75/3)*3,limit,flags);
 const stemTriangles=out.length/3,totalTriangles=labels.length-stemFaces.length+2*stemTriangles;
 // Proposed native state retains source attribute buffers; only index is
 // replaced. Bridge driver bytes cannot be inferred from this state estimate.
 const sourceBytes=positions.byteLength+normals.byteLength+uv.byteLength+indices.byteLength,indexBytes=totalTriangles*3*(positions.length/3<=65535?2:4),proposedBytes=positions.byteLength+normals.byteLength+uv.byteLength+indexBytes;
 rows.push({flags,normalWeight,uvWeight,absoluteErrorLimit:limit,reportedAppearanceError:error,derivedStemTriangles:stemTriangles,sourceStemTriangles:stemFaces.length,proposedBilateralTriangles:totalTriangles,triangleGrowthPercent:100*(totalTriangles/labels.length-1),triangleBudgetPass:totalTriangles<=labels.length*1.1,sourceStateBytes:sourceBytes,proposedSharedStateBytes:proposedBytes,bufferGrowthPercent:100*(proposedBytes/sourceBytes-1),bufferBudgetPass:proposedBytes<=sourceBytes*1.1});
}
const report={status:'STEM_CONSTRAINED_SIMPLIFICATION_OFFLINE_NOT_APPROVED',sourceSha256:receipt.sourceSha256,mesh:node.name,rows,limitations:['Only maize mature state; no GLB, geometry export, runtime activation or raster view selected.', 'Original POSITION/NORMAL/UV vertex buffers are reused exactly, but interpolation and topology change; map and silhouette quality remain untested.', 'ALL resulting stem faces would receive actual geometric reverses with shared source attributes and a separate back-facing shader recipe.', 'Position/attribute error returned by Meshopt is not a raster bound or continuous bridge proof.', 'Indices/liveness packing savings must be isolated from culling; web bytes, bridge buffers, groups and GPU timings remain required.']};
await writeFile(folder+'maize-stem-constrained-simplification-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,resourceEligible:rows.filter(r=>r.triangleBudgetPass&&r.bufferBudgetPass).length,minDerivedStemTriangles:Math.min(...rows.map(r=>r.derivedStemTriangles)),lowestReportedErrorEligible:Math.min(...rows.filter(r=>r.triangleBudgetPass&&r.bufferBudgetPass).map(r=>r.reportedAppearanceError))}));
