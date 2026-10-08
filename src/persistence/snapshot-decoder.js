import {deserialize} from './snapshots.js';
import {SnapshotAssembly} from './snapshot-stream.js';
import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';

const abortError=()=>new DOMException('Snapshot loading cancelled','AbortError');
const signalError=signal=>signal?.reason?.name==='TimeoutError'?signal.reason:abortError();
const transportError=message=>{const error=new Error(message);error.name='SnapshotWorkerError';return error;};
// One request owns one Worker. Parsing and complete validation remain identical
// to synchronous saves; only their execution location changes. Structured-clone
// delivery can still consume main-thread time and must be measured separately.
export function decodeSnapshotAsync(text,{signal,timeout=30000,workerAvailable=typeof Worker!=='undefined',createWorker=()=>new Worker(new URL('./snapshot-decode-worker.js',import.meta.url),{type:'module'}),onDiagnostic=()=>{},nextFrame}={}) {
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
  let settled=false,timer,assembly,streamStarted,spent=0,assemblyCpuMs=0,yields=0;
  const deliveryOwner=new AbortController();
  const finish=(error,state)=>{
   if(settled)return;settled=true;
   clearTimeout(timer);signal?.removeEventListener('abort',abort);deliveryOwner.abort();assembly=null;
   worker.onmessage=worker.onerror=worker.onmessageerror=null;
   try{worker.terminate();}catch(failure){error??=failure;}
   error?reject(error):resolve(state);
  };
  const abort=()=>finish(signalError(signal));
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  timer=setTimeout(()=>finish(new DOMException('Snapshot loading timed out','TimeoutError')),timeout);
  worker.onmessage=async event=>{
   if(settled)return;
   const result=event.data;
   if(['snapshot-start','snapshot-chunk','snapshot-complete'].includes(result?.type)){
    const began=performance.now();
    try{
     if(result.type==='snapshot-start'){
      if(assembly)throw Error('Duplicate snapshot stream');assembly=new SnapshotAssembly(result);streamStarted=began;
     }else{
      if(!assembly)throw Error('Snapshot chunk before header');
      if(result.type==='snapshot-complete'){
       const state=assembly.complete(result.sequence);
       onDiagnostic({mode:'worker',decodeMs:result.decodeMs,streamed:true,chunks:result.sequence,deliveryMs:performance.now()-streamStarted,assemblyCpuMs,yields});finish(null,state);return;
      }
      assembly.accept(result);
     }
     const elapsed=performance.now()-began;spent+=elapsed;assemblyCpuMs+=elapsed;
     // Accumulated CPU work, not inter-message wait. Several inexpensive blocks
     // may fit in a frame; never add an obligatory RAF for each acknowledgement.
     if(spent>=6){yields++;await waitGpuFrame({check:()=>{if(settled||deliveryOwner.signal.aborted)throw abortError();},signal:deliveryOwner.signal,nextFrame});spent=0;}
     if(settled)return;
     worker.postMessage({type:'snapshot-next',sequence:assembly.sequence});
    }catch(error){if(!settled)finish(transportError(error.message));}
    return;
   }
   if(!result||result.type!=='snapshot-decoded'||assembly&&!result.error){finish(transportError('Invalid snapshot worker response'));return;}
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
