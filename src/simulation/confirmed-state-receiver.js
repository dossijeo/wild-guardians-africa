import {deserializeConfirmedState} from './confirmed-live-state.js';
import {notifyConfirmedPresentationEvent} from '../simulation/game.js';
import {physicsOwners} from './host-publication-queue.js';

function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function keyed(array){return array.length>0&&array.every(item=>isRecord(item)&&typeof item.id==='string')&&new Set(array.map(item=>item.id)).size===array.length;}
// Preserve existing object identities so scene owners and UI selections can
// continue to refer to actors while their confirmed data is reconciled.
function reconcile(target,source){
 if(Array.isArray(target)&&Array.isArray(source)){
  const byId=keyed(target)&&keyed(source)?new Map(target.map(item=>[item.id,item])):null;
  const values=source.map((value,index)=>merge(byId?byId.get(value.id):target[index],value));target.length=values.length;for(let i=0;i<values.length;i++)target[i]=values[i];return target;
 }
 for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
 for(const [key,value] of Object.entries(source))target[key]=merge(target[key],value);
 return target;
}
function merge(target,source){if(Array.isArray(source))return Array.isArray(target)?reconcile(target,source):source;if(isRecord(source))return isRecord(target)?reconcile(target,source):source;return source;}

// The caller supplies a state dedicated to presentation, not the authority.
// On observer failure the bridge becomes unusable: partial effects cannot be
// rolled back safely and must not be replayed as if they had been confirmed.
export function createConfirmedStateReceiver(state,session,{onReconciled=null}={}){
 if(!state||typeof state!=='object'||typeof session!=='string'||!session||!Number.isSafeInteger(state.sequence)||state.sequence<1)throw TypeError('Invalid presentation receiver');
 if(onReconciled!==null&&typeof onReconciled!=='function')throw TypeError('Invalid reconciliation callback');
 let sequence=0,lastElapsed=state.elapsed,lastEvent=state.sequence-1,fault=false;
 return {
  acceptUnchanged(message){
   if(fault)return {accepted:false,reason:'fault'};
   if(message?.session!==session)return {accepted:false,reason:'session'};
   if(!Number.isSafeInteger(message.sequence)||message.sequence<1)return {accepted:false,reason:'sequence'};
   if(message.sequence<=sequence)return {accepted:false,reason:'stale'};
   if(message.sequence!==sequence+1)return {accepted:false,reason:'gap'};
   if(!sequence||message.unchanged!==true||message.slotId!==state.slotId||message.stateSequence!==state.sequence||message.elapsed!==lastElapsed||state.elapsed!==lastElapsed||!Array.isArray(message.events)||message.events.length||!Array.isArray(message.pauses)||JSON.stringify(message.pauses)!==JSON.stringify(state.pauses)||typeof message.saveAvailable!=='boolean'||Object.hasOwn(message,'snapshot')||Object.hasOwn(message,'physicsPose')||Object.hasOwn(message,'physicsPoses'))throw TypeError('Invalid unchanged publication');
   sequence=message.sequence;return {accepted:true,sequence};
  },
  accept(message,{firstSequence=message?.sequence}={}){
   if(fault)return {accepted:false,reason:'fault'};
   if(message?.session!==session)return {accepted:false,reason:'session'};
   if(!Number.isSafeInteger(message.sequence)||message.sequence<1)return {accepted:false,reason:'sequence'};
   if(message.sequence<=sequence)return {accepted:false,reason:'stale'};
   if(!Number.isSafeInteger(firstSequence)||firstSequence!==sequence+1||firstSequence>message.sequence)return {accepted:false,reason:'gap'};
   if(firstSequence!==message.sequence&&(!Array.isArray(message.events)||message.events.length||physicsOwners(message)===null))throw TypeError('Invalid coalesced publication');
   if(typeof message.snapshot!=='string'||!Array.isArray(message.events))throw TypeError('Invalid confirmed state');
   const next=deserializeConfirmedState(message.snapshot);if(next.elapsed<lastElapsed)throw Error('Confirmed simulation time moved backwards');if(next.slotId!==state.slotId||!Number.isSafeInteger(next.sequence)||next.sequence<state.sequence)throw Error('Confirmed simulation identity or sequence changed');
   let nextEvent=Math.max(lastEvent,state.sequence-1);for(const event of message.events){const match=typeof event?.id==='string'?/^event-(0|[1-9]\d*)$/.exec(event.id):null,n=match?Number(match[1]):NaN;if(!Number.isSafeInteger(n)||n<=nextEvent||n>=next.sequence||typeof event.type!=='string')throw TypeError('Invalid confirmed event sequence');nextEvent=n;}
   try{reconcile(state,next);onReconciled?.(message);for(const event of message.events)notifyConfirmedPresentationEvent(state,event);}
   catch(error){fault=true;throw error;}
   sequence=message.sequence;lastElapsed=next.elapsed;lastEvent=nextEvent;return {accepted:true,sequence};
  },
  status(){return {sequence,lastElapsed,fault};}
 };
}
