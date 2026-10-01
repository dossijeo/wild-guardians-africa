import {cropSpec} from './rules.js';
export function createPlant(id,species,x,z,centerId) {
  const c=cropSpec(species);
  return {id,species,x,z,centerId,alive:true,growth:0,harvestRequested:false,
    water:Array.from({length:c.total_waters},(_,i)=>({at:i*c.growth_seconds/c.total_waters,status:i?'future':'due',wait:0}))};
}
export function waterPlant(p,magic=false) {
  const due=p.water.find(w=>w.status==='due');
  if(!due)return false;
  due.status=magic?'magic':'manual';due.wait=0;return true;
}
export function advancePlant(p,seconds,growthMagic=false) {
  if(!p.alive || p.growth>=cropSpec(p.species).growth_seconds || p.water[0].status==='due')return;
  const spec=cropSpec(p.species), tolerance=spec.derived_tolerance_seconds;
  let left=seconds;
  while(left>1e-9) {
    const due=p.water.filter(w=>w.status==='due');
    const magic=growthMagic && due.length===0;
    const rate=magic?1.5:1;
    const next=p.water.find(w=>w.status==='future');
    const untilCheckpoint=next?Math.max(0,(next.at-p.growth)/rate):Infinity;
    const untilDry=due.length?Math.max(0,Math.min(...due.map(w=>tolerance-w.wait))):Infinity;
    if(untilDry<=1e-9) return;
    const step=Math.min(left,untilCheckpoint,untilDry,(spec.growth_seconds-p.growth)/rate);
    due.forEach(w=>w.wait+=step);
    p.growth+=step*rate;left-=step;
    if(next && p.growth>=next.at-1e-9)next.status=magic?'magic':'due';
    if(p.growth>=spec.growth_seconds-1e-9) {
      p.growth=p.water.some(w=>w.status==='due')?spec.growth_seconds-1e-7:spec.growth_seconds;
      return;
    }
    if(step<=1e-12 && !next)return;
  }
}
export const isMature=p=>p.alive && p.growth>=cropSpec(p.species).growth_seconds;
export function contiguousGroup(plants,root,maxDistance=1.7) {
  const candidates=plants.filter(p=>p.alive&&p.species===root.species);
  const visited=new Set([root.id]);const queue=[root];
  for(let i=0;i<queue.length;i++)for(const p of candidates)if(!visited.has(p.id)&&Math.hypot(p.x-queue[i].x,p.z-queue[i].z)<=maxDistance) {
    visited.add(p.id);queue.push(p);
  }
  return queue;
}

