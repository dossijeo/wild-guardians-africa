// Experimental selector: deliberately not imported by production raids.
// Selection never applies damage, changes reservations or consumes RNG.
import {activeCrops} from './active-crops.js';
const position=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
const before=(a,b)=>a.distance<b.distance||a.distance===b.distance&&String(a.plant.id)<String(b.plant.id);
export function areaCropTargets(plants,primary,{radius,maxTargets,canHit}){
 if(!Array.isArray(plants)||!Number.isFinite(radius)||radius<0||radius>5||!Number.isSafeInteger(maxTargets)||maxTargets<1||maxTargets>8||typeof canHit!=='function')throw new RangeError('Invalid bounded crop impact configuration');
 if(!position(primary)||!primary.alive)return [];
 const living=activeCrops(plants);
 if(!living.includes(primary)||!canHit(primary))return [];
 if(maxTargets===1||radius===0)return [primary];
 const chosen=[],ids=new Set([primary.id]);
 for(const plant of living){
  if(ids.has(plant.id)||!position(plant))continue;
  const dx=plant.x-primary.x,dz=plant.z-primary.z;
  if(Math.abs(dx)>radius||Math.abs(dz)>radius)continue;
  const distance=Math.hypot(dx,dz);
  if(distance>radius)continue;
  const row={plant,distance};
  if(chosen.length===maxTargets-1&&!before(row,chosen.at(-1)))continue;
  // Only local, potentially selected targets need a shield/occlusion check.
  if(!canHit(plant))continue;
  let index=0;while(index<chosen.length&&!before(row,chosen[index]))index++;
  chosen.splice(index,0,row);ids.add(plant.id);
  if(chosen.length>=maxTargets)ids.delete(chosen.pop().plant.id);
 }
 return [primary,...chosen.map(row=>row.plant)];
}
