import {deserialize,serialize} from '../persistence/snapshots.js';
import {deserializeConfirmedState,serializeConfirmedState} from './confirmed-live-state.js';
import {savedNativeAuthorityOptions} from './native-authority-checkpoint.js';
import {villageLayout} from '../world/villages.js';

// Rebuild only absent authored footprints. Do not invent an entry point or
// modify native checkpoint data: the authority still verifies reconstruction.
export function repairSavedVillageFootprints(snapshot,catalog){
 if(typeof snapshot!=='string'||!Array.isArray(catalog))throw TypeError('Invalid saved village repair');
 savedNativeAuthorityOptions(snapshot);const raw=JSON.parse(snapshot),physical=!!raw.workerPhysicsCheckpoint,state=physical?deserializeConfirmedState(snapshot):deserialize(snapshot);
 for(const village of state.villages){
  if(!village.entry||!Array.isArray(village.buildings))throw Error('Saved village entry unavailable');
  const missing=village.buildings.filter(building=>building.kind!=='Zona común'&&building.footprint==null);if(!missing.length)continue;
  const source=catalog.find(item=>item.id===(village.culture==='saheliana'?'saheliano':village.culture));if(!source)throw Error('Saved village culture unavailable');
  const shapes=new Map(villageLayout(source,village.x,village.z).map(building=>[building.key,building.footprint]));for(const building of missing){const footprint=shapes.get(building.key);if(!Array.isArray(footprint)||footprint.length<3)throw Error('Saved village footprint unavailable');building.footprint=footprint;}
 }
 const repaired=physical?serializeConfirmedState(state):serialize(state);savedNativeAuthorityOptions(repaired);return repaired;
}
