// Presentation receives confirmed publications asynchronously. It does not
// own the simulation clock, queue, or nested simulation Worker.
export function createWorkerHostedRuntime({world,session,clientOptions,runtimeOptions={},maxPending=256,controlReserve=8,onError=()=>{},workerFactory=()=>new Worker(new URL('./worker-runtime-host.js',import.meta.url),{type:'module'})}){
 if(typeof world?.createConfirmedReceiver!=='function'||typeof session!=='string'||!session||!clientOptions||typeof clientOptions!=='object'||!Number.isSafeInteger(maxPending)||maxPending<1||!Number.isSafeInteger(controlReserve)||controlReserve<1)throw TypeError('Invalid hosted runtime');
 const worker=workerFactory(),receiver=world.createConfirmedReceiver(session),pending=new Map();let phase='new',next=1,resolveStart,rejectStart,lastStatus={},lastPublication=null,lastAttackDiagnostic=null,fault=null;
 function fail(error){if(phase==='closed'||phase==='failed')return;fault=error instanceof Error?error:Error(String(error));phase='failed';rejectStart?.(fault);for(const p of pending.values())p.reject(fault);pending.clear();worker.terminate();try{onError(fault);}catch{}}
 worker.onmessage=({data})=>{if(phase==='closed'||phase==='failed')return;try{
  if(data?.session!==session)throw Error('Runtime host session mismatch');
  if(data.kind==='failure')throw Error(data.message);
  if(data.kind==='publication'){const p=data.publication,accepted=p?.unchanged?receiver.acceptUnchanged(p):receiver.accept(p);if(!accepted.accepted)throw Error('Hosted publication rejected: '+accepted.reason);lastPublication=p;if(p.diagnostics?.kind==='castAttack')lastAttackDiagnostic=p.diagnostics;if(runtimeOptions.diagnostics===true)worker.postMessage({kind:'publicationAck',session,sequence:p.sequence});return;}
  if(data.kind==='status'){lastStatus=data.status;return;}
  if(data.kind==='started'&&phase==='starting'){if(!Number.isSafeInteger(data.sequence)||data.sequence<1||data.sequence!==receiver.status().sequence||data.sequence!==lastPublication?.sequence)throw Error('Hosted start before confirmed publication');phase='running';lastStatus=data.status;resolveStart(lastPublication);return;}
  if(data.kind==='commandResult'||data.kind==='commandFailure'){const item=pending.get(data.id);if(!item)throw Error('Unexpected hosted command result');if(data.kind==='commandResult'&&(!Number.isSafeInteger(data.sequence)||data.sequence<1||data.sequence!==receiver.status().sequence||data.sequence!==lastPublication?.sequence))throw Error('Hosted command before confirmed publication');pending.delete(data.id);if(data.kind==='commandFailure')item.reject(Error(data.message));else item.resolve(lastPublication);return;}
  throw Error('Unexpected runtime host message');
 }catch(error){fail(error);}};
 worker.onerror=event=>fail(Error(event.message||'Runtime host failed'));worker.onmessageerror=()=>fail(Error('Runtime host message failed'));
 return {
  start(){if(phase!=='new')return Promise.reject(Error('Hosted runtime cannot start'));phase='starting';return new Promise((resolve,reject)=>{resolveStart=resolve;rejectStart=reject;try{worker.postMessage({kind:'initialize',session,clientOptions,runtimeOptions});}catch(error){fail(error);}});},
  submit(command){if(phase!=='running')return Promise.reject(fault??Error('Hosted runtime is not running'));const control=['pause','resume','snapshot'].includes(command?.kind);if(pending.size>=maxPending+(control?controlReserve:0))return Promise.reject(Error('Hosted runtime queue is full'));const id=next++;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});try{worker.postMessage({kind:'command',session,id,command:structuredClone(command)});}catch(error){pending.delete(id);reject(error);}});},
  setNightFastForward(value){if(phase!=='running'||typeof value!=='boolean')throw TypeError('Invalid hosted runtime speed');worker.postMessage({kind:'speed',session,value});},
  status(){const current=receiver.status();return {...lastStatus,running:phase==='running',closed:phase==='closed',fault:fault?.message??null,confirmedSequence:current.sequence,confirmedElapsed:current.lastElapsed,saveAvailable:lastPublication?.saveAvailable??false,...(lastAttackDiagnostic?{lastAttackDiagnostic}:{})};},
  dispose(){if(phase==='closed')return;const error=Error('Hosted runtime disposed');if(phase==='starting')rejectStart?.(error);for(const p of pending.values())p.reject(error);pending.clear();try{worker.postMessage({kind:'dispose',session});}catch{}worker.terminate();phase='closed';},
 };
}
