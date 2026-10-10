import {Worker} from 'node:worker_threads';

// Implements the browser-facing interface consumed by RaidEntryPreparer.
// No game clocks, RNG, paths or outcomes are patched by this transport.
export function createNodeRaidEntryWorker({createThread=()=>new Worker(new URL('./node-raid-entry-worker.mjs',import.meta.url))}={}){
 const worker=createThread();let terminating=false;
 const adapter={onmessage:null,onerror:null,failure:null,postMessage:request=>worker.postMessage(request),terminate:()=>{terminating=true;return worker.terminate();},get threadId(){return worker.threadId;}};
 const fail=error=>{if(adapter.failure||terminating)return;adapter.failure=error;adapter.onerror?.(error);};
 adapter.closed=new Promise(resolve=>worker.once('exit',code=>{if(!terminating)fail(Error(`Raid entry worker unexpectedly exited with code ${code}`));resolve(code);}));
 worker.on('message',data=>adapter.onmessage?.({data}));
 worker.on('error',fail);
 return adapter;
}
