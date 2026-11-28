// Transfer a reviewed attribute-only correction to an expressive export.
// Usage: node tools/guardian/transfer_normal_frame_corrections.mjs source.glb repaired.glb expressive.glb output.glb
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {BufferGeometry,BufferAttribute,Vector3,Quaternion,Matrix4} from 'three';
import {readGlb,writeGlb} from '../glb-container.mjs';

const [sourcePath,repairedPath,editedPath,outputPath]=process.argv.slice(2);
if(!outputPath||[sourcePath,repairedPath,editedPath].some(p=>path.resolve(p)===path.resolve(outputPath)))throw Error('Use a separate output path');
const files=[sourcePath,repairedPath,editedPath].map(p=>readGlb(fs.readFileSync(p)));
const originalEditedBin=Uint8Array.from(files[2].bin),allowedWrites=new Set();
function attribute(file,index,width){
 const a=file.json.accessors[index],b=file.json.bufferViews[a.bufferView];
 const types={5126:[4,'getFloat32'],5125:[4,'getUint32'],5123:[2,'getUint16'],5121:[1,'getUint8']},[bytes,method]=types[a.componentType];
 const view=new DataView(file.bin.buffer,file.bin.byteOffset,file.bin.byteLength);
 const sparseOffsets=new Map();
 if(a.sparse){
  const {indices,values,count}=a.sparse,ib=file.json.bufferViews[indices.bufferView],vb=file.json.bufferViews[values.bufferView],[size,readIndex]=types[indices.componentType];
  for(let i=0;i<count;i++)sparseOffsets.set(view[readIndex]((ib.byteOffset??0)+(indices.byteOffset??0)+i*size,true),(vb.byteOffset??0)+(values.byteOffset??0)+i*width*bytes);
 }
 const offset=i=>sparseOffsets.get(i)??(b?(b.byteOffset??0)+(a.byteOffset??0)+i*(b.byteStride??width*bytes):null);
 return {count:a.count,read:i=>Array.from({length:width},(_,k)=>offset(i)===null?0:view[method](offset(i)+k*bytes,true)),
  write(i,v){if(a.componentType!==5126)throw Error('Float write required');const start=offset(i);if(start===null){if(v.some(x=>Math.abs(x)>1e-12))throw Error('Cannot add a nonzero sparse entry');return;}v.forEach((x,k)=>{view.setFloat32(start+k*4,x,true);if(file===files[2])for(let byte=0;byte<4;byte++)allowedWrites.add(start+k*4+byte);});delete a.min;delete a.max;}};
}
const body=file=>file.json.meshes.flatMap(m=>m.primitives).find(p=>file.json.materials[p.material]?.normalTexture);
const [source,repaired,edited]=files,[sp,rp,ep]=files.map(body);
if(!sp||!rp||!ep||sp.attributes.TANGENT===undefined)throw Error('Normal-mapped source with tangents required');
const sPos=attribute(source,sp.attributes.POSITION,3),sUv=attribute(source,sp.attributes.TEXCOORD_0,2),sN=attribute(source,sp.attributes.NORMAL,3),sT=attribute(source,sp.attributes.TANGENT,4);
const rN=attribute(repaired,rp.attributes.NORMAL,3),rT=attribute(repaired,rp.attributes.TANGENT,4);
const ePos=attribute(edited,ep.attributes.POSITION,3),eUv=attribute(edited,ep.attributes.TEXCOORD_0,2),eN=attribute(edited,ep.attributes.NORMAL,3);
if(sN.count!==rN.count)throw Error('Repaired source topology changed');
const uvKey=v=>v.map(n=>Math.round(n*1e5)).join(','),uvGroups=new Map();
for(let i=0;i<sPos.count;i++){const k=uvKey(sUv.read(i));if(!uvGroups.has(k))uvGroups.set(k,[]);uvGroups.get(k).push(i);}
// Blender may bake a constant object translation into POSITION on export.
// Infer it from unique UV correspondences, then require positional agreement.
const offsets=[[],[],[]];
for(let i=0;i<ePos.count;i++){
 const ids=uvGroups.get(uvKey(eUv.read(i)));if(ids?.length!==1)continue;
 const a=sPos.read(ids[0]),b=ePos.read(i);for(let k=0;k<3;k++)offsets[k].push(b[k]-a[k]);
}
if(offsets[0].length<100)throw Error('Insufficient unique UV anchors');
const translation=offsets.map(values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]);
const array=(a,width)=>Float32Array.from(Array.from({length:a.count},(_,i)=>a.read(i)).flat());
const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(array(ePos,3),3));geometry.setAttribute('normal',new BufferAttribute(array(eN,3),3));geometry.setAttribute('uv',new BufferAttribute(array(eUv,2),2));
const indices=attribute(edited,ep.indices,1);geometry.setIndex(new BufferAttribute(Uint32Array.from({length:indices.count},(_,i)=>indices.read(i)[0]),1));
geometry.computeTangents();const tangents=geometry.attributes.tangent.array;
const targetNormals=(ep.targets??[]).filter(t=>t.NORMAL!==undefined).map(t=>attribute(edited,t.NORMAL,3));
const basis=(n,t)=>{const normal=new Vector3(...n).normalize(),tangent=new Vector3(...t.slice(0,3));tangent.addScaledVector(normal,-tangent.dot(normal)).normalize();return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(tangent,new Vector3().crossVectors(normal,tangent),normal));};
const sourceIndices=attribute(source,sp.indices,1);
const sourceTriangles=[];
for(let i=0;i<sourceIndices.count;i+=3){const ids=[0,1,2].map(k=>sourceIndices.read(i+k)[0]);sourceTriangles.push({ids,uv:ids.map(id=>sUv.read(id)),pos:ids.map(id=>sPos.read(id))});}
function interpolateSource(vertex){
 const uv=eUv.read(vertex),position=ePos.read(vertex);let nearest=null,best=.003;
 for(const triangle of sourceTriangles){
  const [a,b,c]=triangle.uv,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;
  const u=((b[1]-c[1])*(uv[0]-c[0])+(c[0]-b[0])*(uv[1]-c[1]))/den,v=((c[1]-a[1])*(uv[0]-c[0])+(a[0]-c[0])*(uv[1]-c[1]))/den,w=1-u-v;
  if(Math.min(u,v,w)<-1e-5)continue;
  const weights=[u,v,w],point=[0,1,2].map(k=>triangle.pos.reduce((sum,p,j)=>sum+p[k]*weights[j],translation[k])),distance=Math.hypot(...point.map((p,k)=>p-position[k]));
  if(distance>=best)continue;
  const blend=(attribute,width)=>Array.from({length:width},(_,k)=>triangle.ids.reduce((sum,id,j)=>sum+attribute.read(id)[k]*weights[j],0));
  nearest={oldN:blend(sN,3),oldT:blend(sT,4),newN:blend(rN,3),newT:blend(rT,4),distance};best=distance;
 }
 if(nearest){nearest.oldT[3]=nearest.oldT[3]<0?-1:1;nearest.newT[3]=nearest.newT[3]<0?-1:1;}
 return nearest;
}
let matched=0,interpolated=0,corrected=0,unmatched=0,reauthored=0,maxDistance=0;
for(let i=0;i<ePos.count;i++){
 const p=ePos.read(i),ids=uvGroups.get(uvKey(eUv.read(i)))??[];
 let best=-1,distance=Infinity,normalAngle=Infinity;
 const editedNormal=new Vector3(...eN.read(i)).normalize();
 for(const id of ids){const q=sPos.read(id),d=Math.hypot(...q.map((v,k)=>v+translation[k]-p[k])),angle=editedNormal.angleTo(new Vector3(...sN.read(id)).normalize());if(d<1e-5&&angle<normalAngle){distance=d;normalAngle=angle;best=id;}}
 let frame;
 if(best<0||distance>1e-5){frame=interpolateSource(i);if(!frame){unmatched++;continue;}interpolated++;distance=frame.distance;normalAngle=editedNormal.angleTo(new Vector3(...frame.oldN).normalize());}
 else{frame={oldN:sN.read(best),oldT:sT.read(best),newN:rN.read(best),newT:rT.read(best)};matched++;}
 maxDistance=Math.max(maxDistance,distance);
 // A mouth incision can retain the old position and UV but change the face
 // normal. Its tangent must follow the edited geometry, not the old surface.
 if(normalAngle>.01){reauthored++;continue;}
 const {oldN,oldT,newN,newT}=frame;
 const rotation=basis(newN,newT).multiply(basis(oldN,oldT).invert()).normalize();
 const normal=new Vector3(...eN.read(i)).normalize().applyQuaternion(rotation);
 const tangent=new Vector3(...oldT.slice(0,3)).applyQuaternion(rotation);
 tangent.addScaledVector(normal,-tangent.dot(normal)).normalize();
 eN.write(i,normal.toArray());tangents.set([...tangent.toArray(),oldT[3]],i*4);
 if(rotation.angleTo(new Quaternion())>1e-5){
  corrected++;
  for(const target of targetNormals)target.write(i,new Vector3(...target.read(i)).applyQuaternion(rotation).toArray());
 }
}
if(matched/ePos.count<.97)throw Error('Too few verified source correspondences: '+matched+'/'+ePos.count);
// New incision vertices use generated tangents. Degenerate UVs get a valid
// orthogonal fallback; they do not inherit an unrelated source island frame.
let fallback=0;
for(let i=0;i<ePos.count;i++)if(Math.hypot(...tangents.slice(i*4,i*4+3))<.5){
 const n=new Vector3(...eN.read(i)).normalize(),axis=Math.abs(n.x)<.8?new Vector3(1,0,0):new Vector3(0,1,0);
 axis.addScaledVector(n,-axis.dot(n)).normalize();tangents.set([...axis.toArray(),1],i*4);fallback++;
}
const offset=Math.ceil(edited.bin.length/4)*4,bytes=Buffer.alloc(offset+tangents.byteLength);Buffer.from(edited.bin).copy(bytes);Buffer.from(tangents.buffer,tangents.byteOffset,tangents.byteLength).copy(bytes,offset);
const bufferView=edited.json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:tangents.byteLength,target:34962})-1;
ep.attributes.TANGENT=edited.json.accessors.push({bufferView,componentType:5126,count:ePos.count,type:'VEC4'})-1;
edited.json.buffers[0].byteLength=bytes.length;
for(let i=0;i<edited.bin.length;i++)if(edited.bin[i]!==originalEditedBin[i]&&!allowedWrites.has(i))throw Error('Non-normal data changed at '+i);
fs.writeFileSync(outputPath,writeGlb(edited.json,bytes));
const report={sourcePath,repairedPath,editedPath,outputPath,translation,matched,interpolated,corrected,unmatched,reauthored,maxDistance,fallback,normalMorphTargets:targetNormals.length,otherBinaryDataUnchanged:true,inputSha256:createHash('sha256').update(fs.readFileSync(editedPath)).digest('hex'),outputSha256:createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex')};
fs.writeFileSync(outputPath+'.transfer.json',JSON.stringify(report,null,2));console.log(report);
