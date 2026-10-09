import {farmHomeFocus} from './farm-focus.js';
// World.load later focuses this same home. Count only its exact sync visibility
// circle, so distant/dead historical plants cannot inflate the initial batch.
export function initialCropCapacity(state){
 const target=farmHomeFocus(state);let count=0;
 for(const plant of state.plants)if(plant.alive&&Math.hypot(plant.x-target.x,plant.z-target.z)<140)count++;
 return count<=128?128:2**Math.ceil(Math.log2(count));
}
