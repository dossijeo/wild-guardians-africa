import {validateSnapshot} from '../persistence/snapshots.js';
import {actorTickState} from './worker-actor-tick-states.js';

export function historicalEventSemanticsSupported(tape,message){return tape?.version===2&&tape.complete===true&&Array.isArray(tape.boundaries)&&tape.boundaries.some(item=>item.eventIds?.length)&&Array.isArray(message?.events)&&message.events.length>0&&message.presentationJournalVersion===2&&Array.isArray(message.presentationJournal)&&message.presentationJournal.length===message.events.length&&message.events.every((event,index)=>message.presentationJournal[index]?.kind==='event'&&message.presentationJournal[index].eventId===event.id&&message.presentationJournal[index].at===event.simulationTime);}
export function groupHistoricalEventBoundaries(boundaries){const groups=[];for(const {at,events} of boundaries){let group=groups.at(-1);if(!group||group.at!==at){group={at,eventIds:[],count:0};groups.push(group);}group.eventIds.push(...events.map(event=>event.id));group.count++;}return groups;}

// Capture the actual observer-time state, then a silent end-of-tick state.
// Quiet ticks are never serialized. The optional producer fails closed if a
// nested observer changes event order or an in-progress state is invalid.
export function createHistoricalEventBoundaryCapture(state,{maxBoundaries=256,maxBytes=16*1024*1024}={}){
 if(!Number.isSafeInteger(maxBoundaries)||maxBoundaries<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw TypeError('Invalid historical boundary capacity');
 const base={slotId:state.slotId,stateSequence:state.sequence,elapsed:state.elapsed},boundaries=[];let previous=JSON.parse(JSON.stringify(state)),count=0,sampled=0,bytes=0,complete=true;
 function append(current,eventIds){if(!complete)return;validateSnapshot(current,{livePhysics:true});const next=JSON.parse(JSON.stringify(current)),changed=[],removed=[];for(const key of Object.keys(previous))if(!Object.hasOwn(next,key))removed.push(key);for(const [key,value] of Object.entries(next))if(!Object.hasOwn(previous,key)||JSON.stringify(previous[key])!==JSON.stringify(value))changed.push([key,JSON.stringify(value)]);const boundary={at:current.elapsed,eventIds,changed,removed},size=JSON.stringify(boundary).length*2;if(boundaries.length>=maxBoundaries||size>maxBytes-bytes){complete=false;return;}bytes+=size;boundaries.push(boundary);previous=next;}
 return {
  event(current,event,events){if(!Array.isArray(events)||events.length!==count+1||events[count]?.id!==event?.id||event?.simulationTime!==current.elapsed){complete=false;return;}count++;if(complete)append(current,[event.id]);},
  sample(current,events){if(!Array.isArray(events)||events.length!==count){complete=false;return;}if(count===sampled)return;if(!complete)return;const pending=boundaries.slice().reverse().find(item=>item.eventIds.length);if(!pending||pending.at!==current.elapsed){complete=false;return;}append(current,[]);sampled=count;},
  invalidate(){complete=false;},
  finish(events){if(!Array.isArray(events)||events.length!==count||sampled!==count)complete=false;return {version:2,base,boundaries,complete};}
 };
}

// Decode privately before making any intermediate observer-visible. For GPU
// playback, every atomic same-time group must end at an observed authority tick.
// Event-time snapshots are retained exactly for synchronous observers.
export function decodeHistoricalEventBoundaries(tape,initial,message,{requireActorTicks=false}={}){
 if(!tape||tape.version!==2||tape.complete!==true||!tape.base||tape.base.slotId!==initial.slotId||tape.base.stateSequence!==initial.sequence||tape.base.elapsed!==initial.elapsed||!Array.isArray(tape.boundaries)||tape.boundaries.length>256||!Array.isArray(message?.events)||!Number.isFinite(message.elapsed))throw TypeError('Invalid historical event boundaries');
 const ticks=message.worldMotionTrace?.actorTickStates;if(requireActorTicks&&(!ticks?.complete||!Array.isArray(ticks.actors)))throw TypeError('Historical actor ticks unavailable');
 let current=structuredClone(initial),index=0,at=initial.elapsed,bytes=0,decodedBytes=0,lastSilent=true;const result=[],initialActors=[...(initial.raid?.animals??[]),...initial.workers],actorIdentity=new Map(initialActors.map(actor=>[actor.id,actor.species??null]));if(requireActorTicks&&(actorIdentity.size!==initialActors.length||actorIdentity.size!==ticks.actors.length||new Set(ticks.actors.map(item=>item.actorId)).size!==ticks.actors.length))throw TypeError('Historical actor roster mismatch');
 for(const boundary of tape.boundaries){
  if(!boundary||!Number.isFinite(boundary.at)||boundary.at<at||boundary.at<=initial.elapsed||boundary.at>message.elapsed||boundary.at>at&&!lastSilent||boundary.at===at&&lastSilent||!Array.isArray(boundary.eventIds)||boundary.eventIds.length>1||!Array.isArray(boundary.changed)||!Array.isArray(boundary.removed)||!boundary.eventIds.length&&(lastSilent||boundary.at!==at))throw TypeError('Invalid historical boundary');
  bytes+=JSON.stringify(boundary).length*2;if(bytes>16*1024*1024)throw Error('Historical boundary capacity exceeded');const keys=new Set();
  const guarded=key=>requireActorTicks&&['suppressed','structures','villages'].includes(key);
  for(const key of boundary.removed){if(typeof key!=='string'||!key||keys.has(key)||!Object.hasOwn(current,key)||guarded(key))throw TypeError('Invalid historical removal');keys.add(key);delete current[key];}
  for(const pair of boundary.changed){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!pair[0]||keys.has(pair[0])||typeof pair[1]!=='string'||guarded(pair[0]))throw TypeError('Invalid historical change');keys.add(pair[0]);Object.defineProperty(current,pair[0],{value:JSON.parse(pair[1]),writable:true,enumerable:true,configurable:true});}
  validateSnapshot(current,{livePhysics:true});if(current.slotId!==initial.slotId||current.elapsed!==boundary.at)throw TypeError('Historical boundary identity mismatch');
  if(requireActorTicks){const actors=[...(current.raid?.animals??[]),...current.workers],seen=new Set();if(actors.length!==actorIdentity.size)throw TypeError('Historical actor roster mismatch');for(const actor of actors){if(seen.has(actor.id)||!actorIdentity.has(actor.id)||actorIdentity.get(actor.id)!==(actor.species??null))throw TypeError('Historical actor roster mismatch');seen.add(actor.id);if(!boundary.eventIds.length){const record=ticks.actors.find(item=>item.actorId===actor.id),sample=record?.samples?.find(item=>item.at===boundary.at);if(!sample||JSON.stringify(sample)!==JSON.stringify(actorTickState(actor,boundary.at,current.tasks??[])))throw TypeError('Historical actor tick mismatch');}}}
  const events=[];for(const id of boundary.eventIds){const event=message.events[index++];if(typeof id!=='string'||event?.id!==id||event.simulationTime!==boundary.at||current.events?.at(-1)?.id!==id)throw TypeError('Historical boundary event mismatch');events.push(event);}
  decodedBytes+=JSON.stringify(current).length*2;if(decodedBytes>64*1024*1024)throw Error('Decoded historical boundaries exceed capacity');result.push({at:boundary.at,state:structuredClone(current),events});at=boundary.at;lastSilent=!events.length;
 }
 if(index!==message.events.length||!lastSilent)throw TypeError('Incomplete historical events');return result;
}
