import {Worker} from 'node:worker_threads';
import {SharedRaidPreparationWorker} from '../src/world/raid-shared-worker.js';
// QA adapter around ONE actual Node thread, not a browser Worker or native
// MessageEvent test. Only events minted by this private actual-thread listener
// satisfy the explicitly injected QA ownership capability.
export async function nodeSharedRaidWorker(){
 const actual=new Worker(new URL('./qa-raid-entry-worker-node.mjs',import.meta.url),{type:'module'}),events=new WeakSet();let terminating=false,terminations=0;
 const adapter={postMessage:data=>actual.postMessage(data),terminate:()=>{if(terminating)return;terminating=true;terminations++;return actual.terminate();}};
 const transport=new SharedRaidPreparationWorker({createWorker:()=>adapter,verifyOwnedEvent:(event,worker)=>worker===adapter&&events.has(event)});
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;}),timeout=setTimeout(()=>rejectReady(Error('Actual shared Node worker startup timeout')),5000);
 actual.on('message',data=>{if(data.kind==='node-ready'){clearTimeout(timeout);resolveReady();return;}const event={data,target:adapter};events.add(event);adapter.onmessage?.(event);});
 actual.on('error',error=>{clearTimeout(timeout);rejectReady(error);adapter.onerror?.(error);});
 actual.on('exit',code=>{clearTimeout(timeout);if(!terminating){const error=Error(`Actual shared Node worker exited unexpectedly (${code})`);rejectReady(error);adapter.onerror?.(error);}});
 try{await ready;return {transport,actual,terminationCount:()=>terminations};}catch(error){transport.dispose();throw error;}
}
