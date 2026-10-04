// These bounds belong to the navigation geometry snapshot, rebuilt by setState.
// Walls/gates keep their original exact tests because their panels can move.
export function navigationBounds(obstacle){
  if(obstacle.kind==='wall'||obstacle.gate)return null;
  if(obstacle.footprint){
    let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
    for(const p of obstacle.footprint){minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.z);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.z);}
    return [minX,minZ,maxX,maxZ];
  }
  return [obstacle.x-obstacle.radius,obstacle.z-obstacle.radius,obstacle.x+obstacle.radius,obstacle.z+obstacle.radius];
}
export function outsideNavigationBounds(start,end,bounds,radius){
  if(!bounds)return false;
  const pad=radius+1e-8;
  return Math.max(start.x,end.x)+pad<bounds[0]||Math.min(start.x,end.x)-pad>bounds[2]||Math.max(start.z,end.z)+pad<bounds[1]||Math.min(start.z,end.z)-pad>bounds[3];
}
