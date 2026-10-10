// Isolated frozen-runtime candidate. New games/old saves do not enable it.
import {activeCrops} from './active-crops.js';
import {cropSpec,compositions} from './rules.js';
import {areaCropTargets} from './area-crop-targets.js';
export const AREA12_ID='area-12-v1';
export const area12Enabled=s=>s.qaRaidArea===AREA12_ID;
export function area12Constraints(stage){
 return stage?.first===41?{maxAnimals:12,minAnimals:6,speciesCaps:[8,5,4,3,2]}:stage?{maxAnimals:stage.max_animals,minAnimals:stage.min_animals,speciesCaps:stage.species_caps}:{};
}
export function freezeArea12Pressure(s,introductory=false){
 if(!area12Enabled(s))return undefined;
 const livingBaseValue=activeCrops(s.plants).reduce((v,p)=>v+cropSpec(p.species).base_harvest_value,0);
 return {version:AREA12_ID,livingBaseValue,radius:introductory?0:3,maxTargets:introductory?1:Math.floor(1+7*livingBaseValue/(livingBaseValue+10000)),increment:introductory||livingBaseValue<60000?1:2};
}
export function area12Compositions(budget,unlocked,constraints){
 const preferred=compositions(budget,unlocked,constraints);
 return preferred.length?preferred:compositions(budget,unlocked,{...constraints,minAnimals:1});
}
export function area12Targets(s,animal,primary,nav,shieldAt){
 const p=s.raid?.areaPressure;
 if(!p)return [primary]; // Old committed raids retain exactly their old semantics.
 const intro=s.raid.introCropLimit!==undefined;
 // Never turn a protected primary hit into an attack on its unprotected neighbor.
 if(shieldAt(primary))return [];
 const canHit=plant=>{
  if(!plant.alive||shieldAt(plant))return false;
  if((plant.attackHits??0)+(intro?1:p.increment)>=2&&intro&&s.raid.introCropsDestroyed>=s.raid.introCropLimit)return false;
  return typeof nav.segmentClear==='function'&&nav.segmentClear(animal,plant,.01,null,false);
 };
 return areaCropTargets(s.plants,primary,{radius:intro?0:p.radius,maxTargets:intro?1:p.maxTargets,canHit});
}
export function validArea12Pressure(p){
 if(!p||p.version!==AREA12_ID||!Number.isFinite(p.livingBaseValue)||p.livingBaseValue<0)return false;
 if(p.radius===0)return p.maxTargets===1&&p.increment===1;
 return p.radius===3&&p.maxTargets===Math.floor(1+7*p.livingBaseValue/(p.livingBaseValue+10000))&&p.increment===(p.livingBaseValue<60000?1:2);
}
