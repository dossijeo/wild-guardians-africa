// Snapshot once per raid; visual/audio observers share the same farm boundary.
export function raidFarmBounds(state){
 const points=[...state.plants.filter(p=>p.alive),...state.structures.filter(s=>s.status==='intact')];
 if(!points.length)return null;
 let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.z);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.z);}
 return [minX-12,minZ-12,maxX+12,maxZ+12];
}
