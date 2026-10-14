import {findSpatialStart} from '../world/hierarchical-wasm/spatial-initial-site.js';
import {createSpatialGameSession} from '../world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/hierarchical-wasm/spatial-navigation-movement.js';
import wasmUrl from '../world/hierarchical-wasm/spatial-savanna.wasm?url';

// Development-only integration path. The regular game keeps its established
// world until native world generation and all gameplay consumers pass QA.
export async function prepareExperimentalSpatialWorld(world,state,payload,{signal}={}){
  if(state.biome!=='sabana'||state.day!==1||state.structures.length||
     state.villages.length!==1)
    throw Error('Spatial world QA currently requires a new Sabana game');
  const response=await fetch(wasmUrl,{signal});
  if(!response.ok)throw Error(`Could not load native spatial core: ${response.status}`);
  const module=await WebAssembly.compile(await response.arrayBuffer());
  if(signal?.aborted)throw new DOMException('Spatial world cancelled','AbortError');
  const start=await findSpatialStart(module,state,payload,{signal});
  Object.assign(state.villages[0],start.site);
  state.suppressed.push(...start.site.suppress);
  const session=createSpatialGameSession(module,state,{
    loaded:()=>world.chunks,
    onData:data=>world.installChunk(data),
    onError:error=>world.onError?.(error)});
  try{return {session,navigation:createSpatialNavigationMovement(session,state),start};}
  catch(error){session.dispose();throw error;}
}
