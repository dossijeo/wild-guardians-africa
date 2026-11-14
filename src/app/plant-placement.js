import {plant} from '../simulation/game.js';
import {plantTouchTarget} from '../simulation/plant-touch-target.js';
export function plantNearTouch(state,id,species,point,nav){
  const target=plantTouchTarget(state,point,nav);
  // Native command owns final validation, charges and error feedback. No mutation
  // takes place while searching; lack of funds never causes another search.
  return plant(state,id,species,target.x,target.z,nav);
}
