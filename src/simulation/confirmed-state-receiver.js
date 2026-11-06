import {deserializeConfirmedState} from './confirmed-live-state.js';
import {notifyConfirmedPresentationEvent} from './game-event-observers.js';
import {physicsOwners} from './host-publication-queue.js';
import {validateSnapshot} from '../persistence/snapshots.js';
import {confirmedSnapshotFor} from './confirmed-snapshot-handoff.js';

function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function keyed(array){return array.length>0&&array.every(item=>isRecord(item)&&typeof item.id==='string')&&new Set(array.map(item=>item.id)).size===array.length;}
// Preserve existing object identities so scene owners and UI selections can
// continue to refer to actors while their confirmed data is reconciled.
function reconcile(target,source,copy=false){
 if(Array.isArray(target)&&Array.isArray(source)){
  const byId=keyed(target)&&keyed(source)?new Map(target.map(item=>[item.id,item])):null;
  const values=source.map((value,index)=>merge(byId?byId.get(value.id):target[index],value,copy));target.length=values.length;for(let i=0;i<values.length;i++)target[i]=values[i];return target;
 }
 for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
 for(const [key,value] of Object.entries(source))target[key]=merge(target[key],value,copy);
 return target;
}
function merge(target,source,copy=false){if(Array.isArray(source))return Array.isArray(target)?reconcile(target,source,copy):copy?structuredClone(source):source;if(isRecord(source))return isRecord(target)?reconcile(target,source,copy):copy?structuredClone(source):source;return source;}
function mergeTracked(target,source,mark,copy=false){
 if(Array.isArray(source)&&Array.isArray(target)){
  const byId=keyed(target)&&keyed(source)?new Map(target.map(item=>[item.id,item])):null,values=source.map((value,index)=>mergeTracked(byId?byId.get(value.id):target[index],value,mark,copy));
  if(target.length!==values.length)mark();for(let i=0;i<values.length;i++)if(!Object.is(target[i],values[i]))mark();target.length=values.length;for(let i=0;i<values.length;i++)target[i]=values[i];return target;
 }
 if(isRecord(source)&&isRecord(target)){
  for(const key of Object.keys(target))if(!Object.hasOwn(source,key)){delete target[key];mark();}
  for(const [key,value] of Object.entries(source)){const exists=Object.hasOwn(target,key),before=target[key],next=mergeTracked(before,value,mark,copy);if(!exists||!Object.is(before,next))mark();target[key]=next;}return target;
 }
 return copy&&(Array.isArray(source)||isRecord(source))?structuredClone(source):source;
}
function reconcileChangedKeys(target,source,tracked,copy=false){
 const changed=new Set();for(const key of Object.keys(target))if(!Object.hasOwn(source,key)){delete target[key];if(!tracked||tracked.has(key))changed.add(key);}
 for(const [key,value] of Object.entries(source)){const watched=!tracked||tracked.has(key),exists=watched?Object.hasOwn(target,key):true,before=target[key],next=watched?mergeTracked(before,value,()=>changed.add(key),copy):merge(before,value,copy);if(watched&&(!exists||!Object.is(before,next)))changed.add(key);target[key]=next;}return changed;
}

// The caller supplies a state dedicated to presentation, not the authority.
// On observer failure the bridge becomes unusable: partial effects cannot be
// rolled back safely and must not be replayed as if they had been confirmed.
export function createConfirmedStateReceiver(state,session,{onReconciled=null,decodeSnapshot=deserializeConfirmedState,initialSequence=0,trackChangedKeys=false}={}){
 if(!state||typeof state!=='object'||typeof session!=='string'||!session||!Number.isSafeInteger(state.sequence)||state.sequence<1)throw TypeError('Invalid presentation receiver');
 if(!Number.isSafeInteger(initialSequence)||initialSequence<0||onReconciled!==null&&typeof onReconciled!=='function'||typeof decodeSnapshot!=='function'||trackChangedKeys!==true&&trackChangedKeys!==false&&(!Array.isArray(trackChangedKeys)||trackChangedKeys.some(key=>typeof key!=='string'||!key)||new Set(trackChangedKeys).size!==trackChangedKeys.length))throw TypeError('Invalid reconciliation callback or decoder');
 const tracked=Array.isArray(trackChangedKeys)?new Set(trackChangedKeys):null;
 let sequence=initialSequence,lastElapsed=state.elapsed,lastEvent=state.sequence-1,fault=false,pending=null;
 function prepareUnchanged(message,{firstSequence=message?.sequence}={}){
   if(pending)throw Error('Confirmed publication already prepared');
   if(fault)return {accepted:false,reason:'fault'};
   if(message?.session!==session)return {accepted:false,reason:'session'};
   if(!Number.isSafeInteger(message.sequence)||message.sequence<1)return {accepted:false,reason:'sequence'};
   if(message.sequence<=sequence)return {accepted:false,reason:'stale'};
   if(!Number.isSafeInteger(firstSequence)||firstSequence!==sequence+1||firstSequence>message.sequence)return {accepted:false,reason:'gap'};
   if(!sequence||message.unchanged!==true||message.slotId!==state.slotId||message.stateSequence!==state.sequence||message.elapsed!==lastElapsed||state.elapsed!==lastElapsed||!Array.isArray(message.events)||message.events.length||message.presentationJournal?.length||!Array.isArray(message.pauses)||JSON.stringify(message.pauses)!==JSON.stringify(state.pauses)||typeof message.saveAvailable!=='boolean'||Object.hasOwn(message,'snapshot')||Object.hasOwn(message,'physicsPose')||Object.hasOwn(message,'physicsPoses')||Object.hasOwn(message,'worldMotionTrace')||Object.hasOwn(message,'presentationPaths'))throw TypeError('Invalid unchanged publication');
   const token=Object.freeze({});pending={token,unchanged:true,sequence:message.sequence};return {accepted:true,token,elapsed:lastElapsed};
 }
 function prepare(message,{firstSequence=message?.sequence}={}){
   if(pending)throw Error('Confirmed publication already prepared');
   if(fault)return {accepted:false,reason:'fault'};
   if(message?.session!==session)return {accepted:false,reason:'session'};
   if(!Number.isSafeInteger(message.sequence)||message.sequence<1)return {accepted:false,reason:'sequence'};
   if(message.sequence<=sequence)return {accepted:false,reason:'stale'};
   if(!Number.isSafeInteger(firstSequence)||firstSequence!==sequence+1||firstSequence>message.sequence)return {accepted:false,reason:'gap'};
   if(firstSequence!==message.sequence&&(!Array.isArray(message.events)||physicsOwners(message)===null))throw TypeError('Invalid coalesced publication');
   const handed=confirmedSnapshotFor(message);if(handed===undefined&&typeof message.snapshot!=='string'||!Array.isArray(message.events))throw TypeError('Invalid confirmed state');
   if(message.presentationPaths!==undefined&&(message.presentationPaths!=='head-v1'||message.terrainCheckpoint||message.motionTrace||message.worldMotionTrace||message.motionInvalidation))throw TypeError('Invalid presentation path projection');
   if(message.presentationJournalVersion!==undefined&&message.presentationJournalVersion!==2)throw TypeError('Invalid presentation lifecycle version');
   if(message.presentationJournalVersion===2&&!Array.isArray(message.presentationJournal))throw TypeError('Missing presentation lifecycle journal');
   if(message.presentationJournal!==undefined){
    if(!Array.isArray(message.presentationJournal))throw TypeError('Invalid presentation lifecycle journal');
    const ids=new Map(message.events.map((event,index)=>[event?.id,index])),relevant=new Set(message.events.filter(event=>message.presentationJournalVersion===2||['SpellActivated','CropPicked','CropDestroyed','RaidEnded'].includes(event.type)).map(event=>event.id)),gone=new Set();let last=-1;
    for(const fact of message.presentationJournal){if(!fact||typeof fact!=='object')throw TypeError('Invalid presentation lifecycle fact');if(fact.kind==='event'){const index=ids.get(fact.eventId);if(index===undefined||index<=last||!relevant.delete(fact.eventId))throw TypeError('Invalid presentation lifecycle event order');last=index;}else if(fact.kind!=='animalGone'||typeof fact.actorId!=='string'||!fact.actorId||gone.has(fact.actorId))throw TypeError('Invalid presentation lifecycle fact');else gone.add(fact.actorId);}
    if(relevant.size)throw TypeError('Incomplete presentation lifecycle journal');
   }
   const next=handed===undefined?decodeSnapshot(message.snapshot):handed;if(handed!==undefined)validateSnapshot(next,{livePhysics:true});if(Object.hasOwn(message,'elapsed')&&(!Number.isFinite(message.elapsed)||message.elapsed!==next.elapsed))throw TypeError('Confirmed publication time does not match snapshot');if(next.elapsed<lastElapsed)throw Error('Confirmed simulation time moved backwards');if(next.slotId!==state.slotId||!Number.isSafeInteger(next.sequence)||next.sequence<state.sequence)throw Error('Confirmed simulation identity or sequence changed');
   if(message.presentationJournalVersion===2||message.presentationJournal?.some(fact=>Object.hasOwn(fact,'at'))){let at=lastElapsed;for(const fact of message.presentationJournal){if(!Number.isFinite(fact.at)||fact.at<at||fact.at>next.elapsed)throw TypeError('Invalid presentation lifecycle time');at=fact.at;}}
   if(message.presentationPaths==='head-v1'&&[...next.workers,...(next.raid?.animals??[])].some(actor=>Array.isArray(actor.path)&&actor.path.length>1))throw TypeError('Invalid projected presentation path');
   if(message.presentationJournal)for(const fact of message.presentationJournal)if(fact.kind==='animalGone'){const animal=next.raid?.animals?.find(a=>a.id===fact.actorId);if(animal&&animal.status!=='gone')throw TypeError('Presentation lifecycle conflicts with state');}
   let nextEvent=Math.max(lastEvent,state.sequence-1);for(const event of message.events){const match=typeof event?.id==='string'?/^event-(0|[1-9]\d*)$/.exec(event.id):null,n=match?Number(match[1]):NaN;if(!Number.isSafeInteger(n)||n<=nextEvent||n>=next.sequence||typeof event.type!=='string')throw TypeError('Invalid confirmed event sequence');nextEvent=n;}
   // The caller retains no right to mutate the transferred publication until
   // commit or discard. Its decoded snapshot is private to this receiver.
   const token=Object.freeze({});pending={token,sequence:message.sequence,next,nextEvent,message,copy:handed!==undefined};return {accepted:true,token,elapsed:next.elapsed};
 }
 function commit(token,{beforeObservers=null}={}){
  if(!pending||pending.token!==token)throw Error('Invalid prepared publication token');
  if(beforeObservers!==null&&typeof beforeObservers!=='function')throw TypeError('Invalid confirmed publication barrier');
  const item=pending;pending=null;
  if(item.unchanged){try{beforeObservers?.();}catch(error){fault=true;throw error;}sequence=item.sequence;return {accepted:true,sequence,...(trackChangedKeys?{changedKeys:new Set()}: {})};}
  let changedKeys;try{if(trackChangedKeys)changedKeys=reconcileChangedKeys(state,item.next,tracked,item.copy);else reconcile(state,item.next,item.copy);beforeObservers?.();onReconciled?.(item.message);for(const event of item.message.events)notifyConfirmedPresentationEvent(state,event);}
  catch(error){fault=true;throw error;}
  sequence=item.sequence;lastElapsed=item.next.elapsed;lastEvent=item.nextEvent;return {accepted:true,sequence,...(trackChangedKeys?{changedKeys}: {})};
 }
 function acceptPrepared(result){return result.accepted?commit(result.token):result;}
 return {
  prepare,prepareUnchanged,commit,
  discard(token){if(!pending||pending.token!==token)throw Error('Invalid prepared publication token');pending=null;},
  accept(message,options){return acceptPrepared(prepare(message,options));},
  acceptUnchanged(message,options){return acceptPrepared(prepareUnchanged(message,options));},
  status(){return {sequence,lastElapsed,fault};}
 };
}
