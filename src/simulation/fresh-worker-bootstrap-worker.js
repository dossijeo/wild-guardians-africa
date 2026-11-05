import {prepareFreshWorkerBootstrap} from './fresh-worker-bootstrap.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';

self.onmessage=async({data})=>{
 try{if(!data||typeof data.snapshot!=='string'||!data.payload)throw TypeError('Invalid fresh worker request');const response=await fetch(wasmUrl);if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);const module=await WebAssembly.compile(await response.arrayBuffer());const result=await prepareFreshWorkerBootstrap(module,data.snapshot,data.payload,{quality:data.quality});self.postMessage({kind:'result',result});}
 catch(error){self.postMessage({kind:'error',message:String(error?.message??error)});}
};
