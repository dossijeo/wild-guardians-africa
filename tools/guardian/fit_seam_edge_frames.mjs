import {Vector3,Quaternion} from 'three';

// Offline bounded relaxation of tangent frames. Images and mesh topology stay
// untouched. This cannot reproduce arbitrary per-pixel edge discrepancies.
export function fitSeamEdgeFrames({indices,pos,norm,tang,uv,normalSample,referenceNormals,iterations=16,maxBaseAngle=.5,bounds=[-.215,1.08,.08,.215,1.55,Infinity]}){
 const key=i=>pos.get(i).map(v=>Math.round(v*1e6)).join(',');
 const face=i=>pos.get(i).every((v,k)=>v>bounds[k]&&v<bounds[k+3]);
 const map=new Map();
 for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
  let a=indices[i+k],b=indices[i+(k+1)%3];if(!face(a)||!face(b))continue;
  let ka=key(a),kb=key(b);if(ka>kb){[a,b]=[b,a];[ka,kb]=[kb,ka];}
  const id=ka+'|'+kb;if(!map.has(id))map.set(id,[]);map.get(id).push([a,b]);
 }
 const edges=[...map.values()].filter(c=>c.length===2&&c[0].some((i,k)=>uv.get(i).some((v,n)=>Math.abs(v-uv.get(c[1][k])[n])>1e-6))&&c[0].every((i,k)=>new Vector3(...referenceNormals[i]).angleTo(new Vector3(...referenceNormals[c[1][k]]))<maxBaseAngle));
 const vertices=new Set(edges.flat(2)),baseline=new Map([...vertices].map(i=>[i,{n:new Vector3(...norm.get(i)),t:tang.get(i)}]));
 function mapped([a,b],f){
  const N=new Vector3(...norm.get(a)).lerp(new Vector3(...norm.get(b)),f).normalize(),T=new Vector3(...tang.get(a).slice(0,3)).lerp(new Vector3(...tang.get(b).slice(0,3)),f).normalize();
  const B=new Vector3().crossVectors(N,T).normalize().multiplyScalar(tang.get(a)[3]),u=uv.get(a).map((v,k)=>v*(1-f)+uv.get(b)[k]*f),q=normalSample(u);
  return T.multiplyScalar(q[0]).addScaledVector(B,q[1]).addScaledVector(N,q[2]).normalize();
 }
 for(let iteration=0;iteration<iterations;iteration++){
  const updates=new Map([...vertices].map(i=>[i,{axis:new Vector3(),weight:0}]));
  for(const pair of edges)for(const f of [0,.25,.5,.75,1]){
   const a=mapped(pair[0],f),b=mapped(pair[1],f),angle=a.angleTo(b);
   if(angle>Math.PI/3)continue;
   const axis=new Vector3().crossVectors(a,b);if(axis.lengthSq()<1e-12)continue;axis.normalize().multiplyScalar(angle*.5);
   for(let side=0;side<2;side++)for(let k=0;k<2;k++){const weight=k?f:1-f,entry=updates.get(pair[side][k]);entry.axis.addScaledVector(axis,weight*(side?-1:1));entry.weight+=weight;}
  }
  for(const [i,u]of updates){if(!u.weight)continue;u.axis.multiplyScalar(.45/u.weight);const angle=u.axis.length();if(angle<1e-8)continue;
   const q=new Quaternion().setFromAxisAngle(u.axis.normalize(),angle),N=new Vector3(...norm.get(i)).applyQuaternion(q),T=new Vector3(...tang.get(i).slice(0,3)).applyQuaternion(q),base=baseline.get(i);
   // Never bend a frame arbitrarily to fit a wrinkle or unrelated surface.
   if(N.angleTo(base.n)>.15)continue;
   norm.set(i,N.toArray());tang.set(i,[...T.toArray(),base.t[3]]);
  }
 }
 return {edges:edges.length,vertices:vertices.size,iterations,maxAdditionalNormalAngle:.15};
}
