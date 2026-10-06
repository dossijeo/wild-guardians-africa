// Insert authored tree feet into the coarse terrain triangulation offline.
// Trees never move. Only the proxy surface gains local contact vertices.
export function groundTriangleWeights(positions,triangle,x,z){
 const [a,b,c]=triangle.map(i=>[positions[i*3],positions[i*3+2]]),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
 if(Math.abs(den)<1e-10)return null;
 const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/den;
 return [u,v,1-u-v];
}
export function groundCellTriangles(data,x,z){
 const patch=data.contactCells?.[x+':'+z];if(patch)return patch;
 const a=z*(data.nx+1)+x,b=a+1,d=a+data.nx+1,c=d+1;return [[a,d,b],[b,d,c]];
}
export function fitFarGroundContacts(data,anchors){
 const positions=Array.from(data.positions),colors=Array.from(data.colors),cells={},inserted=[],seen=new Set();
 const {bounds,nx,nz}=data;
 for(const anchor of anchors){
  const x=Math.fround(anchor.x),z=Math.fround(anchor.z),y=Math.fround(anchor.y),key=x+':'+z;
  if(seen.has(key)||x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)continue;
  const ix=Math.min(nx-1,Math.floor((x-bounds.minX)/(bounds.maxX-bounds.minX)*nx)),iz=Math.min(nz-1,Math.floor((z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*nz)),hits=[];
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const cx=ix+dx,cz=iz+dz;if(cx<0||cz<0||cx>=nx||cz>=nz)continue;
   const cellKey=cx+':'+cz,list=cells[cellKey]??groundCellTriangles(data,cx,cz);
   for(let i=0;i<list.length;i++){const weights=groundTriangleWeights(positions,list[i],x,z);if(weights&&weights.every(w=>w>=-1e-7))hits.push({cellKey,list,i,weights});}
  }
  if(!hits.length)continue;
  const vertex=positions.length/3,hit=hits[0];positions.push(x,y,z);
  for(let channel=0;channel<3;channel++)colors.push(hit.list[hit.i].reduce((sum,v,i)=>sum+colors[v*3+channel]*hit.weights[i],0));
  const byCell=new Map();for(const h of hits){if(!byCell.has(h.cellKey))byCell.set(h.cellKey,{list:h.list,indices:new Set()});byCell.get(h.cellKey).indices.add(h.i);}
  for(const [cellKey,{list,indices}] of byCell){const next=[];
   for(let i=0;i<list.length;i++){const triangle=list[i];if(!indices.has(i)){next.push(triangle);continue;}
    for(let edge=0;edge<3;edge++){const tri=[triangle[edge],triangle[(edge+1)%3],vertex];if(groundTriangleWeights(positions,tri,x,z))next.push(tri);}
   }cells[cellKey]=next;
  }
  seen.add(key);inserted.push({id:anchor.id,vertex});
 }
 const indices=[];for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)for(const triangle of cells[x+':'+z]??groundCellTriangles(data,x,z))indices.push(...triangle);
 return {...data,positions:new Float32Array(positions),colors:new Float32Array(colors),indices:new Uint32Array(indices),contactCells:cells,contactAnchors:inserted};
}
