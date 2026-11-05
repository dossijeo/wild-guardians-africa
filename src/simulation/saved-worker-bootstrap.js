import {deserialize} from '../persistence/snapshots.js';
import {deserializeConfirmedState} from './confirmed-live-state.js';
import {repairVillageFootprints} from './repair-saved-village.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {WILD_ENGINE_WORLD_VERSION} from '../world/wild-engine/world-version.js';
import {findVillageEntry} from '../world/villages.js';
import {farmHomeFocus} from '../rendering/farm-focus.js';
import {nativeCameraPose} from '../rendering/terrain-camera.js';
import {activeChunkRegion} from '../world/active-region.js';
import {raidResidentDemand,includeRaidBounds} from '../world/raid-entry-residency.js';
import {workerChunkDemand} from '../rendering/worker-chunk-residency.js';
import {restoreRaidWaitBindings} from './raid-wait-handoff.js';
import {captureNativeAuthorityBootstrap} from './native-authority-bootstrap.js';

// Reconstruct derived native state for compatible saves predating checkpoints.
// The authority compares the captured topology before accepting the handoff.
export function prepareSavedWorkerBootstrap(module,snapshot,catalog,{quality='media'}={}){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(catalog)||typeof quality!=='string')throw TypeError('Invalid saved worker bootstrap');
 const raw=JSON.parse(snapshot),state=raw.workerPhysicsCheckpoint?deserializeConfirmedState(snapshot):deserialize(snapshot);
 if(state.workerNativeAuthorityCheckpoint||state.wildEngineWorldVersion!==WILD_ENGINE_WORLD_VERSION)throw Error('Saved world is not compatible with native reconstruction');repairVillageFootprints(state,catalog);
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const nav=createSpatialNavigationMovement(session,state);nav.setState(state);for(const village of state.villages)if(!village.entry){const entry=findVillageEntry(nav,[],village.x,village.z);if(!entry)throw Error('Saved village entry unavailable');village.entry=entry;}
  const focus=farmHomeFocus(state),canyon=!!nav.field.canyon,pose=nativeCameraPose(nav.field,[focus.x,0,focus.z],focus.theta??(canyon?0:.5),canyon?1.18:1.16,focus.distance??(canyon?34:38)),eye={x:pose.eye[0],z:pose.eye[2]},target={x:pose.target[0],z:pose.target[2]},region=activeChunkRegion(eye,quality),raid=raidResidentDemand(state,nav),keys=new Set(session.core.captureResidentChunks().keys);
  for(let z=region.cz-region.range;z<=region.cz+region.range;z++)for(let x=region.cx-region.range;x<=region.cx+region.range;x++)keys.add(`${x},${z}`);for(const key of raid)keys.add(key);for(const key of workerChunkDemand(state))keys.add(key);
  for(const key of [...keys].sort()){const [x,z]=key.split(',').map(Number);if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not reconstruct saved chunk');session.stream.onData(session.core.chunkPayload());}
  nav.setActiveBounds(includeRaidBounds(region.bounds,raid));nav.setRaidView(eye,target);if(state.workerRaidWaitBindings!==undefined)restoreRaidWaitBindings(state,nav,state.workerRaidWaitBindings);
  const captured=captureNativeAuthorityBootstrap(state,nav,session),initial={snapshot:captured.snapshot,chunkKeys:captured.chunkKeys,raidWaitBindings:captured.raidWaitBindings,navigationView:captured.navigationView,nativeBootstrap:{version:1,chunkKeys:captured.chunkKeys,spatialState:captured.spatialState}};
  return {initial,pose:{eye:[...pose.eye],target:[...pose.target]}};
 }finally{session.dispose();}
}
