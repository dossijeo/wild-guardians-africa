import {validateSpatialWallOwners} from '../world/wild-engine/spatial-wall-mirror.js';
import {validateSpatialShieldOwners} from '../world/wild-engine/spatial-shield-mirror.js';
import {validateSpatialState} from '../world/wild-engine/spatial-state.js';
import {validateRaidWaitBindings} from './raid-wait-handoff.js';
import {deserialize} from '../persistence/snapshots.js';
import {deserializeConfirmedState} from './confirmed-live-state.js';
import {copyNativeEncounterCheckpoint,nativeEncounterCheckpointActors} from './native-encounter-checkpoint.js';
import {copyRefugeReturnCheckpoint,validateRefugeReturnState} from '../world/native-refuge-return.js';
import {copyNativeRaidFlightCheckpoint,nativeRaidFlightCheckpointActors} from './native-raid-flight-checkpoint.js';

// The Worker reconstructs authorized Game topology before restoring saved proxy
// identities. Its final verification still requires every native field and ID.
export function validateNativeAuthorityCheckpoint(checkpoint){
 if(!checkpoint||![1,2,3].includes(checkpoint.version)||!Array.isArray(checkpoint.chunkKeys)||checkpoint.chunkKeys.length>100000||new Set(checkpoint.chunkKeys).size!==checkpoint.chunkKeys.length)throw TypeError('Invalid native authority checkpoint');
 for(const key of checkpoint.chunkKeys){if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid native chunk key');const coords=key.split(',').map(Number);if(coords.some(n=>!Number.isInteger(n)||n< -2147483648||n>2147483647)||coords.join(',')!==key)throw TypeError('Invalid native chunk coordinates');}
 validateSpatialState(checkpoint.spatialState);
 if(checkpoint.version>=2)validateSpatialWallOwners(checkpoint.wallOwners,checkpoint.spatialState);
 if(checkpoint.version===3)validateSpatialShieldOwners(checkpoint.shieldOwners,checkpoint.spatialState);
 if(checkpoint.workerLifecycle!==undefined&&(checkpoint.version!==3||checkpoint.workerLifecycle!==1))
  throw TypeError('Invalid native worker lifecycle checkpoint');
 if(checkpoint.encounter!==undefined){
  if(checkpoint.version!==3)throw Error('Native encounter requires checkpoint version 3');
  copyNativeEncounterCheckpoint(checkpoint.encounter);
 }
 if(checkpoint.refugeReturn!==undefined){
  if(checkpoint.version!==3||checkpoint.workerLifecycle!==1||checkpoint.encounter!==undefined)
   throw Error('Native refuge return requires its own worker lifecycle checkpoint');
  copyRefugeReturnCheckpoint(checkpoint.refugeReturn);
 }
 if(checkpoint.raidFlight!==undefined){
  if(checkpoint.version!==3||checkpoint.workerLifecycle!==1||checkpoint.encounter!==undefined||checkpoint.refugeReturn!==undefined)
   throw Error('Native raid flight requires its own worker lifecycle checkpoint');
  copyNativeRaidFlightCheckpoint(checkpoint.raidFlight);
 }
 const v=checkpoint.navigationView;
 if(v!==null&&(!v||!Array.isArray(v.bounds)||v.bounds.length!==4||!v.bounds.every(Number.isFinite)||![v.eye?.x,v.eye?.z,v.target?.x,v.target?.z].every(Number.isFinite)))throw TypeError('Invalid native navigation view');
 return checkpoint;
}

// Restorable only from an explicitly captured checkpoint; old saves deliberately
// use the existing scene path. Do not silently invent native residency or view.
export function savedNativeAuthorityOptions(snapshot){
 const raw=JSON.parse(snapshot),state=raw.workerPhysicsCheckpoint?deserializeConfirmedState(snapshot):deserialize(snapshot),checkpoint=validateNativeAuthorityCheckpoint(state.workerNativeAuthorityCheckpoint);
 validateRaidWaitBindings(state,state.workerRaidWaitBindings);
 if(checkpoint.encounter!==undefined)nativeEncounterCheckpointActors(state,checkpoint.encounter);
 if(checkpoint.refugeReturn!==undefined)validateRefugeReturnState(state,checkpoint.refugeReturn);
 if(checkpoint.raidFlight!==undefined)nativeRaidFlightCheckpointActors(state,checkpoint.raidFlight);
 return {snapshot,chunkKeys:[...checkpoint.chunkKeys],raidWaitBindings:structuredClone(state.workerRaidWaitBindings),navigationView:structuredClone(checkpoint.navigationView),...(checkpoint.workerLifecycle===1?{nativeWorkerLifecycle:true}:{}),nativeBootstrap:{version:checkpoint.version,chunkKeys:[...checkpoint.chunkKeys],spatialState:structuredClone(checkpoint.spatialState),...(checkpoint.version>=2?{wallOwners:structuredClone(checkpoint.wallOwners)}:{}),...(checkpoint.version===3?{shieldOwners:structuredClone(checkpoint.shieldOwners)}:{})}};
}
