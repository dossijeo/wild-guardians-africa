import {validateSnapshot} from '../persistence/snapshots.js';
import {guardianImpactTime} from './guardian-timing.js';

// Live physics can roll or remain down longer than the save format permits.
// This validation does not claim that the resulting state is restorable.
export function serializeConfirmedState(state){validateSnapshot(state,{livePhysics:true});return JSON.stringify(state);}
export function deserializeConfirmedState(source){const state=JSON.parse(source);validateSnapshot(state,{livePhysics:true});return state;}
export function confirmedStateSaveAvailable(state){return !(state.raid?.animals??[]).some(a=>a.magicDown||a.magicImpact&&state.elapsed>=guardianImpactTime(a.magicImpact)&&state.elapsed-guardianImpactTime(a.magicImpact)<.5);}
