import {operational} from '../simulation/rules.js';
// Resume and HUD home deliberately use the same destination and native pose.
export function farmHomeFocus(state){
 return state.structures.find(operational)??state.villages[0];
}
