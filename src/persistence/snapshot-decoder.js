import {deserialize} from './snapshots.js';

const abortError=()=>new DOMException('Snapshot loading cancelled','AbortError');
const signalError=signal=>signal?.reason?.name==='TimeoutError'?signal.reason:abortError();
const transportError=message=>{const error=new Error(message);error.name='SnapshotWorkerError';return error;};
// One request owns one Worker. Parsing and complete validation remain identical
// to synchronous saves; only their execution location changes. Structured-clone
// delivery can still consume main-thread time and must be measured separately.
export function decodeSnapshotAsync(text,{signal,timeout=30000,workerAvailable=typeof Worker!=='undefined',createWorker=()=>new Worker(new URL('./snapshot-decode-worker.js',import.meta.url),{type:'module'}),onDiagnostic=()=>{}}={}) {
 if(signal?.aborted)return Promise.reject(signalError(signal));
 if(!Number.isFinite(timeout)||timeout<=0)return Promise.reject(new RangeError('Invalid snapshot loading timeout'));
 const fallback=reason=>{
  // This is a blocking compatibility fallback, not fake asynchronous parsing.
  try{onDiagnostic({mode:'synchronous-fallback',reason});if(signal?.aborted)throw signalError(signal);return Promise.resolve(deserialize(text));}catch(error){return Promise.reject(error);}
 };
 if(!workerAvailable)return fallback('worker-unavailable');
 let worker;
 try{worker=createWorker();}catch(error){return fallback('worker-construction-failed');}
 return new Promise((resolve,reject)=>{
  let settled=false,timer;
  const finish=(error,state)=>{
   if(settled)return;settled=true;
   clearTimeout(timer);signal?.removeEventListener('abort',abort);
   worker.onmessage=worker.onerror=worker.onmessageerror=null;
   try{worker.terminate();}catch(failure){error??=failure;}
   error?reject(error):resolve(state);
  };
  const abort=()=>finish(signalError(signal));
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  timer=setTimeout(()=>finish(new DOMException('Snapshot loading timed out','TimeoutError')),timeout);
  worker.onmessage=event=>{
   if(settled)return;
   const result=event.data;
   if(!result||result.type!=='snapshot-decoded'){finish(transportError('Invalid snapshot worker response'));return;}
   if(result.error){const error=new Error(result.error.message);error.name=result.error.name??'Error';finish(error);return;}
   if(!result.state||typeof result.state!=='object'){finish(transportError('Snapshot worker returned no state'));return;}
   try{onDiagnostic({mode:'worker',decodeMs:result.decodeMs});finish(null,result.state);}catch(error){finish(transportError(error.message));}
  };
  // Worker execution/transport failures are reported, never silently retried as
  // blocking main-thread parsing after the diorama has started.
  worker.onerror=event=>{event.preventDefault?.();finish(transportError(event.message??'Snapshot worker failed'));};
  worker.onmessageerror=()=>finish(transportError('Snapshot worker result could not be cloned'));
  try{worker.postMessage({type:'decode-snapshot',text});}catch(error){finish(transportError(error.message));}
 });
}
