import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyTerrainResourcePayload,sameTerrainResourcePayload} from '../world/terrain-resource-payload.js';
import {estimateRetainedBytes} from './retained-size.js';

function resourcePayloads(resources,boundary,proposal){
 if(resources?.version!==1||proposal&&resources.phase!=='proposal'||!Number.isSafeInteger(resources.kind)||resources.kind<6||resources.kind>11||resources.kind===7&&resources.chunks?.length>0||resources.kind!==7&&resources.removed?.length>0||resources.nativeSession!==boundary.nativeSession||resources.ticket!==boundary.ticket||resources.effectiveTime!==boundary.effectiveTime||!Array.isArray(resources.chunks)||!Array.isArray(resources.removed))throw Error('Native terrain proposal resource identity mismatch');
 const keys=new Set(),payloads=[...resources.chunks,...resources.removed.map(({cx,cz})=>({authority:'spatial-wasm',cx,cz,removed:true}))].map(value=>copyTerrainResourcePayload(value,boundary.effectiveTime));
 for(const p of payloads){const key=`${p.cx},${p.cz}`;if(keys.has(key))throw Error('Duplicate native terrain proposal chunk');keys.add(key);}return payloads;
}
function samePayloads(expected,actual){const map=new Map(actual.map(p=>[`${p.cx},${p.cz}`,p]));return map.size===actual.length&&expected.length===actual.length&&expected.every(p=>sameTerrainResourcePayload(p,map.get(`${p.cx},${p.cz}`)));}

// A single speculative revision set on the existing terrain channel. Preparing
// does not stage/commit authority data. commit transfers the GPU reservation to
// the next ordinary confirmed batch; that batch still owns visible activation.
export function createTerrainProposalPublication({port,session,epoch,snapshot,staged,limits,available,timeoutMs=10000}){
 let slot=null,serial=0,closed=false;
 const send=(kind,item)=>port.postMessage({kind,session,epoch,id:item.id,sequence:item.sequence,worldBoundary:item.boundary});
 function abort(item,error=Error('Native terrain proposal cancelled')){
  if(slot!==item)return false;slot=null;clearTimeout(item.timer);item.signal?.removeEventListener('abort',item.onAbort);try{send('terrainProposalAbort',item);}catch{}finally{item.reject?.(error);}return true;
 }
 function valid(item){const base=snapshot();return !closed&&slot===item&&item.phase==='ready'&&!item.signal?.aborted&&base.idle&&base.sequence===item.baseSequence&&item.messages.every(m=>base.revision(m.payload.cx,m.payload.cz)+1===m.revision);}
 async function prepare({proposedWorldBoundary,resources,signal,sequence=snapshot().sequence+1}={}){
  const boundary=copyNativeWorldBoundary(proposedWorldBoundary),base=snapshot();
  if(!boundary||typeof epoch!=='string'||!epoch||!Number.isSafeInteger(sequence)||closed||slot||!available()||!base.idle||base.sequence<0||sequence!==base.sequence+1||signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw Error('Native terrain proposal publication unavailable');
  if(signal?.aborted)throw new DOMException('Native terrain proposal cancelled','AbortError');
  const payloads=resourcePayloads(resources,boundary,true),messages=payloads.map(payload=>({payload,sequence,epoch,revision:base.revision(payload.cx,payload.cz)+1})),bytes=payloads.reduce((sum,p)=>sum+estimateRetainedBytes(p),0),capacity=limits();
  // Keep room for comparing the actual publication with the owned preview.
  capacity.bytes=Math.floor(capacity.bytes/2);capacity.count=Math.floor(capacity.count/2);
  if(!Number.isSafeInteger(bytes)||bytes+256*(messages.length+1)>capacity.bytes||messages.length+1>capacity.count)throw Error('Native terrain proposal exceeds capacity');
  const item={id:++serial,boundary,baseSequence:base.sequence,sequence,messages,phase:'preparing',signal,kind:resources.kind};slot=item;
  const ready=new Promise((resolve,reject)=>{item.resolve=resolve;item.reject=reject;});
  item.onAbort=()=>abort(item,new DOMException('Native terrain proposal cancelled','AbortError'));signal?.addEventListener('abort',item.onAbort,{once:true});
  item.timer=setTimeout(()=>abort(item,Error('Native terrain proposal preparation timed out')),timeoutMs);
  try{port.postMessage({kind:'terrainProposal',session,epoch,id:item.id,sequence,baseSequence:base.sequence,worldBoundary:boundary,messages,bytes});}catch(error){abort(item,error);}
  await ready;
  return {valid:()=>valid(item),commit({worldBoundary,resources:committed}={}){
   const current=snapshot();
   if(slot!==item||item.phase!=='ready'||closed||item.signal?.aborted||current.sequence!==item.baseSequence||!sameNativeWorldBoundary(copyNativeWorldBoundary(worldBoundary),item.boundary)||committed?.kind!==item.kind||!item.messages.every(m=>current.revision(m.payload.cx,m.payload.cz)+1===m.revision)||!samePayloads(payloads,resourcePayloads(committed,item.boundary,false))||!samePayloads(payloads,staged()))throw Error('Native terrain proposal commit differs from preparation');
   send('terrainProposalCommit',item);clearTimeout(item.timer);item.timer=null;item.phase='armed';item.signal?.removeEventListener('abort',item.onAbort);return true;
  },abort(){return item.phase==='armed'?false:abort(item);}};
 }
 function accept(data){
  if(!['terrainProposalReady','terrainProposalRejected','terrainProposalInvalidated'].includes(data?.kind))return false;
  if(data.session!==session||data.epoch!==epoch||!Number.isSafeInteger(data.id)||data.id<1||data.id>serial)throw Error('Invalid native terrain proposal response');
  const item=slot;if(!item||item.id!==data.id)return true;
  if(data.kind==='terrainProposalInvalidated'){if(data.sequence!==item.sequence||!sameNativeWorldBoundary(copyNativeWorldBoundary(data.worldBoundary),item.boundary))throw Error('Native terrain proposal invalidation mismatch');abort(item,Error('Native terrain proposal became stale'));return true;}
  if(item.phase!=='preparing'||data.sequence!==item.sequence||!sameNativeWorldBoundary(copyNativeWorldBoundary(data.worldBoundary),item.boundary))throw Error('Native terrain proposal response mismatch');
  if(data.kind==='terrainProposalRejected'){abort(item,Error(data.message||'Native terrain proposal preparation rejected'));return true;}
  item.phase='ready';item.resolve();item.resolve=item.reject=null;return true;
 }
 return {prepare,accept,onStage(payload){if(slot&&(slot.phase==='preparing'||!slot.messages.some(m=>sameTerrainResourcePayload(m.payload,payload))))abort(slot,Error('Native terrain proposal invalidated by staged resources'));},beforePublication(sequence){if(!slot)return;if(slot.phase!=='armed'){abort(slot);return;}if(sequence!==slot.sequence||!samePayloads(slot.messages.map(m=>m.payload),staged()))throw Error('Native terrain proposal publication differs from preparation');slot=null;},cancel(){if(slot)abort(slot);},dispose(){closed=true;if(slot)abort(slot);},status(){return slot?{phase:slot.phase,sequence:slot.sequence,worldBoundary:slot.boundary}:null;}};
}
