// Preserve the original four-decimal lookup, with allocation-free keys for the
// integer terrain lattice. String fallback keeps irregular coordinates distinct.
export function mudTerrainKey(x,z){
 const a=Number.isInteger(x)?x:Number(x.toFixed(4)),b=Number.isInteger(z)?z:Number(z.toFixed(4));
 if(!(a===0&&x<0)&&!(b===0&&z<0)&&Number.isInteger(a)&&Number.isInteger(b)&&a>=-32768&&a<32768&&b>=-32768&&b<32768)return (a+32768)+(b+32768)*65536;
 return x.toFixed(4)+','+z.toFixed(4);
}
// Pure immutable-input calculation. No world queries, Three objects or GPU state.
export function* computeMudEdgeSteps(input){
 let cacheHits=0,uniqueVertices=0,segmentTests=0;
 function* pause(label){yield label;}
  const {gp,gc,gn,p,origin,outlines}=input,grid=new Map();
  for(let i=0;i<gp.count;i++){if(i%256===0)yield* pause('mud-edges-grid');grid.set(mudTerrainKey(gp.getX(i),gp.getZ(i)),i);}
  const colors=new Float32Array(p.count*3),normals=new Float32Array(p.count*3),edges=new Float32Array(p.count),vertexCache=new Map();
  const contours=outlines.map(points=>({points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))}));
  for(let i=0;i<p.count;i++){
   if(i%256===0)yield* pause('mud-edges-vertices');
   const x=p.getX(i),z=p.getZ(i),ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
   const cacheKey=x+','+z,previous=vertexCache?.get(cacheKey);
   if(previous!==undefined){colors.set(colors.subarray(previous*3,previous*3+3),i*3);normals.set(normals.subarray(previous*3,previous*3+3),i*3);edges[i]=edges[previous];cacheHits++;continue;}
   uniqueVertices++;
   const corners=fx+fz<=1?[[ix,iz,1-fx-fz],[ix+1,iz,fx],[ix,iz+1,fz]]:[[ix+1,iz+1,fx+fz-1],[ix,iz+1,1-fx],[ix+1,iz,1-fz]];
   for(const [cx,cz,w]of corners){if(w<1e-7)continue;const j=grid.get(mudTerrainKey(cx,cz));if(j===undefined)throw Error('Missing terrain interpolation vertex '+cx+','+cz);for(let k=0;k<3;k++){colors[i*3+k]+=gc.getComponent(j,k)*w;normals[i*3+k]+=gn.getComponent(j,k)*w}}
   let dist=Infinity;const wx=x+origin[0],wz=z+origin[1];
   const bounds=c=>Math.hypot(Math.max(c.minX-wx,0,wx-c.maxX),Math.max(c.minZ-wz,0,wz-c.maxZ));
   const scan=c=>{const contour=c.points;for(let j=0;j<contour.length;j++){
    segmentTests++;const a=contour[j],b=contour[(j+1)%contour.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((wx-a[0])*dx+(wz-a[1])*dz)/(dx*dx+dz*dz)));dist=Math.min(dist,Math.hypot(wx-a[0]-t*dx,wz-a[1]-t*dz));
   }};
   {
    let nearest=contours[0],minimum=Infinity;for(const c of contours){const lower=bounds(c);if(lower<minimum){minimum=lower;nearest=c}}
    scan(nearest);for(const c of contours)if(c!==nearest&&bounds(c)<dist)scan(c);
   }edges[i]=dist;vertexCache?.set(cacheKey,i);
  }
 return {colors,normals,edges,cacheHits,uniqueVertices,segmentTests};
}
