import {prepareFreshWorkerBootstrap} from './fresh-worker-bootstrap.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';
import {repairSavedVillageFootprints} from './repair-saved-village-footprints.js';

self.onmessage=async({data})=>{
 try{if(data?.kind==='repair-footprints'){const snapshot=repairSavedVillageFootprints(data.snapshot,data.catalog);self.postMessage({kind:'result',result:{snapshot}});return;}if(!data||typeof data.snapshot!=='string'||!data.payload)throw TypeError('Invalid fresh worker request');const response=await fetch(wasmUrl);if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);const module=await WebAssembly.compile(await response.arrayBuffer());const result=await prepareFreshWorkerBootstrap(module,data.snapshot,data.payload,{quality:data.quality});self.postMessage({kind:'result',result});}
 catch(error){self.postMessage({kind:'error',message:String(error?.message??error)});}
};
