import {validateSpatialState} from '../world/wild-engine/spatial-state.js';
import {validateRaidWaitBindings} from './raid-wait-handoff.js';
import {deserialize} from '../persistence/snapshots.js';
import {deserializeConfirmedState} from './confirmed-live-state.js';

// A save-side checkpoint is only a promise to verify a reconstruction, not an
// imported native world. The Worker checks exact topology before becoming ready.
export function validateNativeAuthorityCheckpoint(checkpoint){
 if(!checkpoint||checkpoint.version!==1||!Array.isArray(checkpoint.chunkKeys)||checkpoint.chunkKeys.length>100000||new Set(checkpoint.chunkKeys).size!==checkpoint.chunkKeys.length)throw TypeError('Invalid native authority checkpoint');
 for(const key of checkpoint.chunkKeys){if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid native chunk key');const coords=key.split(',').map(Number);if(coords.some(n=>!Number.isInteger(n)||n< -2147483648||n>2147483647)||coords.join(',')!==key)throw TypeError('Invalid native chunk coordinates');}
 validateSpatialState(checkpoint.spatialState);
 const v=checkpoint.navigationView;
 if(v!==null&&(!v||!Array.isArray(v.bounds)||v.bounds.length!==4||!v.bounds.every(Number.isFinite)||![v.eye?.x,v.eye?.z,v.target?.x,v.target?.z].every(Number.isFinite)))throw TypeError('Invalid native navigation view');
 return checkpoint;
}

// Restorable only from an explicitly captured checkpoint; old saves deliberately
// use the existing scene path. Do not silently invent native residency or view.
export function savedNativeAuthorityOptions(snapshot){
 const raw=JSON.parse(snapshot),state=raw.workerPhysicsCheckpoint?deserializeConfirmedState(snapshot):deserialize(snapshot),checkpoint=validateNativeAuthorityCheckpoint(state.workerNativeAuthorityCheckpoint);
 validateRaidWaitBindings(state,state.workerRaidWaitBindings);
 return {snapshot,chunkKeys:[...checkpoint.chunkKeys],raidWaitBindings:structuredClone(state.workerRaidWaitBindings),navigationView:structuredClone(checkpoint.navigationView),nativeBootstrap:{version:1,chunkKeys:[...checkpoint.chunkKeys],spatialState:structuredClone(checkpoint.spatialState)}};
}
