import {findSpatialStart} from '../world/wild-engine/spatial-initial-site.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';

export const WILD_ENGINE_WORLD_VERSION=1;

// The same native world supplies rendered chunks, static collisions and routes.
// A saved game rebuilds its derived sectors from the seed and confirmed changes.
export async function prepareWildEngineWorld(world,state,payload,{signal,loaded=false}={}){
  if(loaded&&state.wildEngineWorldVersion!==WILD_ENGINE_WORLD_VERSION)
    throw Error('Esta partida utiliza el generador de terreno anterior y no es compatible con Wild Engine. Inicia una partida nueva.');
  const response=await fetch(wasmUrl,{signal});
  if(!response.ok)throw Error(`No se pudo cargar Wild Engine: ${response.status}`);
  const module=await WebAssembly.compile(await response.arrayBuffer());
  if(signal?.aborted)throw new DOMException('Wild Engine cancelled','AbortError');
  if(!loaded){
    const start=await findSpatialStart(module,state,payload,{signal});
    Object.assign(state.villages[0],start.site);
    state.suppressed.push(...start.site.suppress);
    state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
  }
  const session=createSpatialGameSession(module,state,{
    loaded:()=>world.chunks,
    onData:data=>world.installChunk(data),
    onError:error=>world.onError?.(error)});
  try{return {session,navigation:createSpatialNavigationMovement(session,state)};}
  catch(error){session.dispose();throw error;}
}
