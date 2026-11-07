import {WILD_ENGINE_WORLD_VERSION} from '../world/wild-engine/world-version.js';

// The presentation only retains the last requested view. Routing, terrain and
// collision state remain in the authority; missing spatial data is not empty.
export function createWorkerNavigationProjection(view){
 if(!view||!Array.isArray(view.bounds)||view.bounds.length!==4||!view.bounds.every(Number.isFinite)||![view.eye?.x,view.eye?.z,view.target?.x,view.target?.z].every(Number.isFinite))throw TypeError('Invalid worker navigation view');
 const nav={workerProjection:true,field:null,activeBounds:[...view.bounds],raidView:{eye:{...view.eye},target:{...view.target}},setState(){},setActiveBounds(bounds){if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite))throw TypeError('Invalid navigation bounds');nav.activeBounds=[...bounds];},setRaidView(eye,target){if(![eye?.x,eye?.z,target?.x,target?.z].every(Number.isFinite))throw TypeError('Invalid navigation view');nav.raidView={eye:{x:eye.x,z:eye.z},target:{x:target.x,z:target.z}};}};
 return nav;
}

// Older saves requiring spatial repair keep the original initialization until
// that repair can itself be performed in the authority.
export function canRestoreWorkerOnly(state,{loaded,earlyNative,earlyGpu,noWebgl,cameraTerrain,allowFootprintRepair=false,allowEntryRepair=false,allowMissingCheckpoint=false}={}){
 return !!(loaded&&earlyNative&&earlyGpu&&noWebgl&&cameraTerrain&&state?.wildEngineWorldVersion===WILD_ENGINE_WORLD_VERSION&&(state.workerNativeAuthorityCheckpoint?.navigationView||allowMissingCheckpoint===true&&state.workerNativeAuthorityCheckpoint==null)&&Array.isArray(state.villages)&&state.villages.length&&state.villages.every(v=>(v.entry||allowEntryRepair===true&&v.entry==null)&&Array.isArray(v.buildings)&&v.buildings.every(b=>b.kind==='Zona común'||Array.isArray(b.footprint)&&b.footprint.length>=3||allowFootprintRepair===true&&b.footprint==null)));
}
