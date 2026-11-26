import {validateSnapshot} from '../persistence/snapshots.js';
import {guardianImpactTime} from './guardian-timing.js';
import {PROFILES,contractExpired} from './workforce.js';
const farmProfileEnd=new Map(PROFILES.map(p=>[p.id,p.end]));
// Active Farm saves carry pose/intent, never a resident corridor. A held owner
// may restore to Home after expiry; an expired moving corridor stays unsavable.
// Full semantic validation remains in the checkpoint serializer.
function farmSaveBlocked(state,worker){return ['pending-farm-arrival-resources','native-farm-arrival'].includes(worker.nativeRouteAdmission)&&(contractExpired(worker,state)||!farmProfileEnd.has(worker.profile)||state.time>=farmProfileEnd.get(worker.profile));}

// Live physics can roll or remain down longer than the save format permits.
// This validation does not claim that the resulting state is restorable.
export function serializeConfirmedState(state){validateSnapshot(state,{livePhysics:true});return JSON.stringify(state);}
// Presentation needs the next waypoint for facing, not the authority's
// remaining route. This projection must never be used as a save/checkpoint.
function presentationView(state){
 const actor=value=>Array.isArray(value.path)&&value.path.length>1?{...value,path:value.path.slice(0,1)}:value;
 return {...state,workers:state.workers.map(actor),...(state.raid?{raid:{...state.raid,animals:state.raid.animals.map(actor)}}:{})};
}
export function serializeConfirmedPresentationState(state){validateSnapshot(state,{livePhysics:true});return JSON.stringify(presentationView(state));}
// Serialize the same JSON while retaining top-level fragments for the local
// authority-to-host encoder. Wrappers preserve JSON's property-key toJSON
// semantics; exotic root toJSON values use the ordinary serializer instead.
export function prepareConfirmedStateTransport(state,{projectPaths=false}={}){
 if(typeof projectPaths!=='boolean')throw TypeError('Invalid confirmed state projection');validateSnapshot(state,{livePhysics:true});const view=projectPaths?presentationView(state):state;
 if(typeof view.toJSON==='function'){const snapshot=JSON.stringify(view),parsed=JSON.parse(snapshot);return {snapshot,fields:new Map(Object.keys(parsed).map(key=>[key,JSON.stringify(parsed[key])]))};}
 const fields=new Map();for(const key of Object.keys(view)){const prefix=JSON.stringify(key)+':',fragment=JSON.stringify({[key]:view[key]});if(fragment==='{}')continue;if(!fragment.startsWith('{'+prefix)||!fragment.endsWith('}'))throw Error('Invalid confirmed state fragment');fields.set(key,fragment.slice(prefix.length+1,-1));}
 let snapshot=null;return {fields,get snapshot(){return snapshot??='{'+[...fields].map(([key,value])=>JSON.stringify(key)+':'+value).join(',')+'}';}};
}
export function deserializeConfirmedState(source){const state=JSON.parse(source);validateSnapshot(state,{livePhysics:true});return state;}
export function confirmedStateSaveAvailable(state){return !(state.workers??[]).some(w=>w.nativeRefugeSequence!==undefined||w.status==='fleeing'&&w.nativeRouteAdmission==='native-home'||['pending-farm-flight-stop','pending-idle-flight-stop','pending-task-flight-stop','pending-raid-flight-resources'].includes(w.nativeRouteAdmission)||farmSaveBlocked(state,w)||w.nativeRouteAdmission==='native-idle-stroll'||w.nativeRouteAdmission==='pending-stroll-resources')&&!(state.raid?.animals??[]).some(a=>a.magicDown||a.magicImpact&&state.elapsed>=guardianImpactTime(a.magicImpact)&&state.elapsed-guardianImpactTime(a.magicImpact)<.5);}
