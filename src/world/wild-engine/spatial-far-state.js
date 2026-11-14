import {validateSpatialTerrainState,validateSpatialState} from './spatial-state.js';

// A derived, read-only visual world needs the procedural inputs and removals,
// not navigation, actors, barriers, routes, or resident raster caches. Its
// revision belongs to the source authority, never to the replica's WASM.
function spatialRestoreState(state){
 return {...state.terrain,version:state.terrain.version===2?6:5,
  removedProps:state.removedProps,barriers:[],polygons:[],nextBarrierId:1,nextPolygonId:1};
}

export function validateSpatialFarState(state){
 if(state?.version!==1||!Number.isSafeInteger(state.revision)||state.revision<1)
  throw TypeError('Invalid far spatial state');
 validateSpatialTerrainState(state.terrain);
 validateSpatialState(spatialRestoreState(state));
 return state;
}

export function captureSpatialFarState(core){
 const revision=core.farVisualRevision(),terrain=core.terrainState(),wasm=core.wasm;
 const count=wasm.spatial_removed_prop_count(),removedProps=[];
 const records=new Int32Array(wasm.memory.buffer,wasm.spatial_removed_prop_state_ptr(),count*3);
 for(let i=0;i<count;i++)removedProps.push({group:records[i*3],gx:records[i*3+1],gz:records[i*3+2]});
 if(core.farVisualRevision()!==revision)throw Error('Spatial world changed during far snapshot');
 return validateSpatialFarState({version:1,revision,terrain,removedProps});
}

export function restoreSpatialFarState(core,state){
 validateSpatialFarState(state);
 core.restoreState(spatialRestoreState(state));
 return state.revision;
}
