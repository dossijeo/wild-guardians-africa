// Replays one acknowledged checkpoint and its ordered post-checkpoint journal.
// The caller owns the handoff to live publication and must prevent gaps while
// switching ports. The checkpoint is restored as state, not re-emitted as events.
export function createPresentationRecoveryReplay({port,session,checkpoint,journal,onCaughtUp=()=>{},onError=()=>{}}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||!Number.isSafeInteger(checkpoint?.sequence)||checkpoint.sequence<1||typeof journal?.entry!=='function'||typeof journal?.status!=='function'||typeof onCaughtUp!=='function'||typeof onError!=='function')throw TypeError('Invalid presentation recovery replay');
 const base=checkpoint.sequence,initial=journal.status();if(initial.closed||initial.base!==base)throw Error('Recovery checkpoint and journal mismatch');
 let closed=false,failed=false,waiting=null,id=0,index=0,cursor=base,started=false,caught=false,terrainPending=false;
 function fail(error){if(closed||failed)return;failed=true;try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function send(phase,sequence,payload){const message={kind:'recovery'+phase[0].toUpperCase()+phase.slice(1),session,id:++id,sequence,...payload};waiting={id,phase,sequence};port.postMessage(message);}
 function pump(){if(closed||failed||waiting)return;try{
  const state=journal.status();if(state.closed||state.base!==base)throw Error('Recovery journal base changed during replay');
  if(!started){started=true;send('checkpoint',base,{checkpoint});return;}
  const entry=journal.entry(index);if(!entry){if(!terrainPending&&!caught){caught=true;onCaughtUp({sequence:cursor,entries:index});}return;}caught=false;
  if(!Number.isSafeInteger(entry.sequence)||entry.sequence!==cursor+1)throw Error('Recovery journal sequence gap');
  if(entry.kind==='terrain'){if(!Array.isArray(entry.chunks))throw Error('Invalid recovery terrain');send('terrain',entry.sequence,{chunks:entry.chunks});}
  else if(entry.kind==='publication'){if(entry.publication?.sequence!==entry.sequence||typeof entry.tick!=='boolean')throw Error('Invalid recovery publication');send('publication',entry.sequence,{publication:entry.publication,tick:entry.tick,options:entry.options});}
  else throw Error('Invalid recovery journal entry');
 }catch(error){fail(error);}}
 port.onmessage=({data})=>{if(closed||failed)return;try{
  if(!waiting||data?.kind!=='recoveryAck'||data.session!==session||data.id!==waiting.id||data.sequence!==waiting.sequence||data.phase!==waiting.phase)throw Error('Invalid recovery acknowledgement');
  const completed=waiting;waiting=null;if(completed.phase==='publication'){cursor=completed.sequence;terrainPending=false;}else if(completed.phase==='terrain')terrainPending=true;if(completed.phase!=='checkpoint')index++;pump();
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Recovery acknowledgement transfer failed'));port.start?.();pump();
 return {wake:pump,status(){return {closed,failed,base,cursor,index,waiting:waiting?{...waiting}:null,caughtUp:caught};},dispose(){if(closed)return;closed=true;port.onmessage=null;port.onmessageerror=null;}};
}
