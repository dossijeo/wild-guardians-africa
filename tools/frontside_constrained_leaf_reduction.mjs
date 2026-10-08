// Read-only one-model proposal: original vertex lanes, locked borders and
// explicit geometry/normal/UV error metric. Reduction ratio is a target only.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readGlb} from './glb-container.mjs';
await MeshoptSimplifier.ready;
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(await readFile(folder+'selective-candidate-receipts.json','utf8')).find(r=>r.category==='crops');
const raw=await readFile('public'+receipt.source);if(createHash('sha256').update(raw).digest('hex')!==receipt.sourceSha256)throw Error('Source mismatch');
const {json:doc,bin}=readGlb(raw),node=doc.nodes.find(n=>n.name==='maiz_05_maduro'),prim=doc.meshes[node.mesh].primitives[0];
if(node.skin!==undefined||prim.targets||Object.keys(prim.attributes).sort().join()!=='NORMAL,POSITION,TEXCOORD_0')throw Error('Unexpected source contract');
function lanes(id){const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],width={VEC3:3,VEC2:2,SCALAR:1}[a.type],size={5123:2,5125:4,5126:4}[a.componentType],out=a.componentType===5126?new Float32Array(a.count*width):new Uint32Array(a.count*width),view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),offset=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??width*size;for(let i=0;i<a.count;i++)for(let c=0;c<width;c++)out[i*width+c]=a.componentType===5126?view.getFloat32(offset+i*stride+c*size,true):a.componentType===5123?view.getUint16(offset+i*stride+c*size,true):view.getUint32(offset+i*stride+c*size,true);return out;}
const p=lanes(prim.attributes.POSITION),n=lanes(prim.attributes.NORMAL),uv=lanes(prim.attributes.TEXCOORD_0),ix=lanes(prim.indices),attributes=new Float32Array(p.length/3*5);
for(let v=0;v<p.length/3;v++)attributes.set([...n.subarray(v*3,v*3+3),...uv.subarray(v*2,v*2+2)],v*5);
const before=createHash('sha256').update(new Uint8Array(p.buffer)).update(new Uint8Array(attributes.buffer)).digest('hex');
const data=JSON.parse(await readFile('public/content/crop-bridges.json','utf8')),model=node.extras.cropIndex*5+node.extras.stage-1,labels=data.models[model].faceLabels,rows=[],triangles=[];
const permissive=process.argv.includes('--permissive'),errorArg=process.argv.find(a=>a.startsWith('--error=')),error=errorArg?Number(errorArg.slice(8)):(permissive?1e-3:1e-4);if(process.argv.slice(2).some(a=>a!=='--permissive'&&!a.startsWith('--error='))||!Number.isFinite(error)||error<=0||errorArg&&!permissive)throw Error('Invalid diagnostic option');
const policy={absoluteAppearanceError:error,desiredLeafRatio:.5,attributeWeights:[1,1,1,100,100],flags:['LockBorder','ErrorAbsolute','Sparse',...(permissive?['Permissive']:[])],interpretation:'Approximate quadric appearance metric, not a maximum silhouette/UV/normal bound. No tolerance or quality gate is changed. Permissive allows attribute-seam collapses in this independent training proposal.'};
for(let f=0;f<labels.length;f++)if(labels[f]<2)triangles.push({index:Array.from(ix.subarray(f*3,f*3+3)),label:labels[f],ancestor:f,ancestry:'exact retained source triangle'});
for(const label of [...new Set(labels.filter(l=>l>=2))].sort((a,b)=>a-b)){
 const faces=labels.flatMap((l,f)=>l===label?[f]:[]),input=Uint32Array.from(faces.flatMap(f=>Array.from(ix.subarray(f*3,f*3+3)))),exact=new Map(faces.map(f=>[Array.from(ix.subarray(f*3,f*3+3)).join(),f])),incident=new Map();
 for(const f of faces)for(const v of ix.subarray(f*3,f*3+3)){if(!incident.has(v))incident.set(v,[]);incident.get(v).push(f);}
 const [output,error]=MeshoptSimplifier.simplifyWithAttributes(input,p,3,attributes,5,policy.attributeWeights,null,Math.max(3,Math.floor(faces.length*.5)*3),policy.absoluteAppearanceError,policy.flags);
 rows.push({label,sourceFaces:faces.length,proposedFaces:output.length/3,reportedAppearanceError:error,originalVertexLanesUnchanged:true});
 for(let i=0;i<output.length;i+=3){const tri=Array.from(output.subarray(i,i+3));let ancestor=exact.get(tri.join()),ancestry='exact retained source triangle';
  if(ancestor===undefined){ancestry='nearest incident source centroid, approximate priority only';const center=[0,1,2].map(axis=>tri.reduce((sum,v)=>sum+p[v*3+axis],0)/3),candidates=[...new Set(tri.flatMap(v=>incident.get(v)??[]))];let best=Infinity;for(const f of candidates){let d=0;for(let axis=0;axis<3;axis++){const delta=(p[ix[f*3]*3+axis]+p[ix[f*3+1]*3+axis]+p[ix[f*3+2]*3+axis])/3-center[axis];d+=delta*delta;}if(d<best||(d===best&&f<ancestor)){best=d;ancestor=f;}}if(ancestor===undefined)throw Error('Missing ancestry proposal');}
  triangles.push({index:tri,label,ancestor,ancestry});
 }
}
if(createHash('sha256').update(new Uint8Array(p.buffer)).update(new Uint8Array(attributes.buffer)).digest('hex')!==before)throw Error('Simplifier changed vertex lanes');
triangles.sort((a,b)=>a.ancestor-b.ancestor);const cornerData=new Float32Array(triangles.length*3*8);let offset=0;
for(const triangle of triangles)for(const v of triangle.index){cornerData.set(p.subarray(v*3,v*3+3),offset);cornerData.set(n.subarray(v*3,v*3+3),offset+3);cornerData.set(uv.subarray(v*2,v*2+2),offset+6);offset+=8;}
const exactDrawOrder=triangles.length===ix.length/3&&triangles.every((t,f)=>t.label===labels[f]&&t.index.every((v,c)=>v===ix[f*3+c]));
if(rows.every(r=>r.sourceFaces===r.proposedFaces)&&!exactDrawOrder)throw Error('No-collapse result changed original corner order');
const core=labels.filter(l=>l<2).length,leaf=rows.reduce((sum,r)=>sum+r.proposedFaces,0),payload={status:'CONSTRAINED_LEAF_REMODELLING_NOT_APPROVED',mesh:node.name,sourceSha256:receipt.sourceSha256,policy,cornerFloat32Base64:Buffer.from(cornerData.buffer).toString('base64'),faceLabels:triangles.map(t=>t.label),sourceCornerVertexIds:triangles.map(t=>t.index),facePriorityAncestry:triangles.map(t=>({face:t.ancestor,meaning:t.ancestry})),limitations:['Original lanes retained by bits; interpolation/topology can still change under real growth/bridge/shadow shaders.', 'Border lock is topological, not proof of every camera silhouette.', 'Approximate priority ancestry is not a bridge correspondence or exact original face ID.', 'No GLB export/activation, no measured GPU benefit or visual acceptance.']};
const bytes=Buffer.from(JSON.stringify(payload)+'\n'),sha=createHash('sha256').update(bytes).digest('hex'),archive='.cache/frontside-model-pilot/candidates/archive/'+sha+'.json';await writeFile(archive,bytes);
const unique=new Set(),lane=new Float32Array(9),bits=new Uint32Array(lane.buffer);
for(let f=0;f<triangles.length;f++)for(let c=0;c<3;c++){lane.set(cornerData.subarray((f*3+c)*8,(f*3+c+1)*8));lane[8]=0;unique.add(Array.from(bits).join());if(triangles[f].label>=2){for(let j=3;j<6;j++)lane[j]=-lane[j];lane[8]=1;unique.add(Array.from(bits).join());}}
const projectedTriangles=core+2*leaf,indexWidth=unique.size>65535?4:2,sourceBytes=p.byteLength+n.byteLength+uv.byteLength+ix.length*2;
const report={status:'CONSTRAINED_LEAF_COST_DIAGNOSIS_NOT_APPROVAL',sourceSha256:receipt.sourceSha256,mesh:node.name,policy,exactOriginalDrawCornerOrder:exactDrawOrder,sourceTriangles:ix.length/3,forwardTriangles:triangles.length,projectedAllLeafReverseTriangles:projectedTriangles,projectedTriangleChangePercent:100*(projectedTriangles/(ix.length/3)-1),projectedReverseVertices:unique.size,projectedStateGeometryBytes:unique.size*36+projectedTriangles*3*indexWidth,sourceStateGeometryBytes:sourceBytes,leaves:rows,archive,archiveSha256:sha,limitations:payload.limitations};
await writeFile(folder+(permissive?'maize-permissive-leaf-reduction'+(errorArg?'-error-'+error:'')+'-diagnostic.json':'maize-constrained-leaf-reduction-diagnostic.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
