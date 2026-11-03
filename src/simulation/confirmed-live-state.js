import {validateSnapshot} from '../persistence/snapshots.js';
import {guardianImpactTime} from './guardian-timing.js';

// Live presentation can contain the physical rolling phase, which the save
// format cannot restore. Validate every other save invariant without changing
// the authoritative state or claiming this live state is a restorable save.
function validationView(state){
 const animals=state?.raid?.animals;if(!animals?.some(a=>a.magicDown?.phase==='rolling'))return state;
 return {...state,raid:{...state.raid,animals:animals.map(a=>a.magicDown?.phase==='rolling'?{...a,magicDown:{...a.magicDown,phase:'falling'}}:a)}};
}
export function serializeConfirmedState(state){validateSnapshot(validationView(state));return JSON.stringify(state);}
export function deserializeConfirmedState(source){const state=JSON.parse(source);validateSnapshot(validationView(state));return state;}
export function confirmedStateSaveAvailable(state){return !(state.raid?.animals??[]).some(a=>a.magicDown||a.magicImpact&&state.elapsed-guardianImpactTime(a.magicImpact)<.5);}
