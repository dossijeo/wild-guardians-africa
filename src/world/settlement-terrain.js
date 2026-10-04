// Bioma Lab V4.1.10.3 reserves a flat, cleared village platform with a six
// metre blend. Use the gameplay culture's real units rather than its demo GLB.
export function villageTerrainSite(village,field){
  const buildings=village.buildings??[];
  if(!buildings.length)return null;
  const points=buildings.flatMap(b=>b.footprint??[{x:b.x-(b.radius??1),z:b.z-(b.radius??1)},{x:b.x+(b.radius??1),z:b.z+(b.radius??1)}]);
  const hx=Math.max(...points.map(p=>Math.abs(p.x-village.x)))+1.25,hz=Math.max(...points.map(p=>Math.abs(p.z-village.z)))+1.25;
  const heights=points.map(p=>field.surface(p.x,p.z)).sort((a,b)=>a-b);
  const clearRadius=Math.max(19,Math.hypot(hx,hz));
  const site={x:village.x,z:village.z,y:heights[Math.floor(heights.length/2)],yaw:0,hx,hz,clearRadius,softRadius:clearRadius+6,haloRadius:clearRadius+13};
  if(field.canyon&&buildings.some(b=>Number.isFinite(b.yaw))){
    site.pads=buildings.map(b=>{
      const points=b.footprint??[{x:b.x-b.radius,z:b.z-b.radius},{x:b.x+b.radius,z:b.z+b.radius}];
      return {x:b.x,z:b.z,y:field.surface(b.x,b.z),yaw:0,hx:Math.max(...points.map(p=>Math.abs(p.x-b.x)))+1.25,hz:Math.max(...points.map(p=>Math.abs(p.z-b.z)))+1.25};
    });
  }
  return site;
}
