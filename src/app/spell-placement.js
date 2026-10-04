import {cast} from '../simulation/game.js';

// A tall crop can occlude terrain several metres behind it. Entity selection
// takes precedence so a power aimed at that crop actually covers the crop.
export function castPickedSpell(state,id,kind,{entityId,point},nav){
  const plant=state.plants.find(p=>p.id===entityId&&p.alive);
  const target=plant??point??state.structures.find(s=>s.id===entityId);
  if(!target)return false;
  return cast(state,id,kind,target.x,target.z,nav);
}
