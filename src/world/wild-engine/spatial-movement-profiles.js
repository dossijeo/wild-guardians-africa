import {ANIMAL_ACTIONS} from '../../simulation/animal-actions-data.js';

// The C++ graph has one resident context per native collision footprint.
// Keep radii sourced from the same authored data used when raids spawn actors.
const speciesIds={warthog:0,hyena:2,buffalo:3,lion:4,rhino:5};
export const WORKER_SPATIAL_PROFILE=Object.freeze({index:1,radius:.28,worker:true});
export const ANIMAL_SPATIAL_PROFILES=Object.freeze(Object.fromEntries(
  Object.entries(speciesIds).map(([species,index])=>{
    const radius=ANIMAL_ACTIONS.animals[species].presentation.footprint.radius;
    if(!(radius>0&&radius<=2))throw new RangeError(`Unsupported ${species} navigation radius`);
    return [species,Object.freeze({index,radius,worker:false})];
  })));
