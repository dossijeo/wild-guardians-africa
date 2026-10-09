import {cropSpec} from '../../src/simulation/rules.js';
// The declared paused cohort uses the young native phase, not mature harvest.
// Focus/spell target selection must address that same actual crop batch.
export function worldYoungMaizeTarget(state){
 const duration=cropSpec('maiz').growth_seconds;
 const plant=state.plants.filter(p=>p.alive&&p.species==='maiz'&&Math.abs(p.growth-duration*.31)<1e-9).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(!plant)throw Error('No declared young maize for focused QA effect');
 return plant;
}
