// CPU reference for a source primitive's local fragment frame. No cameras,
// face masks, topology changes, GPU arithmetic equivalence or acceptance.
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.sqrt(dot(a,a));if(!(n>0)||!Number.isFinite(n))throw Error('Non-finite or zero source normal');return mul(a,1/n);};
const weighted=(corners,w)=>corners[0].map((_,axis)=>corners.reduce((n,c,lane)=>n+c[axis]*w[lane],0));

export function sourcePrimitiveFrame({viewPositions,viewVertexNormals,uv,weights,baryDx,baryDy,pixelParity=[0,0],faceDirection=1}){
 for(const array of [...viewPositions,...viewVertexNormals,...uv,weights,baryDx,baryDy,pixelParity])if(!array.every(Number.isFinite))throw Error('Non-finite source primitive input');
 if(![-1,1].includes(faceDirection)||pixelParity.some(v=>v!==0&&v!==1))throw Error('Invalid primitive direction or quad parity');
 const viewPosition=weighted(viewPositions,weights),rawNormal=weighted(viewVertexNormals,weights),normal=mul(unit(rawNormal),faceDirection),mapUv=weighted(uv,weights);
 const viewDx=weighted(viewPositions,baryDx),viewDy=weighted(viewPositions,baryDy),uvDx=weighted(uv,baryDx),uvDy=weighted(uv,baryDy);
 const q1perp=cross(viewDy,normal),q0perp=cross(normal,viewDx);
 let tangent=add(mul(q1perp,uvDx[0]),mul(q0perp,uvDy[0])),bitangent=add(mul(q1perp,uvDx[1]),mul(q0perp,uvDy[1]));
 const det=Math.max(dot(tangent,tangent),dot(bitangent,bitangent)),scale=det===0?0:1/Math.sqrt(det);
 tangent=mul(tangent,scale*faceDirection);bitangent=mul(bitangent,scale*faceDirection);
 // Same-primitive extrapolation is intentional: dFdx/dFdy uses helper lanes
 // outside coverage. Evaluating the neighbouring source face changes this.
 const normalDifference=(gradient,parity)=>{
  const sign=parity===0?1:-1,neighbour=mul(unit(weighted(viewVertexNormals,add(weights,mul(gradient,sign)))),faceDirection);
  return parity===0?sub(neighbour,normal):sub(normal,neighbour);
 };
 const normalDx=normalDifference(baryDx,pixelParity[0]),normalDy=normalDifference(baryDy,pixelParity[1]);
 const geometryRoughness=Math.max(...normalDx.map((v,i)=>Math.max(Math.abs(v),Math.abs(normalDy[i]))));
 return{viewPosition,rawNormal,normal,mapUv,viewDx,viewDy,uvDx,uvDy,tangent,bitangent,normalDx,normalDy,geometryRoughness};
}

export function sourceBarycentricGradient(coefficients,domainGradient){
 const dy=coefficients[2]*domainGradient[0]+coefficients[3]*domainGradient[1],dz=coefficients[4]*domainGradient[0]+coefficients[5]*domainGradient[1];
 return[-dy-dz,dy,dz];
}
