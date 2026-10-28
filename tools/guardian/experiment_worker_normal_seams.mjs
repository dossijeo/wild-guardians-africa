import {fitSeamEdgeFrames} from './fit_seam_edge_frames.mjs';
// Diagnostic experiment only: original olderFemale, not the expressive candidate.
// Run from the repository root. Output is ignored test-results data.
// Keeps image bytes, topology, skin weights and animation data unchanged.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import sharp from 'sharp';import {Vector3,Quaternion} from 'three';import {readGlb,writeGlb} from '../glb-container.mjs';
const source='public/assets/4c3d590d278e3fc979257b71502ed8b151e5821972e192c19f0228004d70d141.glb';const sourceBytes=fs.readFileSync(source);if(createHash('sha256').update(sourceBytes).digest('hex')!=='4c3d590d278e3fc979257b71502ed8b151e5821972e192c19f0228004d70d141')throw Error('Calibration requires the reviewed source');const {json:j,bin}=readGlb(Buffer.from(sourceBytes));const originalBin=Uint8Array.from(bin);const allowedWrites=new Set();const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
function attr(i,width){const a=j.accessors[i],b=j.bufferViews[a.bufferView];if(a.componentType!==5126)throw Error('float required');return {count:a.count,get(k){return Array.from({length:width},(_,n)=>view.getFloat32((b.byteOffset??0)+(a.byteOffset??0)+k*(b.byteStride??width*4)+n*4,true));},set(k,v){v.forEach((x,n)=>{const offset=(b.byteOffset??0)+(a.byteOffset??0)+k*(b.byteStride??width*4)+n*4;view.setFloat32(offset,x,true);for(let byte=0;byte<4;byte++)allowedWrites.add(offset+byte);});}};}
const edgeFit=process.argv.includes("--edge-fit");const edgeReports=[];let report=[];for(const mesh of j.meshes)for(const p of mesh.primitives){const m=j.materials[p.material];if(!m.normalTexture||p.attributes.TANGENT===undefined)continue;const tex=j.textures[m.normalTexture.index],im=j.images[tex.source],bv=j.bufferViews[im.bufferView];const {data,info}=await sharp(bin.subarray(bv.byteOffset,bv.byteOffset+bv.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});const pos=attr(p.attributes.POSITION,3),norm=attr(p.attributes.NORMAL,3),tang=attr(p.attributes.TANGENT,4),uv=attr(p.attributes.TEXCOORD_0,2);const referenceNormals=Array.from({length:norm.count},(_,i)=>norm.get(i));let groups=new Map();
for(let i=0;i<pos.count;i++){let [x,y,z]=pos.get(i);if(Math.abs(x)>.215||y<1.08||y>1.55||z<.08)continue;let key=pos.get(i).map(x=>Math.round(x*1e6)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
// Match linear texture filtering at texel centers. Sampling a rounded UV
// chooses different sides of the seam and can create a false correction.
function texel(x,y,k){x=Math.max(0,Math.min(info.width-1,x));y=Math.max(0,Math.min(info.height-1,y));return data[(y*info.width+x)*4+k]/255*2-1;}
function normalSample(v){const x=v[0]*info.width-.5,y=v[1]*info.height-.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;return [0,1,2].map(k=>(1-fy)*((1-fx)*texel(ix,iy,k)+fx*texel(ix+1,iy,k))+fy*((1-fx)*texel(ix,iy+1,k)+fx*texel(ix+1,iy+1,k)));}
function frame(i){
 const n=new Vector3(...norm.get(i)).normalize(),ta=tang.get(i),t=new Vector3(...ta.slice(0,3)).normalize(),b=new Vector3().crossVectors(n,t).multiplyScalar(ta[3]);
 const local=normalSample(uv.get(i)),mapped=t.clone().multiplyScalar(local[0]).addScaledVector(b,local[1]).addScaledVector(n,local[2]).normalize();
 return {n,t,ta,mapped};
}
for(const [key,ids] of groups){if(ids.length<2||new Set(ids.map(i=>uv.get(i).map(v=>v.toFixed(6)).join(','))).size<2)continue;const frames=ids.map(frame);if(frames.some(f=>frames.some(g=>f.n.angleTo(g.n)>.5)))continue;const target=frames.reduce((n,f)=>n.add(f.mapped),new Vector3()).normalize();const before=Math.max(...frames.map(f=>f.mapped.angleTo(target)));if(before<.04||before>Math.PI*25/180)continue;for(let k=0;k<ids.length;k++){let f=frames[k],q=new Quaternion().setFromUnitVectors(f.mapped,target);norm.set(ids[k],f.n.applyQuaternion(q).toArray());tang.set(ids[k],[...f.t.applyQuaternion(q).toArray(),f.ta[3]]);}report.push({position:key,vertices:ids.length,maxCorrection:before*180/Math.PI});}
if(edgeFit){const a=j.accessors[p.indices],bv=j.bufferViews[a.bufferView],size=a.componentType===5125?4:2;if(![5123,5125].includes(a.componentType))throw Error('Unsupported index type');const indices=Array.from({length:a.count},(_,i)=>{const at=(bv.byteOffset??0)+(a.byteOffset??0)+i*size;return size===4?view.getUint32(at,true):view.getUint16(at,true);});edgeReports.push(fitSeamEdgeFrames({indices,pos,norm,tang,uv,normalSample,referenceNormals}));}
}


for(const image of j.images){const b=j.bufferViews[image.bufferView],start=b.byteOffset??0; if(!Buffer.from(bin.subarray(start,start+b.byteLength)).equals(Buffer.from(originalBin.subarray(start,start+b.byteLength))))throw Error('Image bytes changed');}
if(!fs.readFileSync(source).equals(sourceBytes))throw Error('Original GLB changed');

// This is an attribute-only experiment. A byte whitelist verifies that skin,
// animation, positions, UVs, indices and embedded image buffers are untouched.
let changedBytes=0;
for(let i=0;i<bin.length;i++)if(bin[i]!==originalBin[i]){if(!allowedWrites.has(i))throw Error('Unexpected binary edit at '+i);changedBytes++;}
console.log(JSON.stringify({changedBytes,allowedBytes:allowedWrites.size,otherBinaryDataUnchanged:true}));

const output=process.argv[2]??'test-results/olderFemale-normal-seam-trial.glb';if(path.resolve(output)===path.resolve(source))throw Error('Separate output required');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,writeGlb(j,bin));fs.writeFileSync(output.replace(/\.glb$/i,'')+'.json',JSON.stringify({status:'experimental, not installed; bilinear sampling; transition quality and expressive mesh transfer still need validation',source,sourceSha256:createHash('sha256').update(sourceBytes).digest('hex'),edgeFit,edgeReports,changedGroups:report.length,changedBytes,allowedBytes:allowedWrites.size,otherBinaryDataUnchanged:true,groups:report},null,2));console.log(report.length,report.slice(0,5));
