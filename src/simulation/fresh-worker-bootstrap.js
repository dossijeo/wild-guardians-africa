import {deserialize,serialize} from '../persistence/snapshots.js';
import {findSpatialStart} from '../world/wild-engine/spatial-initial-site.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {WILD_ENGINE_WORLD_VERSION} from '../world/wild-engine/world-version.js';
import {findVillageEntry} from '../world/villages.js';
import {farmHomeFocus} from '../rendering/farm-focus.js';
import {nativeCameraPose} from '../rendering/terrain-camera.js';
import {freshNativeAuthorityOptions} from './fresh-native-authority.js';

// This bootstrap runs before the authoritative Worker is started. Its native
// session is disposed before the result is published and never advances time.
export async function prepareFreshWorkerBootstrap(module,snapshot,payload,{quality='media'}={}){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!payload||typeof quality!=='string')throw TypeError('Invalid fresh worker bootstrap');
 const state=deserialize(snapshot);if(state.elapsed!==0||state.raid||state.workerNativeAuthorityCheckpoint)throw TypeError('Expected a new world');
 if(state.biome==='manglares'){state.mangroveNetwork=true;state.mangroveSettlementVersion=2;}
 const start=await findSpatialStart(module,state,payload);Object.assign(state.villages[0],start.site);state.suppressed.push(...start.site.suppress);state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,{authority:data.authority,terrainRevision:data.terrainRevision,instances:data.instances})});
 try{
  const nav=createSpatialNavigationMovement(session,state);nav.setState(state);for(const village of state.villages)if(!village.entry)village.entry=findVillageEntry(nav,[],village.x,village.z);
  const focus=farmHomeFocus(state),field=nav.field,canyon=!!field.canyon,pose=nativeCameraPose(field,[focus.x,0,focus.z],focus.theta??(canyon?0:.5),canyon?1.18:1.16,focus.distance??(canyon?34:38));
  const initial=freshNativeAuthorityOptions(state,nav,session,{eye:{x:pose.eye[0],z:pose.eye[2]},target:{x:pose.target[0],z:pose.target[2]},quality});
  return {initial,pose:{eye:[...pose.eye],target:[...pose.target]}};
 }finally{session.dispose();}
}
