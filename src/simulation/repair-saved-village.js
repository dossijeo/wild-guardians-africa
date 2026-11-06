import {deserialize,serialize} from '../persistence/snapshots.js';
import {deserializeConfirmedState,serializeConfirmedState} from './confirmed-live-state.js';
import {savedNativeAuthorityOptions} from './native-authority-checkpoint.js';
import {villageLayout,findVillageEntry} from '../world/villages.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {normalizeWorkerStartupState} from './worker-startup-state.js';

// Rebuild missing authored footprints and entries with the same native search
// used by the legacy bootstrap. The authority verifies the saved topology.
export function repairVillageFootprints(state,catalog){
 if(!state||!Array.isArray(catalog))throw TypeError('Invalid saved village repair');
 for(const village of state.villages){
  if(!Array.isArray(village.buildings))throw Error('Saved village buildings unavailable');
  const missing=village.buildings.filter(building=>building.kind!=='Zona común'&&building.footprint==null);if(!missing.length)continue;
  const source=catalog.find(item=>item.id===(village.culture==='saheliana'?'saheliano':village.culture));if(!source)throw Error('Saved village culture unavailable');
  const shapes=new Map(villageLayout(source,village.x,village.z).map(building=>[building.key,building.footprint]));for(const building of missing){const footprint=shapes.get(building.key);if(!Array.isArray(footprint)||footprint.length<3)throw Error('Saved village footprint unavailable');building.footprint=footprint;}
 }
}
export function repairSavedVillage(snapshot,catalog,{module=null}={}){
 if(typeof snapshot!=='string'||!Array.isArray(catalog))throw TypeError('Invalid saved village repair');
 const options=savedNativeAuthorityOptions(snapshot),raw=JSON.parse(snapshot),physical=!!raw.workerPhysicsCheckpoint,state=physical?deserializeConfirmedState(snapshot):deserialize(snapshot);repairVillageFootprints(state,catalog);
 if(state.villages.some(village=>!village.entry)){
  if(!(module instanceof WebAssembly.Module))throw Error('Saved village entry requires Wild Engine');
  const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
   for(const key of options.chunkKeys){const [x,z]=key.split(',').map(Number);if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not restore village chunk');session.stream.onData(session.core.chunkPayload());}
   const nav=createSpatialNavigationMovement(session,state);nav.setState(state);for(const village of state.villages)if(!village.entry){const entry=findVillageEntry(nav,[],village.x,village.z);if(!entry)throw Error('Saved village entry unavailable');village.entry=entry;}
  }finally{session.dispose();}
 }
 const repaired=physical?serializeConfirmedState(state):serialize(state);savedNativeAuthorityOptions(repaired);return repaired;
}

// Run checkpoint validation and any spatial repair together in the bootstrap
// Worker. The returned native description is still verified by the authority.
export function prepareSavedWorkerCheckpoint(snapshot,catalog,{module=null,normalizeForStart=false}={}){
 if(typeof snapshot!=='string'||!Array.isArray(catalog)||typeof normalizeForStart!=='boolean')throw TypeError('Invalid saved worker checkpoint');
 const original=savedNativeAuthorityOptions(snapshot),state=JSON.parse(snapshot),needsRepair=state.villages.some(village=>!village.entry||village.buildings.some(building=>building.kind!=='Zona común'&&building.footprint==null));
 if(!needsRepair&&!normalizeForStart)return {initial:original,repaired:false};
 let source=needsRepair?repairSavedVillage(snapshot,catalog,{module}):snapshot;
 if(normalizeForStart){const physical=!!JSON.parse(source).workerPhysicsCheckpoint,current=physical?deserializeConfirmedState(source):deserialize(source);normalizeWorkerStartupState(current);source=physical?serializeConfirmedState(current):serialize(current);}
 return {initial:savedNativeAuthorityOptions(source),repaired:needsRepair};
}
