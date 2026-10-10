import {nearbyPlantPlacement} from '../world/nearby-plant-placement.js';
import {plant} from '../simulation/game.js';
export function plantNearTouch(state,id,species,point,nav){
  const target=nearbyPlantPlacement(point.x,point.z,{plants:state.plants,valid:(x,z)=>nav.placement(x,z,.4).valid});
  // Native command owns final validation, charges and error feedback. No mutation
  // takes place while searching; lack of funds never causes another search.
  return plant(state,id,species,target?.x??point.x,target?.z??point.z,nav);
}
