import {cast} from '../simulation/game.js';

// A tall crop can occlude terrain several metres behind it. Entity selection
// takes precedence so a power aimed at that crop actually covers the crop.
export function castPickedSpell(state,id,kind,{entityId,point,hitPoint,origin},nav){
  if(kind==='attack'){const animal=state.raid?.animals.find(a=>a.id===entityId);if(!animal)throw new Error('Selecciona una bestia activa');return cast(state,id,kind,animal.x,animal.z,nav,{targetId:animal.id,origin,contact:hitPoint});}
  const plant=state.plants.find(p=>p.id===entityId&&p.alive);
  if(kind!=='shield'){
    if(!plant)return false;
    return cast(state,id,kind,plant.x,plant.z,nav,{targetId:plant.id,origin,contact:hitPoint});
  }
  const target=plant??point??state.structures.find(s=>s.id===entityId);
  if(!target)return false;
  return cast(state,id,kind,target.x,target.z,nav,{...(plant&&kind!=='shield'?{targetId:plant.id}:{}),origin,contact:hitPoint});
}
