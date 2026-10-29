import {BALANCE as B} from './balance.js';
import {cropBecameInactive} from './active-crops.js';
import {AWAKENINGS} from './awakening-config.js';
import {loseBlessing} from './blessings.js';
export const CROP_HIT_POINTS=B.raids.crop_hit_points;
// Old version-1 plants used two HP and can carry half-point wounds. Preserve
// their wounded fraction lazily at the next real impact, never kill on load.
export const cropImpactDamage=p=>(p.attackHits??0)*(p.blessing?AWAKENINGS.plantHitPoints:CROP_HIT_POINTS)/(p.attackHitPoints??2);
export function applyCropImpact(state,plant,requestedDamage){
 if(!plant.alive||!Number.isFinite(requestedDamage)||requestedDamage<=0)return null;
 const before=cropImpactDamage(plant),quota=state.raid?.introCropLimit,maximum=plant.blessing?AWAKENINGS.plantHitPoints:CROP_HIT_POINTS;
 let damage=Math.min(requestedDamage,Math.max(0,maximum-before));
 if(quota!==undefined&&(state.raid.introCropsDestroyed??0)>=quota)damage=Math.min(damage,Math.max(0,maximum-1-before));
 if(damage<=0)return null;
 plant.attackHitPoints=maximum;plant.attackHits=before+damage;
 let blessingDestroyed=null;
 if(plant.attackHits>=maximum){
  plant.alive=false;plant.harvestRequested=false;cropBecameInactive(state.plants);
  blessingDestroyed=loseBlessing(state,plant);
  if(quota!==undefined)state.raid.introCropsDestroyed=(state.raid.introCropsDestroyed??0)+1;
 }
 return {requestedDamage,damage,before,after:plant.attackHits,destroyed:!plant.alive,...(blessingDestroyed?{blessingDestroyed}:{})};
}
