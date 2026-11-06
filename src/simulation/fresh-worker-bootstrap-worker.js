import {prepareFreshWorkerBootstrap,prepareFreshWorkerBootstrapFromOptions} from './fresh-worker-bootstrap.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';
import {repairSavedVillage} from './repair-saved-village.js';
import {prepareSavedWorkerBootstrap} from './saved-worker-bootstrap.js';

async function loadWildEngine(){const response=await fetch(wasmUrl);if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);return WebAssembly.compile(await response.arrayBuffer());}
self.onmessage=async({data})=>{
 try{if(data?.kind==='repair-village'){const state=JSON.parse(data.snapshot),module=state.villages?.some(village=>!village.entry)?await loadWildEngine():null,snapshot=repairSavedVillage(data.snapshot,data.catalog,{module});self.postMessage({kind:'result',result:{snapshot}});return;}if(data?.kind==='saved-bootstrap'){const module=await loadWildEngine(),result=prepareSavedWorkerBootstrap(module,data.snapshot,data.catalog,{quality:data.quality});self.postMessage({kind:'result',result});return;}if(!data||!data.payload||data.kind!=='fresh-options'&&typeof data.snapshot!=='string')throw TypeError('Invalid fresh worker request');const module=await loadWildEngine(),result=data.kind==='fresh-options'?await prepareFreshWorkerBootstrapFromOptions(module,data.options,data.payload,{quality:data.quality}):await prepareFreshWorkerBootstrap(module,data.snapshot,data.payload,{quality:data.quality});self.postMessage({kind:'result',result});}
 catch(error){self.postMessage({kind:'error',message:String(error?.message??error)});}
};
