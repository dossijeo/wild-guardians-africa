import {cropSpec} from '../../src/simulation/rules.js';

// The camera and native spell share this target; an immature maize sorted
// before it must never put the effect outside the focused mature batch.
export function worldMaizeTarget(state){
 const duration=cropSpec('maiz').growth_seconds;
 const plant=state.plants.filter(p=>p.alive&&p.species==='maiz'&&p.growth>=duration).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(!plant)throw Error('No mature maize for focused QA effect');
 return plant;
}
