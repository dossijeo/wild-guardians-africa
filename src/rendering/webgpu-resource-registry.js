import {createSharedIdleAssetBudget,estimateIdleAssetBytes} from './webgpu-idle-assets.js';

// The registry owns source resources, pending loads and their leases. Models
// cloned by consumers remain their responsibility; the shared source survives
// until its last lease is released and the common idle budget evicts it.
let nextGeneration=0;
export function createWebGpuResourceRegistry({maxIdleBytes=0,idleBudget=null}={}){
 const budget=idleBudget??createSharedIdleAssetBudget(maxIdleBytes),generation=++nextGeneration,banks=new Set(),namespaces=new Map();let closed=false,nextResourceVersion=0;
 if(typeof budget?.createOwner!=='function'||typeof budget?.status!=='function')throw TypeError('Invalid resource budget');
 function createBank({namespace,load,validate}={}){
  if(closed)throw Error('Resource registry closed');if(typeof namespace!=='string'||!namespace||typeof load!=='function'||typeof validate!=='function')throw TypeError('Invalid resource bank');if(namespaces.has(namespace))throw Error('Resource namespace already owned');
  const entries=new Map(),controller=new AbortController();let bankClosed=false;
  function retireIfEmpty(){if(bankClosed&&entries.size===0){banks.delete(bank);if(namespaces.get(namespace)===bank)namespaces.delete(namespace);}}
  const idle=budget.createOwner(key=>{const entry=entries.get(key);if(entry&&entry.refs===0&&entry.pending===0){entries.delete(key);const asset=entry.asset;entry.asset=null;asset?.dispose();retireIfEmpty();}});
  function releaseUnused(key,entry){if(entry.refs||entry.pending||!entry.asset||entries.get(key)!==entry)return;if(bankClosed||closed){entries.delete(key);const asset=entry.asset;entry.asset=null;asset.dispose();retireIfEmpty();}else idle.retain(key,entry.asset.retentionReady===false?Infinity:estimateIdleAssetBytes(entry.asset));}
  function source(key){idle.take(key);let entry=entries.get(key);if(entry)return entry;entry={refs:0,pending:0,asset:null,version:++nextResourceVersion};entry.promise=Promise.resolve().then(()=>load(key,controller.signal)).then(asset=>{if(!validate(asset)){asset?.dispose?.();throw TypeError('Invalid '+namespace+' asset');}if(closed||bankClosed){asset.dispose();throw new DOMException('Resource bank disposed','AbortError');}entry.asset=asset;return asset;}).catch(error=>{if(entries.get(key)===entry)entries.delete(key);retireIfEmpty();throw error;});entries.set(key,entry);return entry;}
  async function acquire(key){if(closed||bankClosed)throw Error('Resource bank disposed');const entry=source(key);entry.pending++;let asset;try{asset=await entry.promise;if(closed||bankClosed)throw new DOMException('Resource bank disposed','AbortError');entry.refs++;}finally{entry.pending--;releaseUnused(key,entry);}let released=false;return {asset,generation,version:entry.version,release(){if(released)return;released=true;entry.refs--;releaseUnused(key,entry);}};}
  function dispose(){if(bankClosed)return;bankClosed=true;controller.abort();idle.clear();for(const [key,entry] of entries)releaseUnused(key,entry);retireIfEmpty();}
  const bank={acquire,dispose,forEachReady(fn){if(typeof fn!=='function')throw TypeError('Invalid resource visitor');for(const entry of entries.values())if(entry.asset)fn(entry.asset);},status(){return {namespace,generation,closed:bankClosed,idle:idle.status(),entries:[...entries.entries()].map(([key,entry])=>({key,version:entry.version,ready:!!entry.asset,textured:entry.asset?.textured,refs:entry.refs,pending:entry.pending}))};}};banks.add(bank);namespaces.set(namespace,bank);return bank;
 }
 return {generation,createBank,status(){return {generation,closed,idle:budget.status(),banks:[...banks].map(bank=>bank.status())};},dispose(){if(closed)return;closed=true;for(const bank of [...banks])bank.dispose();}};
}
