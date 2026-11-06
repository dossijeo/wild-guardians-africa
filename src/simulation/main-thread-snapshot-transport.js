// Incremental wire representation for the UI consumer. The authority and
// graphical consumer retain their original snapshots and publication order.
// The receiver owns a private immutable baseline, separate from the mutable UI
// state. This is a transport step, not a save format.
import {handoffConfirmedSnapshot} from './confirmed-snapshot-handoff.js';
function fields(snapshot){
 const value=JSON.parse(snapshot);
 if(!value||typeof value!=='object'||Array.isArray(value))throw TypeError('Invalid snapshot transport state');
 return new Map(Object.keys(value).map(key=>[key,JSON.stringify(value[key])]));
}
export function createMainSnapshotEncoder(){
 let base=null,sequence=0;
 return {encode(envelope){
  if(envelope?.kind!=='publication')return envelope;
  const publication=envelope.publication,n=publication?.sequence;
  if(!Number.isSafeInteger(n)||n<=sequence)throw Error('Invalid snapshot transport sequence');
  if(publication.unchanged===true){sequence=n;return envelope;}
  if(typeof publication.snapshot!=='string')throw TypeError('Missing snapshot transport state');
  const next=fields(publication.snapshot);let wire=envelope;
  if(base){
   const changed=[],removed=[];for(const [key,value] of next)if(base.get(key)!==value)changed.push([key,value]);for(const key of base.keys())if(!next.has(key))removed.push(key);
   const delta={version:1,baseSequence:sequence,changed,removed};
   if(JSON.stringify(delta).length<publication.snapshot.length){const {snapshot,...rest}=publication;wire={...envelope,publication:{...rest,snapshotDelta:delta}};}
  }
  base=next;sequence=n;return wire;
 }};
}

export function createMainSnapshotDecoder(){
 let base=null,sequence=0;
 return {decode(envelope){
  if(envelope?.kind!=='publication')return envelope;
  const publication=envelope.publication,n=publication?.sequence;
  if(!Number.isSafeInteger(n)||n<=sequence)throw Error('Invalid snapshot transport sequence');
  if(publication.unchanged===true){if(publication.snapshotDelta!==undefined)throw TypeError('Unexpected snapshot delta');sequence=n;return envelope;}
  let next,wire=envelope;
  if(typeof publication.snapshot==='string'&&publication.snapshotDelta===undefined){next=JSON.parse(publication.snapshot);if(!next||typeof next!=='object'||Array.isArray(next))throw TypeError('Invalid snapshot transport state');}
  else{
   const delta=publication.snapshotDelta;
   if(publication.snapshot!==undefined||!base||!delta||delta.version!==1||delta.baseSequence!==sequence||!Array.isArray(delta.changed)||!Array.isArray(delta.removed))throw TypeError('Invalid snapshot delta');
   next={...base};const seen=new Set();
   for(const pair of delta.changed){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||seen.has(pair[0]))throw TypeError('Invalid snapshot delta field');const value=JSON.parse(pair[1]);seen.add(pair[0]);Object.defineProperty(next,pair[0],{value,writable:true,enumerable:true,configurable:true});}
   for(const key of delta.removed){if(typeof key!=='string'||seen.has(key)||!Object.hasOwn(next,key))throw TypeError('Invalid snapshot delta removal');seen.add(key);delete next[key];}
   const {snapshotDelta,...rest}=publication;let snapshot;const rebuilt={...rest};Object.defineProperty(rebuilt,'snapshot',{enumerable:true,get(){return snapshot??=JSON.stringify(next);}});wire={...envelope,publication:rebuilt};
  }
  handoffConfirmedSnapshot(wire.publication,next);
  base=next;sequence=n;return wire;
 }};
}
