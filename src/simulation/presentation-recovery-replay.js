import {estimateRetainedBytes} from './retained-size.js';
// Replays one acknowledged checkpoint and its ordered post-checkpoint journal.
// The caller owns the handoff to live publication and must prevent gaps while
// switching ports. The checkpoint is restored as state, not re-emitted as events.
export function createPresentationRecoveryReplay({port,session,checkpoint,journal,atomicBoundaries=false,maxGroupBytes=null,onCaughtUp=()=>{},onError=()=>{}}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||!Number.isSafeInteger(checkpoint?.sequence)||checkpoint.sequence<1||typeof journal?.entry!=='function'||typeof journal?.status!=='function'||typeof atomicBoundaries!=='boolean'||maxGroupBytes!==null&&(!Number.isSafeInteger(maxGroupBytes)||maxGroupBytes<1)||typeof onCaughtUp!=='function'||typeof onError!=='function')throw TypeError('Invalid presentation recovery replay');
 const base=checkpoint.sequence,initial=journal.status();if(initial.closed||initial.base!==base)throw Error('Recovery checkpoint and journal mismatch');const groupLimit=maxGroupBytes??initial.maxBytes;if(atomicBoundaries&&(!Number.isSafeInteger(groupLimit)||groupLimit<1))throw TypeError('Invalid recovery boundary capacity');
 let closed=false,failed=false,waiting=null,id=0,index=0,cursor=base,started=false,caught=false,terrainPending=false,group=[],groupBytes=0;
 function fail(error){if(closed||failed)return;failed=true;group=[];groupBytes=0;try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function send(phase,sequence,payload){const message={kind:'recovery'+phase[0].toUpperCase()+phase.slice(1),session,id:++id,sequence,...payload};waiting={id,phase,sequence};port.postMessage(message);}
 function pump(){if(closed||failed||waiting)return;try{
  const state=journal.status();if(state.closed||state.base!==base)throw Error('Recovery journal base changed during replay');
  if(!started){started=true;send('checkpoint',base,{checkpoint});return;}
  if(atomicBoundaries){
   for(;;){const entry=journal.entry(index+group.length);if(!entry){if(!group.length&&!caught){caught=true;onCaughtUp({sequence:cursor,entries:index});}return;}caught=false;
    if(entry.sequence!==cursor+1||(entry.firstSequence??entry.sequence)!==entry.sequence)throw Error('Recovery boundary sequence gap');
    if(entry.kind==='terrain'){if(!Array.isArray(entry.chunks))throw Error('Invalid recovery terrain');const bytes=estimateRetainedBytes(entry);if(bytes>groupLimit-groupBytes)throw Error('Recovery boundary capacity exceeded');group.push(entry);groupBytes+=bytes;continue;}
    if(entry.kind!=='publication'||entry.publication?.sequence!==entry.sequence||typeof entry.tick!=='boolean')throw Error('Invalid recovery publication');
    const bytes=estimateRetainedBytes(entry);if(bytes>groupLimit-groupBytes)throw Error('Recovery boundary capacity exceeded');const terrain=group.map(item=>({chunks:item.chunks,...(item.terrainManifest?{terrainManifest:item.terrainManifest}:{})}));send('boundary',entry.sequence,{terrain,publication:entry.publication,tick:entry.tick,options:entry.options});waiting.entries=group.length+1;group=[];groupBytes=0;return;
   }
  }
  const entry=journal.entry(index);if(!entry){if(!terrainPending&&!caught){caught=true;onCaughtUp({sequence:cursor,entries:index});}return;}caught=false;
  const firstSequence=entry.firstSequence??entry.sequence;
  if(!Number.isSafeInteger(entry.sequence)||!Number.isSafeInteger(firstSequence)||firstSequence!==cursor+1||firstSequence>entry.sequence)throw Error('Recovery journal sequence gap');
  if(entry.kind==='terrain'){if(firstSequence!==entry.sequence||!Array.isArray(entry.chunks))throw Error('Invalid recovery terrain');send('terrain',entry.sequence,{chunks:entry.chunks,...(entry.terrainManifest?{terrainManifest:entry.terrainManifest}:{})});}
  else if(entry.kind==='publication'){if(entry.publication?.sequence!==entry.sequence||typeof entry.tick!=='boolean'||firstSequence!==entry.sequence&&entry.tick!==true)throw Error('Invalid recovery publication');send('publication',entry.sequence,{publication:entry.publication,tick:entry.tick,options:entry.options,firstSequence});}
  else throw Error('Invalid recovery journal entry');
 }catch(error){fail(error);}}
 port.onmessage=({data})=>{if(closed||failed)return;try{
  if(data?.kind==='recoveryFailure'&&data.session===session&&typeof data.message==='string'&&data.message)throw Error(data.message);if(!waiting||data?.kind!=='recoveryAck'||data.session!==session||data.id!==waiting.id||data.sequence!==waiting.sequence||data.phase!==waiting.phase)throw Error('Invalid recovery acknowledgement');
  const completed=waiting;waiting=null;if(completed.phase==='publication'){cursor=completed.sequence;terrainPending=false;}else if(completed.phase==='terrain')terrainPending=true;else if(completed.phase==='boundary')cursor=completed.sequence;if(completed.phase==='boundary')index+=completed.entries;else if(completed.phase!=='checkpoint')index++;pump();
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Recovery acknowledgement transfer failed'));port.start?.();pump();
 return {wake:pump,status(){return {closed,failed,base,cursor,index,waiting:waiting?{...waiting}:null,caughtUp:caught,...(atomicBoundaries?{groupBytes,groupLimit}:{})};},dispose(){if(closed)return;closed=true;group=[];groupBytes=0;port.onmessage=null;port.onmessageerror=null;}};
}
