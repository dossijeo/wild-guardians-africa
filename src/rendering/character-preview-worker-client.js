const cancelled=()=>new DOMException('Character preview cancelled','AbortError');

export function createCharacterPreviewDataClient({workerFactory=()=>new Worker(new URL('./character-preview-data-worker.js',import.meta.url),{type:'module'})}={}){
 if(typeof workerFactory!=='function')throw TypeError('Invalid character data worker factory');
 const worker=workerFactory(),sessions=new Map(),pending=new Map();let nextSession=1,nextRequest=1,closed=false;
 function fail(error){if(closed)return;closed=true;for(const item of pending.values())item.reject(error);pending.clear();for(const item of sessions.values())item.signal?.removeEventListener('abort',item.onAbort);sessions.clear();worker.terminate();}
 worker.onerror=event=>fail(Error(event.message||'Character data worker failed'));worker.onmessageerror=()=>fail(Error('Character data transfer failed'));
 worker.onmessage=({data})=>{const item=pending.get(data?.id);if(!item||item.session!==data.session){if(data?.kind==='bitmaps'&&Array.isArray(data.result))for(const entry of data.result)entry?.[1]?.close?.();return;}pending.delete(data.id);if(data.error){const error=Error(String(data.error.message??'Character data request failed'));error.name=String(data.error.name??'Error');item.reject(error);}else item.resolve(data.result);};
 function request(session,kind,extra={}){if(closed||!sessions.has(session))return Promise.reject(cancelled());const id=nextRequest++;return new Promise((resolve,reject)=>{pending.set(id,{session,resolve,reject});try{worker.postMessage({id,session,kind,...extra});}catch(error){pending.delete(id);reject(error);}});}
 function closeSession(session){const item=sessions.get(session);if(!item)return;sessions.delete(session);item.signal?.removeEventListener('abort',item.onAbort);for(const [id,request] of pending)if(request.session===session){pending.delete(id);request.reject(cancelled());}if(!closed)try{worker.postMessage({id:nextRequest++,session,kind:'close'});}catch(error){fail(error);}}
 return {
  async open(url,{features=[],signal}={}){
   const target=typeof url==='string'?url:url instanceof URL?url.href:'';
   if(closed||!target||!Array.isArray(features)||signal!==undefined&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Invalid character data session');
   if(signal?.aborted)throw cancelled();const session=nextSession++,item={signal,onAbort:()=>closeSession(session)};sessions.set(session,item);signal?.addEventListener('abort',item.onAbort,{once:true});if(signal?.aborted){closeSession(session);throw cancelled();}
   try{
    const info=await request(session,'open',{url:target,features});if(!sessions.has(session))throw cancelled();const metadataIds=new WeakMap();
    return {id:info.id,variant:info.variant,async loadPreview(){return new Uint8Array(await request(session,'preview'));},async loadMetadata(){const result=await request(session,'metadata');metadataIds.set(result.metadata,result.metadataId);return result.metadata;},async loadTextures(metadata){const metadataId=metadataIds.get(metadata);if(!metadataId)throw Error('Invalid character texture request');const entries=await request(session,'textures',{metadataId});return new Map(entries.map(([path,buffer])=>[path,new Uint8Array(buffer)]));},...(info.variant==='webp'&&info.supportsBitmaps===true?{async loadBitmaps(metadata){const metadataId=metadataIds.get(metadata);if(!metadataId)throw Error('Invalid character texture request');return new Map(await request(session,'bitmaps',{metadataId}));}}:{}),...(info.variant==='bc7'?{async loadCompressedTextures(metadata){const metadataId=metadataIds.get(metadata);if(!metadataId)throw Error('Invalid character texture request');return new Map(await request(session,'compressed',{metadataId}));}}:{}),close(){closeSession(session);}};
   }catch(error){closeSession(session);throw error;}
  },
  dispose(){fail(Error('Character data worker disposed'));},
  status(){return {closed,sessions:sessions.size,pending:pending.size};},
 };
}
