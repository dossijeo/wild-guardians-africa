import {isMature} from '../simulation/crops.js';
import {compare,rational} from '../simulation/money.js';

// Point only at a currently actionable crop, never at an empty world position.
export function agriculturalGuidePlant(state,kind,valid=()=>true){
  const previous=kind==='multiply'?state.events.findLast(e=>e.type==='SpellActivated'&&e.kind==='growth'&&e.benefited)?.targetPlantId:null;
  return state.plants.find(p=>{
    if(!p.alive||p.id===previous)return false;
    if(kind==='multiply'?p.multiplyHarvest:isMature(p)||p.water.some(w=>w.status==='due')||p.growthPowerCommitted&&compare(p.growthPowerCommitted,rational(15))>=0)return false;
    if(state.spells.some(a=>a.remaining>0&&(a.targetPlantId===p.id||a.targetPlantId===undefined&&Math.hypot(a.x-p.x,a.z-p.z)<=a.radius)))return false;
    return valid(p);
  });
}
