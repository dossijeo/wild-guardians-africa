import {contiguousGroup} from './crops.js';

// One synchronous target-selection scope only. No index survives damage,
// planting, harvesting or save restoration. Preserve the original BFS order:
// equal-distance targets rely on the stable order of the component's members.
export function createCropGrouping(plants,maxDistance=1.7){
 const living=plants.filter(p=>p.alive),species=new Map();
 for(const plant of living){let row=species.get(plant.species);if(!row)species.set(plant.species,row={plants:[],cells:null});row.plants.push(plant);}
 const safe=p=>Number.isSafeInteger(Math.floor(p.x/maxDistance))&&Number.isSafeInteger(Math.floor(p.z/maxDistance));
 const key=(x,z)=>x+','+z;
 function group(root){
  const row=species.get(root.species);
  if(!row)return [root];
  if(row.plants.length<64||!(maxDistance>0)||!Number.isFinite(maxDistance)||!safe(root))return contiguousGroup(row.plants,root,maxDistance);
  if(row.cells===null){
   if(!row.plants.every(safe)){row.cells=false;}
   else{row.cells=new Map();for(let index=0;index<row.plants.length;index++){
    const p=row.plants[index],cell=key(Math.floor(p.x/maxDistance),Math.floor(p.z/maxDistance));
    let entries=row.cells.get(cell);if(!entries)row.cells.set(cell,entries=[]);entries.push(index);
   }}
  }
  if(row.cells===false)return contiguousGroup(row.plants,root,maxDistance);
  const seen=new Set([root.id]),queue=[root];
  for(let head=0;head<queue.length;head++){
   const p=queue[head],cx=Math.floor(p.x/maxDistance),cz=Math.floor(p.z/maxDistance),near=[];
   // One extra cell covers floating-point rounding at an exact threshold
   // (for example -1e-200 and +1.7); Math.hypot remains the final authority.
   for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
    const entries=row.cells.get(key(cx+dx,cz+dz));if(entries)for(const index of entries)near.push(index);
   }
   near.sort((a,b)=>a-b);
   for(const index of near){const q=row.plants[index];if(!seen.has(q.id)&&Math.hypot(q.x-p.x,q.z-p.z)<=maxDistance){seen.add(q.id);queue.push(q);}}
  }
  return queue;
 }
 return {living,group};
}
