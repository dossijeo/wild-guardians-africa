import {validateSnapshot} from '../persistence/snapshots.js';
import {guardianImpactTime} from './guardian-timing.js';

// Live physics can roll or remain down longer than the save format permits.
// This validation does not claim that the resulting state is restorable.
export function serializeConfirmedState(state){validateSnapshot(state,{livePhysics:true});return JSON.stringify(state);}
// Presentation needs the next waypoint for facing, not the authority's
// remaining route. This projection must never be used as a save/checkpoint.
export function serializeConfirmedPresentationState(state){
 validateSnapshot(state,{livePhysics:true});
 const actor=value=>Array.isArray(value.path)&&value.path.length>1?{...value,path:value.path.slice(0,1)}:value;
 const view={...state,workers:state.workers.map(actor),...(state.raid?{raid:{...state.raid,animals:state.raid.animals.map(actor)}}:{})};
 return JSON.stringify(view);
}
export function deserializeConfirmedState(source){const state=JSON.parse(source);validateSnapshot(state,{livePhysics:true});return state;}
export function confirmedStateSaveAvailable(state){return !(state.raid?.animals??[]).some(a=>a.magicDown||a.magicImpact&&state.elapsed>=guardianImpactTime(a.magicImpact)&&state.elapsed-guardianImpactTime(a.magicImpact)<.5);}
