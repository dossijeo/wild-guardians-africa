import {nearbyPlantPlacement} from '../world/nearby-plant-placement.js';
import {activeCrops} from './active-crops.js';

export function plantTouchTarget(state,point,nav){
 return nearbyPlantPlacement(point.x,point.z,{plants:activeCrops(state.plants),valid:(x,z)=>nav.placement(x,z,.4).valid})??point;
}
