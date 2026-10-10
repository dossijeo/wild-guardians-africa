import {cropSpec} from './rules.js';
export function createPlant(id,species,x,z,centerId) {
  const c=cropSpec(species);
  return {id,species,x,z,centerId,alive:true,growth:0,harvestRequested:false,
    water:Array.from({length:c.total_waters},(_,i)=>({at:i*c.growth_seconds/c.total_waters,status:i?'future':'due',wait:0}))};
}
function satisfyWater(p,water,magic) {
  water.status=magic?'magic':'manual';water.wait=0;p.toleranceBonus=0;
}
export function waterPlant(p,magic=false) {
  const due=p.water.find(w=>w.status==='due');
  if(!due)return false;
  satisfyWater(p,due,magic);return true;
}
export function advancePlant(p,seconds,growthMagic=false) {
  if(!p.alive || p.growth>=cropSpec(p.species).growth_seconds || p.water[0].status==='due')return 0;
  const spec=cropSpec(p.species), tolerance=spec.derived_tolerance_seconds*(1+(p.toleranceBonus??0));
  let left=seconds,extraGrowth=0;
  while(left>1e-9) {
    let dueCount=0,remainingTolerance=Infinity;
    for(const water of p.water)if(water.status==='due'){dueCount++;remainingTolerance=Math.min(remainingTolerance,tolerance-water.wait);}
    const magic=growthMagic && dueCount===0;
    const intensity=growthMagic===true?1:typeof growthMagic==='number'?Math.min(1,Math.max(0,growthMagic)):0;
    const rate=magic?1+.5*intensity:1;
    const next=p.water.find(w=>w.status==='future');
    const untilCheckpoint=next?Math.max(0,(next.at-p.growth)/rate):Infinity;
    const untilDry=dueCount?Math.max(0,remainingTolerance):Infinity;
    if(untilDry<=1e-9) return extraGrowth;
    const step=Math.min(left,untilCheckpoint,untilDry,(spec.growth_seconds-p.growth)/rate);
    if(dueCount)for(const water of p.water)if(water.status==='due')water.wait+=step;
    p.growth+=step*rate;left-=step;if(magic)extraGrowth+=step*.5*intensity;
    if(next && p.growth>=next.at-1e-9) {
      if(magic&&growthMagic===true)satisfyWater(p,next,true);else next.status='due';
      if(!magic&&p.nextTolerancePenalty){next.wait=tolerance*p.nextTolerancePenalty;p.nextTolerancePenalty=0;}
    }
    if(p.growth>=spec.growth_seconds-1e-9) {
      p.growth=p.water.some(w=>w.status==='due')?spec.growth_seconds-1e-7:spec.growth_seconds;
      return extraGrowth;
    }
    if(step<=1e-12 && !next)return extraGrowth;
  }
  return extraGrowth;
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
