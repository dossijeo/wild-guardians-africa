// Offline tangent-normal seam correction. No geometry, albedo or animation edits.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Vector3} from 'three';
import {readGlb,writeGlb} from '../glb-container.mjs';
const source='public/assets/e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb';
const sourceBytes=fs.readFileSync(source);if(createHash('sha256').update(sourceBytes).digest('hex')!=='e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202')throw Error('Unreviewed source');
const {json:j,bin}=readGlb(sourceBytes);const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
function attr(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],w={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size=a.componentType===5123?2:4;return {count:a.count,get(i){return Array.from({length:w},(_,k)=>{const at=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??w*size)+k*size;return a.componentType===5126?view.getFloat32(at,true):size===2?view.getUint16(at,true):view.getUint32(at,true);});}};}
const p=j.meshes.flatMap(m=>m.primitives).find(p=>j.materials[p.material]?.normalTexture),mat=j.materials[p.material],image=j.images[j.textures[mat.normalTexture.index].source],bv=j.bufferViews[image.bufferView];
const {data,info}=await sharp(bin.subarray(bv.byteOffset,bv.byteOffset+bv.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const pos=attr(p.attributes.POSITION),normal=attr(p.attributes.NORMAL),tangent=attr(p.attributes.TANGENT),uv=attr(p.attributes.TEXCOORD_0),indices=attr(p.indices),edges=new Map();
const key=i=>pos.get(i).map(x=>Math.round(x*1e6)).join(',');
const inside=i=>{const [x,y,z]=pos.get(i);return Math.abs(x)<.20&&y>1.09&&y<1.31&&z>.16;};
for(let i=0;i<indices.count;i+=3){const ids=[0,1,2].map(k=>indices.get(i+k)[0]);for(let k=0;k<3;k++){let a=ids[k],b=ids[(k+1)%3];if(!inside(a)||!inside(b))continue;let ka=key(a),kb=key(b);if(ka>kb){[a,b]=[b,a];[ka,kb]=[kb,ka];}const id=ka+'|'+kb;if(!edges.has(id))edges.set(id,[]);edges.get(id).push([a,b]);}}
const mix=(a,b,f)=>a.map((v,k)=>v*(1-f)+b[k]*f);
function sample([a,b],f){const N=new Vector3(...mix(normal.get(a),normal.get(b),f)).normalize(),T=new Vector3(...mix(tangent.get(a),tangent.get(b),f).slice(0,3)).normalize();T.addScaledVector(N,-T.dot(N)).normalize();const B=new Vector3().crossVectors(N,T).multiplyScalar(tangent.get(a)[3]);const [u,v]=mix(uv.get(a),uv.get(b),f),x=u*info.width-.5,y=v*info.height-.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const tex=(x,y,k)=>data[(Math.max(0,Math.min(info.height-1,y))*info.width+Math.max(0,Math.min(info.width-1,x)))*4+k]/255*2-1;const local=[0,1,2].map(k=>(1-fy)*((1-fx)*tex(ix,iy,k)+fx*tex(ix+1,iy,k))+fy*((1-fx)*tex(ix,iy+1,k)+fx*tex(ix+1,iy+1,k)));const world=T.clone().multiplyScalar(local[0]).addScaledVector(B,local[1]).addScaledVector(N,local[2]).normalize();return {N,T,B,x,y,local,world};}
const updates=new Map();let seamCount=0;const radius=12;
for(const pair of edges.values()){
 if(pair.length!==2||pair[0].every((i,k)=>uv.get(i).every((v,n)=>Math.abs(v-uv.get(pair[1][k])[n])<1e-6)))continue;
 if(pair[0].some((i,k)=>new Vector3(...normal.get(i)).angleTo(new Vector3(...normal.get(pair[1][k])))>1.5))continue;
 seamCount++;
 for(let step=0;step<=32;step++){
  const frames=pair.map(e=>sample(e,step/32)),target=frames[0].world.clone().add(frames[1].world).normalize();
  if(frames[0].world.angleTo(frames[1].world)>2.4)continue;
  for(const s of frames){const delta=[target.dot(s.T),target.dot(s.B),target.dot(s.N)].map((v,k)=>v-s.local[k]);
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const x=Math.round(s.x)+dx,y=Math.round(s.y)+dy;if(x<0||x>=info.width||y<0||y>=info.height)continue;
    const d=Math.hypot(x-s.x,y-s.y)/radius;if(d>=1)continue;const w=(1-d*d)**2,id=y*info.width+x;
    if(!updates.has(id))updates.set(id,[0,0,0,0,0]);const a=updates.get(id);for(let k=0;k<3;k++)a[k]+=delta[k]*w;a[3]+=w;a[4]=Math.max(a[4],w);
   }
  }
 }
}
const corrected=Buffer.from(data);for(const [id,a] of updates){const n=new Vector3(...[0,1,2].map(k=>data[id*4+k]/255*2-1+a[k]/a[3]*a[4])).normalize();n.toArray().forEach((v,k)=>corrected[id*4+k]=Math.round((v*.5+.5)*255));}
const png=await sharp(corrected,{raw:info}).png().toBuffer();const padding=Buffer.alloc((4-bin.length%4)%4);image.bufferView=j.bufferViews.length;image.mimeType='image/png';j.bufferViews.push({buffer:0,byteOffset:bin.length+padding.length,byteLength:png.length});const outputBin=Buffer.concat([bin,padding,png]);j.buffers[0].byteLength=outputBin.length;
fs.writeFileSync('test-results/olderMale-normal-texture-trial.glb',writeGlb(j,outputBin));fs.writeFileSync('test-results/olderMale-normal-texture-trial.json',JSON.stringify({status:'REJECTED for production: residual angular cheek defects; isolated trial only',seamCount,modifiedTexels:updates.size,radius,scope:'UV seam neighborhoods; potential nearby-island contamination requires visual review; original binary retained'},null,2));
console.log({seamCount,modifiedTexels:updates.size});
