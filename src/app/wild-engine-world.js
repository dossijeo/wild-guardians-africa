import {findSpatialStart} from '../world/wild-engine/spatial-initial-site.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {WILD_ENGINE_WORLD_VERSION} from '../world/wild-engine/world-version.js';
import {createThreadedSpatialWorld} from '../world/wild-engine/spatial-thread-runtime.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';

export {WILD_ENGINE_WORLD_VERSION};

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
  let threaded=null,fallbackReason=null;
  const enabled=new URLSearchParams(globalThis.location?.search??'').get('wildEngineThreads')!=='0';
  if(enabled&&globalThis.crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined'){
    try{
      const url=new URL(`${import.meta.env.BASE_URL}wild-engine/spatial-threaded.mjs`,document.baseURI).href;
      const {default:factory}=await import(/* @vite-ignore */ url);
      threaded=await createThreadedSpatialWorld(factory);
    }catch(error){fallbackReason=String(error);console.warn('Wild Engine pthread runtime unavailable; using standalone fallback',error);}
  }else fallbackReason=enabled?'SharedArrayBuffer isolation unavailable':'Disabled for comparison';
  if(signal?.aborted){await threaded?.dispose();throw new DOMException('Wild Engine cancelled','AbortError');}
  let session;
  try{
    if(threaded){
      const first=state.villages[0];
      threaded.core.generate(state.seed,Math.floor((first.x+24)/48),Math.floor((first.z+24)/48),state.biome);
    }
    session=createSpatialGameSession(module,state,{
    ...(threaded?{core:threaded.core}:{}),
    loaded:()=>world.chunks,
    onData:data=>world.installChunk(data),
    onError:error=>world.onError?.(error)});
    const originalDispose=session.dispose;
    session.dispose=()=>{signal?.removeEventListener('abort',abort);originalDispose();return threaded?.dispose();};
    const abort=()=>{void session.dispose();};
    signal?.addEventListener('abort',abort,{once:true});
    session.runtime={backend:threaded?'pthreads':'standalone',fallbackReason};
    return {session,navigation:createSpatialNavigationMovement(session,state)};
  }catch(error){session?.dispose();await threaded?.dispose();throw error;}
}
