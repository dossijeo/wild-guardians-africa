// Coordinate the visible terrain and props of one confirmed chunk revision.
// The authority and transport acknowledgement never wait for this service.
export function createChunkPublicationCoordinator({admission,onError=()=>{},bootstrapTerrain=false}={}){
 if(typeof admission?.prepareManyAndPublish!=='function'||typeof onError!=='function'||typeof bootstrapTerrain!=='boolean')throw TypeError('Invalid chunk publication coordinator');
 const entries=new Map(),published=new Map();let closed=false;
 const identity=(key,epoch,revision)=>JSON.stringify([key,epoch,revision]);
 function cancelRun(entry){if(entry.run){entry.run.abort();entry.run=null;}}
 function remove(entry,side,participant){if(entry[side]!==participant)return;entry[side]=null;participant.signal.removeEventListener('abort',participant.aborted);cancelRun(entry);if(!entry.terrain&&!entry.biome)entries.delete(entry.id);else start(entry);}
 function start(entry){
  if(closed||entry.run)return;const prior=published.get(entry.key),committed=prior?.epoch===entry.epoch&&prior.revision===entry.revision;
  // A first terrain revision can be drawn before props exist. This lets the
  // ordinary world frame initialize the shadow target without ghost draws.
  // Replacements must still wait for both sides and publish together.
  const bootstrap=bootstrapTerrain&&!prior&&!!entry.terrain;
  const parts=committed?[entry.terrain,entry.biome].filter(Boolean):bootstrap?[entry.terrain]:[entry.terrain,entry.biome];if(parts.some(part=>!part)||!parts.length)return;
  const controller=new AbortController();entry.run=controller;
  const current=()=>!closed&&entry.run===controller&&!controller.signal.aborted&&parts.every(part=>entry[part.side]===part&&!part.signal.aborted);
  Promise.resolve().then(()=>admission.prepareManyAndPublish(parts.map(part=>({object:part.object,options:{signal:controller.signal}})),()=>{
   if(!current())return;const attached=[];try{for(const part of parts){part.attach();attached.push(part);}}catch(error){for(const part of attached.reverse())try{part.rollback();}catch{}throw error;}
   const notifications=[];for(const part of parts)notifications.push(part.finalize());published.set(entry.key,{epoch:entry.epoch,revision:entry.revision});
   for(const part of parts){entry[part.side]=null;part.signal.removeEventListener('abort',part.aborted);}entry.run=null;if(!entry.terrain&&!entry.biome)entries.delete(entry.id);
   for(const notify of notifications)if(typeof notify==='function')try{notify();}catch(error){try{onError(error);}catch{}}
   if(entries.get(entry.id)===entry)start(entry);
  })).then(()=>{if(entry.run===controller){entry.run=null;start(entry);}},error=>{if(entry.run!==controller||controller.signal.aborted||closed)return;entry.run=null;for(const part of parts)if(entry[part.side]===part){entry[part.side]=null;part.signal.removeEventListener('abort',part.aborted);try{part.onError(error);}catch(failure){try{onError(failure);}catch{}}}if(!entry.terrain&&!entry.biome)entries.delete(entry.id);else start(entry);});
 }
 function offer({key,revision,epoch=null,side,object,signal,attach,rollback,finalize,onError:failed}){
  if(closed)throw Error('Chunk publication coordinator closed');if(typeof key!=='string'||!key||!Number.isSafeInteger(revision)||revision<1||epoch!==null&&(typeof epoch!=='string'||!epoch)||!['terrain','biome'].includes(side)||!object?.isObject3D||!signal||typeof signal.addEventListener!=='function'||[attach,rollback,finalize,failed].some(fn=>typeof fn!=='function'))throw TypeError('Invalid chunk publication participant');
  if(signal.aborted)return ()=>{};const prior=published.get(key);if(prior?.epoch===epoch&&revision<prior.revision)throw Error('Stale chunk publication');const id=identity(key,epoch,revision);let entry=entries.get(id);if(!entry){entry={id,key,epoch,revision,terrain:null,biome:null,run:null};entries.set(id,entry);}if(entry[side])throw Error('Duplicate chunk publication participant');
  const participant={side,object,signal,attach,rollback,finalize,onError:failed};participant.aborted=()=>remove(entry,side,participant);entry[side]=participant;signal.addEventListener('abort',participant.aborted,{once:true});if(signal.aborted)participant.aborted();else start(entry);return ()=>remove(entry,side,participant);
 }
 // The owners must also retire their own participants. This method only
 // drops the shared transaction and never treats normal eviction as failure.
 function forget(key){if(typeof key!=='string'||!key)throw TypeError('Invalid chunk identity');if(closed)return;for(const entry of [...entries.values()])if(entry.key===key){cancelRun(entry);for(const part of [entry.terrain,entry.biome])if(part)part.signal.removeEventListener('abort',part.aborted);entries.delete(entry.id);}published.delete(key);}
 return {offer,forget,dispose(){if(closed)return;closed=true;for(const entry of entries.values()){cancelRun(entry);for(const part of [entry.terrain,entry.biome])if(part)part.signal.removeEventListener('abort',part.aborted);}entries.clear();published.clear();}};
}
