// An exhaustive bounded region may be reused in the opposite direction ONLY
// after checking its incoming grid boundary. Native collision sampling can be
// direction-sensitive; assuming symmetry would turn a one-way edge into a
// false failure. Portals/worker routes deliberately keep the original checks.
export function reverseFailureCertified(nav,region,origins,end,radius,ignore,worker){
 if(worker||!origins.length)return false;
 const key=(x,z)=>`${x},${z}`,nodes=region.nodes;
 if(origins.some(p=>nodes.has(key(p.x,p.z))))return false;
 const ex=Math.round(end.x),ez=Math.round(end.z);let connectors=0;
 for(let z=ez-1;z<=ez+1;z++)for(let x=ex-1;x<=ex+1;x++){
  if(!nav.walkable(x,z,radius,ignore,false)||!nav.segmentClear({x,z},end,radius,ignore,false))continue;
  connectors++;if(!nodes.has(key(x,z)))return false;
 }
 if(!connectors)return false;
 if(region.incomingVerified!==undefined)return region.incomingVerified;
 for(const cell of nodes){const [x,z]=cell.split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const nx=x+dx,nz=z+dz;
   if(nx<region.minX||nx>region.maxX||nz<region.minZ||nz>region.maxZ||nodes.has(key(nx,nz)))continue;
   if(!nav.walkable(nx,nz,radius,ignore,false))continue;
   if(dx&&dz&&(!nav.walkable(x,z+dz,radius,ignore,false)||!nav.walkable(x+dx,z,radius,ignore,false)))continue;
   if(nav.segmentClear({x:nx,z:nz},{x,z},radius,ignore,false)){region.incomingVerified=false;return false;}
  }
 }
 region.incomingVerified=true;return true;
}

export function boundedApproachRegionBlocked(nav,actor,radius,minX,minZ,maxX,maxZ){
 const sx=Math.round(actor.x),sz=Math.round(actor.z),key=(x,z)=>`${x},${z}`;
 for(const region of nav.searchedRegions){
  if(region.worker||region.ignore!==null||region.radius!==radius)continue;
  // Include every original margin-32 corridor and every conservative origin
  // connector. A proof for a smaller corridor cannot exclude the whole zone.
  if(Math.min(sx,minX)-32<region.minX||Math.max(sx,maxX)+32>region.maxX||Math.min(sz,minZ)-32<region.minZ||Math.max(sz,maxZ)+32>region.maxZ)continue;
  let intersects=false;
  for(let z=minZ;z<=maxZ&&!intersects;z++)for(let x=minX;x<=maxX;x++)if(region.nodes.has(key(x,z))){intersects=true;break;}
  if(intersects)continue;
  if(reverseFailureCertified(nav,region,[{x:minX,z:minZ}],actor,radius,null,false))return true;
 }
 return false;
}
