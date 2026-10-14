import {Navigation} from './navigation.js';
import {chooseRaidEntry,warmRaidApproaches} from '../simulation/raids.js';
import {animalSpec,randomInt} from '../simulation/rules.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {raidNavigationWarmth} from './raid-navigation-warmth.js';

export function computeRaidEntry(request){
  const {state,profile,group,bounds,view,key,token}=request;
  const nav=new Navigation(state.seed,state.biome,profile);
  nav.setState(state);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
  const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  // Only the isolated request copy advances. The real spawn still consumes
  // its original RNG draw, even when this prepared result is accepted.
  const entry=chooseRaidEntry(state,specs,bounds,randomInt(state,0,3),nav);
  warmRaidApproaches(state,specs,entry,nav);
  return {key,token,entry,warmth:raidNavigationWarmth(nav)};
}
