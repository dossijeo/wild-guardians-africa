import {BALANCE as B} from './balance.js';
import {cropBecameInactive} from './active-crops.js';
export const CROP_HIT_POINTS=B.raids.crop_hit_points;
// Old version-1 plants used two HP and can carry half-point wounds. Preserve
// their wounded fraction lazily at the next real impact, never kill on load.
export const cropImpactDamage=p=>(p.attackHits??0)*CROP_HIT_POINTS/(p.attackHitPoints??2);
export function applyCropImpact(state,plant,requestedDamage){
 if(!plant.alive||!Number.isFinite(requestedDamage)||requestedDamage<=0)return null;
 const before=cropImpactDamage(plant),quota=state.raid?.introCropLimit;
 let damage=Math.min(requestedDamage,Math.max(0,CROP_HIT_POINTS-before));
 if(quota!==undefined&&(state.raid.introCropsDestroyed??0)>=quota)damage=Math.min(damage,Math.max(0,CROP_HIT_POINTS-1-before));
 if(damage<=0)return null;
 plant.attackHitPoints=CROP_HIT_POINTS;plant.attackHits=before+damage;
 if(plant.attackHits>=CROP_HIT_POINTS){
  plant.alive=false;plant.harvestRequested=false;cropBecameInactive(state.plants);
  if(quota!==undefined)state.raid.introCropsDestroyed=(state.raid.introCropsDestroyed??0)+1;
 }
 return {requestedDamage,damage,before,after:plant.attackHits,destroyed:!plant.alive};
}
