// Read-only diagnosis: compare both UV copies along facial seam edges, not
// only coincident vertices. Reports normal-map continuity without editing skin.
import fs from 'node:fs';
import sharp from 'sharp';
import {Vector3} from 'three';
import {readGlb} from '../glb-container.mjs';
const files=process.argv.slice(2);if(!files.length)throw Error('Provide GLBs to compare');
const results=[];let referenceEdges=null;
for(const file of files){
 const {json:j,bin}=readGlb(fs.readFileSync(file)),view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
 const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},sizes={5123:2,5125:4,5126:4};
 function attribute(id){const a=j.accessors[id],b=j.bufferViews[a.bufferView],width=widths[a.type],size=sizes[a.componentType];if(!width||!size||a.sparse)throw Error('Unsupported accessor');return {count:a.count,get(i){return Array.from({length:width},(_,k)=>{const at=(b.byteOffset??0)+(a.byteOffset??0)+i*(b.byteStride??width*size)+k*size;return a.componentType===5126?view.getFloat32(at,true):a.componentType===5125?view.getUint32(at,true):view.getUint16(at,true);});}};}
 const edges=[];
 for(const mesh of j.meshes)for(const p of mesh.primitives){
  const material=j.materials[p.material];if(!material.normalTexture||p.attributes.TANGENT===undefined)continue;
  const image=j.images[j.textures[material.normalTexture.index].source],bv=j.bufferViews[image.bufferView];
  const {data,info}=await sharp(bin.subarray(bv.byteOffset??0,(bv.byteOffset??0)+bv.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const pos=attribute(p.attributes.POSITION),n=attribute(p.attributes.NORMAL),t=attribute(p.attributes.TANGENT),uv=attribute(p.attributes.TEXCOORD_0),ix=attribute(p.indices),map=new Map();
  const key=i=>pos.get(i).map(v=>Math.round(v*1e6)).join(',');
  const face=i=>{const [x,y,z]=pos.get(i);return Math.abs(x)<.215&&y>1.08&&y<1.55&&z>.08;};
  for(let i=0;i<ix.count;i+=3){const ids=[0,1,2].map(k=>ix.get(i+k)[0]);for(let k=0;k<3;k++){let a=ids[k],b=ids[(k+1)%3];if(!face(a)||!face(b))continue;let ka=key(a),kb=key(b);if(ka>kb){[a,b]=[b,a];[ka,kb]=[kb,ka];}const edge=ka+'|'+kb;if(!map.has(edge))map.set(edge,[]);map.get(edge).push([a,b]);}}
  const lerp=(attr,a,b,f)=>attr.get(a).map((v,k)=>v*(1-f)+attr.get(b)[k]*f);
  function sample(a,b,f){
   const N=new Vector3(...lerp(n,a,b,f)).normalize(),T=new Vector3(...lerp(t,a,b,f).slice(0,3)).normalize(),hand=t.get(a)[3],B=new Vector3().crossVectors(N,T).normalize().multiplyScalar(hand);
   const [u,v]=lerp(uv,a,b,f),x=u*info.width-.5,y=v*info.height-.5,xx=Math.floor(x),yy=Math.floor(y),fx=x-xx,fy=y-yy;
   const tex=(x,y,c)=>data[(Math.max(0,Math.min(info.height-1,y))*info.width+Math.max(0,Math.min(info.width-1,x)))*4+c]/255*2-1;
   const q=[0,1,2].map(c=>(1-fy)*((1-fx)*tex(xx,yy,c)+fx*tex(xx+1,yy,c))+fy*((1-fx)*tex(xx,yy+1,c)+fx*tex(xx+1,yy+1,c)));
   return T.multiplyScalar(q[0]*(material.normalTexture.scale??1)).addScaledVector(B,q[1]*(material.normalTexture.scale??1)).addScaledVector(N,q[2]).normalize();
  }
  for(const [edge,copies] of map){if(copies.length!==2)continue;const [a,b]=copies;if(a.every((id,k)=>uv.get(id).every((v,c)=>Math.abs(v-uv.get(b[k])[c])<1e-6)))continue;
   // Exclude deliberate hard geometry boundaries and opposite-facing shells.
   if(referenceEdges?!referenceEdges.has(edge):a.some((id,k)=>new Vector3(...n.get(id)).angleTo(new Vector3(...n.get(b[k])))>.5))continue;
   const angles=[0,.25,.5,.75,1].map(f=>sample(...a,f).angleTo(sample(...b,f))*180/Math.PI);edges.push({edge,angles});
  }
 }
 if(!referenceEdges)referenceEdges=new Set(edges.map(e=>e.edge));
 const sorted=edges.flatMap(e=>e.angles.slice(1,4)).sort((a,b)=>a-b);
 results.push({file,seamEdges:edges.length,interiorMedian:sorted[Math.floor(sorted.length*.5)],interiorP95:sorted[Math.floor(sorted.length*.95)],worst:edges.sort((a,b)=>Math.max(...b.angles)-Math.max(...a.angles)).slice(0,20)});
}
console.log(JSON.stringify({scope:'Base-level bilinear tangent normals along facial UV seams; no mipmapping, lighting or animation. Diagnostic, not visual acceptance.',results},null,2));
