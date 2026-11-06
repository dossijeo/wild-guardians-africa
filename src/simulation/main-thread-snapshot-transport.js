// Incremental wire representation for the UI consumer. The authority and
// graphical consumer retain their original snapshots and publication order.
// The receiver owns a private immutable baseline, separate from the mutable UI
// state. This is a transport step, not a save format.
import {handoffConfirmedSnapshot,confirmedSnapshotFor} from './confirmed-snapshot-handoff.js';
import {estimateRetainedBytes} from './retained-size.js';
function fields(snapshot){
 const value=JSON.parse(snapshot);
 if(!value||typeof value!=='object'||Array.isArray(value))throw TypeError('Invalid snapshot transport state');
 return new Map(Object.keys(value).map(key=>[key,JSON.stringify(value[key])]));
}
// Consumers have independent acknowledged bases, but may prepare the same
// publication in the host. Share only this immutable parsing result; never
// share or advance their sequence cursors.
export function createSnapshotPreparationCache(){
 let source=null,prepared=null,bytes=0;
 return {prepare(snapshot){if(typeof snapshot!=='string')throw TypeError('Invalid snapshot transport state');if(snapshot!==source){prepared=fields(snapshot);source=snapshot;bytes=estimateRetainedBytes({source,prepared});}return prepared;},prepareState(state){if(!state||typeof state!=='object'||Array.isArray(state))throw TypeError('Invalid snapshot transport state');if(state!==source){prepared=new Map(Object.keys(state).map(key=>[key,JSON.stringify(state[key])]));source=state;bytes=estimateRetainedBytes({source,prepared});}return prepared;},retainedBytes(){return bytes;},clear(){source=prepared=null;bytes=0;}};
}
const ENTITY_FIELDS=new Set(['workers','plants','structures','crates','villages','spells','tasks','people']);
function entityMap(value){
 if(!Array.isArray(value))return null;const result=new Map();
 for(const item of value){if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id||result.has(item.id))return null;result.set(item.id,item);}return result;
}
function entityChanges(before,after){
 const old=entityMap(before),current=entityMap(after);if(!old||!current)return null;
 const order=[...current.keys()],updates=[];for(const [id,item] of current){const text=JSON.stringify(item);if(!old.has(id)||JSON.stringify(old.get(id))!==text)updates.push([id,text]);}
 return [order,updates];
}
function entityDelta(key,before,after){
 if(!ENTITY_FIELDS.has(key)||typeof before!=='string')return null;
 const changes=entityChanges(JSON.parse(before),JSON.parse(after));if(!changes)return null;
 const [order,updates]=changes;
 const patch=[key,order,updates];return JSON.stringify(patch).length<JSON.stringify([key,after]).length?patch:null;
}
function raidDelta(before,after){
 if(typeof before!=='string')return null;const old=JSON.parse(before),current=JSON.parse(after);
 if(!old||!current||typeof old!=='object'||typeof current!=='object'||Array.isArray(old)||Array.isArray(current)||!entityMap(old.animals)||!entityMap(current.animals))return null;
 const changed=[],removed=[];for(const key of Object.keys(current))if(key!=='animals'&&JSON.stringify(old[key])!==JSON.stringify(current[key]))changed.push([key,JSON.stringify(current[key])]);for(const key of Object.keys(old))if(key!=='animals'&&!Object.hasOwn(current,key))removed.push(key);
 const animals=JSON.stringify(old.animals)===JSON.stringify(current.animals)?null:entityChanges(old.animals,current.animals),patch={changed,removed,animals};
 return JSON.stringify(patch).length<JSON.stringify(['raid',after]).length?patch:null;
}
function applyEntityChanges(before,order,updates){
 const previous=entityMap(before),ordered=new Set(order),changedIds=new Set();
 if(!previous||ordered.size!==order.length||order.some(id=>typeof id!=='string'||!id))throw TypeError('Invalid entity delta order');
 for(const pair of updates){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||!ordered.has(pair[0])||changedIds.has(pair[0]))throw TypeError('Invalid entity delta update');const item=JSON.parse(pair[1]);if(!item||typeof item!=='object'||Array.isArray(item)||item.id!==pair[0])throw TypeError('Invalid entity delta identity');changedIds.add(pair[0]);previous.set(pair[0],item);}
 if(order.some(id=>!previous.has(id)))throw TypeError('Missing entity delta update');return order.map(id=>previous.get(id));
}
export function createMainSnapshotEncoder({prepareSnapshot=fields,prepareState=null,trackRetained=false}={}){
 if(typeof prepareSnapshot!=='function'||prepareState!==null&&typeof prepareState!=='function'||typeof trackRetained!=='boolean')throw TypeError('Invalid snapshot preparation');
 let base=null,sequence=0,retained=0;
 return {encode(envelope,{forceFull=false,preparedFields=null}={}){
  if(typeof forceFull!=='boolean'||preparedFields!==null&&!(preparedFields instanceof Map))throw TypeError('Invalid snapshot transport option');
  if(envelope?.kind!=='publication')return envelope;
  const publication=envelope.publication,n=publication?.sequence;
  if(!Number.isSafeInteger(n)||n<=sequence)throw Error('Invalid snapshot transport sequence');
  if(publication.unchanged===true){sequence=n;return envelope;}
  const handed=prepareState?confirmedSnapshotFor(publication):undefined;
  if(!Object.hasOwn(publication,'snapshot')||preparedFields===null&&handed===undefined&&typeof publication.snapshot!=='string')throw TypeError('Missing snapshot transport state');
  const next=preparedFields??(handed===undefined?prepareSnapshot(publication.snapshot):prepareState(handed));if(!(next instanceof Map))throw TypeError('Invalid prepared snapshot');let wire=envelope;
  if(base&&!forceFull){
   const changed=[],removed=[],entities=[];let raid=null;for(const [key,value] of next)if(base.get(key)!==value){const patch=entityDelta(key,base.get(key),value),raidPatch=key==='raid'?raidDelta(base.get(key),value):null;if(patch)entities.push(patch);else if(raidPatch)raid=raidPatch;else changed.push([key,value]);}for(const key of base.keys())if(!next.has(key))removed.push(key);
   const delta={version:raid?3:entities.length?2:1,baseSequence:sequence,changed,removed,...(entities.length?{entities}:{}),...(raid?{raid}:{})};
   let snapshotLength;if(preparedFields||handed!==undefined){snapshotLength=2+Math.max(0,next.size-1);for(const [key,value] of next){if(typeof key!=='string'||typeof value!=='string')throw TypeError('Invalid prepared snapshot');snapshotLength+=JSON.stringify(key).length+1+value.length;}}else snapshotLength=publication.snapshot.length;
   if(JSON.stringify(delta).length<snapshotLength){const rest={};for(const key of Object.keys(publication))if(key!=='snapshot')rest[key]=publication[key];wire={...envelope,publication:{...rest,snapshotDelta:delta}};}
  }
  base=next;sequence=n;if(trackRetained)retained=estimateRetainedBytes(next);return wire;
 },retainedBytes(){return retained;},dispose(){base=null;sequence=0;retained=0;}};
}

export function createMainSnapshotDecoder({trackRetained=false}={}){
 if(typeof trackRetained!=='boolean')throw TypeError('Invalid snapshot decoder');let base=null,sequence=0,retained=0;
 return {decode(envelope){
  if(envelope?.kind!=='publication')return envelope;
  const publication=envelope.publication,n=publication?.sequence;
  if(!Number.isSafeInteger(n)||n<=sequence)throw Error('Invalid snapshot transport sequence');
  if(publication.unchanged===true){if(publication.snapshotDelta!==undefined)throw TypeError('Unexpected snapshot delta');sequence=n;return envelope;}
  let next,wire=envelope;
  if(typeof publication.snapshot==='string'&&publication.snapshotDelta===undefined){next=JSON.parse(publication.snapshot);if(!next||typeof next!=='object'||Array.isArray(next))throw TypeError('Invalid snapshot transport state');}
  else{
   const delta=publication.snapshotDelta;
   if(publication.snapshot!==undefined||!base||!delta||![1,2,3].includes(delta.version)||delta.baseSequence!==sequence||!Array.isArray(delta.changed)||!Array.isArray(delta.removed)||delta.version===1&&delta.entities!==undefined||delta.version===2&&!Array.isArray(delta.entities)||delta.version!==3&&delta.raid!==undefined||delta.version===3&&(!delta.raid||delta.entities!==undefined&&!Array.isArray(delta.entities)))throw TypeError('Invalid snapshot delta');
   next={...base};const seen=new Set();
   for(const pair of delta.changed){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||seen.has(pair[0]))throw TypeError('Invalid snapshot delta field');const value=JSON.parse(pair[1]);seen.add(pair[0]);Object.defineProperty(next,pair[0],{value,writable:true,enumerable:true,configurable:true});}
   for(const patch of delta.entities??[]){
    if(!Array.isArray(patch)||patch.length!==3||!ENTITY_FIELDS.has(patch[0])||seen.has(patch[0])||!Array.isArray(patch[1])||!Array.isArray(patch[2]))throw TypeError('Invalid entity delta');
    const [key,order,updates]=patch;seen.add(key);next[key]=applyEntityChanges(base[key],order,updates);
   }
   if(delta.raid!==undefined){
    const patch=delta.raid,previous=base.raid;if(seen.has('raid')||!previous||typeof previous!=='object'||Array.isArray(previous)||!Array.isArray(patch.changed)||!Array.isArray(patch.removed)||patch.animals!==null&&(!Array.isArray(patch.animals)||patch.animals.length!==2||!Array.isArray(patch.animals[0])||!Array.isArray(patch.animals[1])))throw TypeError('Invalid raid delta');
    const value={...previous},raidSeen=new Set(['animals']);
    for(const pair of patch.changed){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||raidSeen.has(pair[0]))throw TypeError('Invalid raid delta field');raidSeen.add(pair[0]);Object.defineProperty(value,pair[0],{value:JSON.parse(pair[1]),writable:true,enumerable:true,configurable:true});}
    for(const key of patch.removed){if(typeof key!=='string'||raidSeen.has(key)||!Object.hasOwn(value,key))throw TypeError('Invalid raid delta removal');raidSeen.add(key);delete value[key];}
    if(patch.animals!==null)value.animals=applyEntityChanges(previous.animals,patch.animals[0],patch.animals[1]);seen.add('raid');next.raid=value;
   }
   for(const key of delta.removed){if(typeof key!=='string'||seen.has(key)||!Object.hasOwn(next,key))throw TypeError('Invalid snapshot delta removal');seen.add(key);delete next[key];}
   const {snapshotDelta,...rest}=publication;let snapshot;const rebuilt={...rest};Object.defineProperty(rebuilt,'snapshot',{enumerable:true,get(){return snapshot??=JSON.stringify(next);}});wire={...envelope,publication:rebuilt};
  }
  handoffConfirmedSnapshot(wire.publication,next);
  base=next;sequence=n;if(trackRetained)retained=estimateRetainedBytes(next);return wire;
 },retainedBytes(){return retained;},dispose(){base=null;sequence=0;retained=0;}};
}
