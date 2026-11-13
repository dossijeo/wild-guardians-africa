import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {sameTerrainResourcePayload} from '../world/terrain-resource-payload.js';
import {estimateRetainedBytes} from '../simulation/retained-size.js';

// Uses the real terrain/biome batch preparer and its reservations. No second
// coordinator or live scene mutation is allowed while a proposal is preparing.
export function createTerrainProposalReceiver({port,session,snapshot,prepare,validate,maxHistory,maxHistoryBytes,onChange,onError}){
 let slot=null,closed=false,lastId=0;
 const reply=(kind,item,extra={})=>port.postMessage({kind,session,epoch:item.epoch,id:item.id,sequence:item.sequence,worldBoundary:item.boundary,...extra});
 function cancel(){const item=slot;if(!item)return;slot=null;item.controller.abort();try{item.handle?.abort();}finally{onChange();}}
 function current(item){const base=snapshot();return !closed&&slot===item&&!item.controller.signal.aborted&&base.idle&&base.sequence===item.baseSequence&&base.epoch===item.epoch;}
 function accept(data){
  if(!['terrainProposal','terrainProposalCommit','terrainProposalAbort'].includes(data?.kind))return false;
  if(data.session!==session||!Number.isSafeInteger(data.id)||data.id<1)throw Error('Invalid native terrain proposal');
  const boundary=copyNativeWorldBoundary(data.worldBoundary);if(!boundary)throw Error('Missing native terrain proposal identity');
  if(data.kind!=='terrainProposal'){
   if(data.id>lastId)throw Error('Unknown native terrain proposal');const item=slot;if(!item||item.id!==data.id)return true;
   if(data.sequence!==item.sequence||data.epoch!==item.epoch||!sameNativeWorldBoundary(boundary,item.boundary))throw Error('Native terrain proposal control mismatch');
   if(data.kind==='terrainProposalAbort'){cancel();return true;}
   if(item.phase!=='ready'||!current(item)||item.handle?.valid()!==true)throw Error('Native terrain proposal became stale');item.phase='armed';onChange();return true;
  }
  if(closed||slot||data.id<=lastId||!prepare)throw Error('Native terrain proposal unavailable');lastId=data.id;
  const item={id:data.id,sequence:data.sequence,baseSequence:data.baseSequence,epoch:data.epoch,boundary,controller:new AbortController(),phase:'preparing',messages:data.messages,charge:data.bytes+256*((data.messages?.length??0)+1)};
  const base=snapshot(),messages=data.messages;
  if(typeof data.epoch!=='string'||!data.epoch||!Number.isSafeInteger(data.sequence)||!base.idle||data.baseSequence!==base.sequence||data.sequence!==base.sequence+1||data.epoch!==base.epoch||!Array.isArray(messages)||!Number.isSafeInteger(data.bytes)||data.bytes<0||messages.length+1>Math.floor(maxHistory/2)||data.bytes+256*(messages.length+1)>Math.floor(maxHistoryBytes/2)){reply('terrainProposalRejected',item,{message:'Native terrain proposal boundary or capacity unavailable'});return true;}
  const keys=new Set();let bytes=0;
  for(const message of messages){const p=message?.payload,key=`${p?.cx},${p?.cz}`;if(message.sequence!==data.sequence||message.epoch!==data.epoch||!Number.isSafeInteger(message.revision)||message.revision<1||p?.capturedAt!==boundary.effectiveTime||keys.has(key))throw Error('Invalid native terrain proposal revision');keys.add(key);validate(p,message.revision,data.epoch);bytes+=estimateRetainedBytes(p);}
  if(bytes!==data.bytes)throw Error('Native terrain proposal byte reservation mismatch');slot=item;
  Promise.resolve().then(()=>current(item)?prepare(messages,{signal:item.controller.signal,proposedWorldBoundary:boundary}):null).then(handle=>{
   if(!current(item)){handle?.abort();if(slot===item){cancel();reply('terrainProposalInvalidated',item);}return;}
   item.handle=handle;
   if(!handle||['valid','commit','abort'].some(key=>typeof handle[key]!=='function')||handle.valid()!==true||handle.canonicalPropsUnmasked!==true){throw Error('Native terrain proposal GPU resources unavailable');}
   item.handle=handle;item.phase='ready';reply('terrainProposalReady',item);onChange();
  }).catch(error=>{if(slot!==item||closed)return;try{cancel();}finally{reply('terrainProposalRejected',item,{message:String(error.message??error)});}}).catch(onError);
  return true;
 }
 return {accept,invalidate(){const item=slot;if(!item||item.phase==='armed')return;cancel();reply('terrainProposalInvalidated',item);},take(messages,{signal,sequence}={}){
  const item=slot;if(!item)return null;
  const source=new Map(item.messages.map(m=>[`${m.payload.cx},${m.payload.cz}`,m]));
  if(item.phase!=='armed'||item.sequence!==sequence||messages.length!==source.size||!messages.every(m=>{const p=source.get(`${m.payload.cx},${m.payload.cz}`);return p&&p.revision===m.revision&&p.epoch===(m.epoch??null)&&sameTerrainResourcePayload(p.payload,m.payload);})||item.handle.valid()!==true)throw Error('Confirmed terrain differs from native GPU preparation');
  for(const message of messages)message.payload=source.get(`${message.payload.cx},${message.payload.cz}`).payload;
  slot=null;const raw=item.handle,abort=()=>raw.abort(),detach=()=>signal?.removeEventListener('abort',abort);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();throw new DOMException('Native terrain proposal cancelled','AbortError');}
  onChange();return {canonicalPropsUnmasked:true,nativeWorldBoundary:item.boundary,valid:()=>raw.valid(),commit(){try{return raw.commit();}finally{detach();}},abort(){detach();item.controller.abort();return raw.abort();},identityFor(payload){return raw.identityFor?.(source.get(`${payload.cx},${payload.cz}`)?.payload)??null;}};
 },cancel,dispose(){closed=true;cancel();},retainedBytes(){return slot?.charge??0;},status(){return slot?{phase:slot.phase,sequence:slot.sequence,worldBoundary:slot.boundary}:null;}};
}
