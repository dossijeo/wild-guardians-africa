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
const ENTITY_FIELDS=new Set(['workers','plants','structures','crates','villages','spells','tasks','people']);
function entityMap(value){
 if(!Array.isArray(value))return null;const result=new Map();
 for(const item of value){if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id||result.has(item.id))return null;result.set(item.id,item);}return result;
}
function entityDelta(key,before,after){
 if(!ENTITY_FIELDS.has(key)||typeof before!=='string')return null;
 const old=entityMap(JSON.parse(before)),current=entityMap(JSON.parse(after));if(!old||!current)return null;
 const order=[...current.keys()],updates=[];for(const [id,item] of current){const text=JSON.stringify(item);if(!old.has(id)||JSON.stringify(old.get(id))!==text)updates.push([id,text]);}
 const patch=[key,order,updates];return JSON.stringify(patch).length<JSON.stringify([key,after]).length?patch:null;
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
   const changed=[],removed=[],entities=[];for(const [key,value] of next)if(base.get(key)!==value){const patch=entityDelta(key,base.get(key),value);if(patch)entities.push(patch);else changed.push([key,value]);}for(const key of base.keys())if(!next.has(key))removed.push(key);
   const delta={version:entities.length?2:1,baseSequence:sequence,changed,removed,...(entities.length?{entities}:{})};
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
   if(publication.snapshot!==undefined||!base||!delta||![1,2].includes(delta.version)||delta.baseSequence!==sequence||!Array.isArray(delta.changed)||!Array.isArray(delta.removed)||delta.version===1&&delta.entities!==undefined||delta.version===2&&!Array.isArray(delta.entities))throw TypeError('Invalid snapshot delta');
   next={...base};const seen=new Set();
   for(const pair of delta.changed){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||seen.has(pair[0]))throw TypeError('Invalid snapshot delta field');const value=JSON.parse(pair[1]);seen.add(pair[0]);Object.defineProperty(next,pair[0],{value,writable:true,enumerable:true,configurable:true});}
   for(const patch of delta.entities??[]){
    if(!Array.isArray(patch)||patch.length!==3||!ENTITY_FIELDS.has(patch[0])||seen.has(patch[0])||!Array.isArray(patch[1])||!Array.isArray(patch[2]))throw TypeError('Invalid entity delta');
    const [key,order,updates]=patch,previous=entityMap(base[key]),ordered=new Set(order),changedIds=new Set();
    if(!previous||ordered.size!==order.length||order.some(id=>typeof id!=='string'||!id))throw TypeError('Invalid entity delta order');
    for(const pair of updates){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||!ordered.has(pair[0])||changedIds.has(pair[0]))throw TypeError('Invalid entity delta update');const item=JSON.parse(pair[1]);if(!item||typeof item!=='object'||Array.isArray(item)||item.id!==pair[0])throw TypeError('Invalid entity delta identity');changedIds.add(pair[0]);previous.set(pair[0],item);}
    if(order.some(id=>!previous.has(id)))throw TypeError('Missing entity delta update');seen.add(key);next[key]=order.map(id=>previous.get(id));
   }
   for(const key of delta.removed){if(typeof key!=='string'||seen.has(key)||!Object.hasOwn(next,key))throw TypeError('Invalid snapshot delta removal');seen.add(key);delete next[key];}
   const {snapshotDelta,...rest}=publication;let snapshot;const rebuilt={...rest};Object.defineProperty(rebuilt,'snapshot',{enumerable:true,get(){return snapshot??=JSON.stringify(next);}});wire={...envelope,publication:rebuilt};
  }
  handoffConfirmedSnapshot(wire.publication,next);
  base=next;sequence=n;return wire;
 }};
}
