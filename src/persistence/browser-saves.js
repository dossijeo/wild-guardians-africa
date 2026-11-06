import {SaveRepository,serialize,deserialize} from './snapshots.js';
import {decodeSnapshotAsync} from './snapshot-decoder.js';
import {waitGpuPreparation} from '../rendering/wait-gpu-preparation.js';

const interrupted=error=>['AbortError','TimeoutError','SnapshotWorkerError'].includes(error?.name);

function snapshot(text,slotId) {
  const state=deserialize(text);
  if(state.slotId!==slotId)throw Error('La partida guardada pertenece a otra ranura.');
  return state;
}
function recover(record,slotId) {
  try{return snapshot(record?.primary,slotId);}
  catch{return snapshot(record?.backup,slotId);}
}

// One atomic transaction replaces both copies. Full history stays in the snapshot.
export class BrowserSaveRepository {
  constructor(storage,{database=globalThis.indexedDB,name='wild-guardians-saves'}={}) {
    this.legacy=new SaveRepository(storage);this.database=database;this.name=name;
    this.connection=null;this.pending=Promise.resolve();this.lastCommitted=null;
  }
  open() {
    if(this.connection)return this.connection;
    let failed=false;
    const connection=new Promise((resolve,reject)=>{
      const request=this.database.open(this.name,1);
      const fail=error=>{
        failed=true;
        if(this.connection===connection)this.connection=null;
        reject(error);
      };
      request.onupgradeneeded=()=>request.result.createObjectStore('slots',{keyPath:'slotId'});
      request.onerror=()=>fail(request.error);
      // A blocked IDB request remains alive after our caller receives an error.
      // Close its eventual result instead of leaking an unowned connection.
      request.onblocked=()=>fail(Error('El almacenamiento de partidas está ocupado por otra ventana.'));
      request.onsuccess=()=>{
        const db=request.result;
        if(failed){db.close();return;}
        db.onversionchange=()=>{
          db.close();
          if(this.connection===connection){this.connection=null;this.lastCommitted=null;}
        };
        resolve(db);
      };
    });
    this.connection=connection;
    // Also recover from synchronous IDB.open errors. Only this request owns
    // its cache entry; old callbacks must not clear a successful retry.
    connection.catch(()=>{if(this.connection===connection)this.connection=null;});
    return connection;
  }
  enqueue(action) {
    const result=this.pending.then(action);this.pending=result.catch(()=>{});return result;
  }
  async records(slotId) {
    await this.pending;
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('slots','readonly'),store=tx.objectStore('slots');
      const request=slotId===undefined?store.getAll():store.get(slotId);let result;
      request.onsuccess=()=>{result=request.result;};
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error??Error('No se pudieron leer las partidas.'));
      tx.onerror=()=>{};
    });
  }
  save(state) {
    // Capture now, before waiting for earlier autosaves; gameplay may mutate state.
    const text=serialize(state),slotId=state.slotId;
    if(!this.database)return Promise.resolve().then(()=>this.legacy.save(deserialize(text)));
    return this.enqueue(async()=>{
      const db=await this.open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('slots','readwrite'),store=tx.objectStore('slots'),request=store.get(slotId);
        request.onsuccess=()=>{
          let backup=request.result?.backup;
          // Only the exact bytes already validated and durably written by this
          // repository can bypass parsing. Other tabs and corrupt copies still
          // take the complete validation path. Retain at most one snapshot.
          const previous=request.result?.primary;
          try{
            if(this.lastCommitted?.slotId!==slotId||this.lastCommitted.text!==previous)snapshot(previous,slotId);
            backup=previous;
          }catch{/* Keep a valid older recovery copy. */}
          if(!backup)try{backup=serialize(this.legacy.load(slotId));}catch{/* New slot. */}
          store.put({slotId,primary:text,backup});
        };
        tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??Error('No se pudo guardar la partida.'));
        tx.onerror=()=>{};
      });
      this.lastCommitted={slotId,text};
      // Only clean up the old backend after the durable transaction completed.
      try{this.legacy.delete(slotId);}catch{/* The committed IndexedDB copy has priority. */}
    });
  }
  // Run checkpoint validation, backup validation and IndexedDB writes in a
  // Worker. The queue is shared with regular saves and deletes in this tab.
  saveWorkerCheckpoint(checkpoint,{slotId,policy,savedAt,timeout=30000,workerFactory=()=>new Worker(new URL('./worker-checkpoint-store.js',import.meta.url),{type:'module'})}={}){
    if(!this.database||typeof slotId!=='string'||!slotId||!policy||typeof workerFactory!=='function'||!Number.isFinite(timeout)||timeout<=0)return Promise.reject(TypeError('Invalid worker checkpoint persistence'));
    return this.enqueue(async()=>{
      const key=this.legacy.key(slotId);let legacyPrimary=null,legacyBackup=null;try{legacyPrimary=this.legacy.storage.getItem(key);legacyBackup=this.legacy.storage.getItem(key+':backup');}catch{/* IndexedDB remains usable if legacy storage is unavailable. */}
      const {sequence,saveAvailable,snapshot,physicsCheckpoint,raidWaitBindings,nativeAuthorityCheckpoint}=checkpoint??{};
      const result=await new Promise((resolve,reject)=>{
        let worker,timer,settled=false;const finish=(failure,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;try{worker.terminate();}catch(error){failure??=error;}}failure?reject(failure):resolve(value);};
        try{worker=workerFactory();worker.onmessage=({data})=>{const value=data?.result;if(data?.kind==='error')return finish(Error(data.message||'Worker checkpoint failed'));if(data?.kind!=='result'||typeof value?.saved!=='boolean'||value.sequence!==sequence||value.saved&&(!Number.isFinite(value.elapsed)||value.elapsed<0)||!value.saved&&value.reason!=='physics-active')return finish(Error('Invalid worker checkpoint response'));finish(null,value);};worker.onerror=event=>{event.preventDefault?.();finish(Error(event.message||'Worker checkpoint failed'));};worker.onmessageerror=()=>finish(Error('Worker checkpoint transfer failed'));timer=setTimeout(()=>finish(new DOMException('El guardado no ha respondido a tiempo.','TimeoutError')),timeout);worker.postMessage({kind:'save',databaseName:this.name,slotId,policy,savedAt,checkpoint:{sequence,saveAvailable,snapshot,physicsCheckpoint,raidWaitBindings,nativeAuthorityCheckpoint},legacyPrimary,legacyBackup});}catch(error){finish(error);}
      });
      if(result.saved){this.lastCommitted=null;try{this.legacy.delete(slotId);}catch{/* IndexedDB already committed. */}}
      return result;
    });
  }
  async load(slotId) {
    if(!this.database)return this.legacy.load(slotId);
    const record=await this.records(slotId);
    try{return recover(record,slotId);}catch{return this.legacy.load(slotId);}
  }
  // Loading-screen path. Ordinary save/list/load contracts stay synchronous at
  // their validation points; this explicitly moves loading validation off-thread.
  async loadPrepared(slotId,{signal,decode=decodeSnapshotAsync,timeout=30000,onDiagnostic=()=>{},withSource=false}={}) {
    if(!Number.isFinite(timeout)||timeout<=0)throw new RangeError('Invalid snapshot loading timeout');
    if(typeof withSource!=='boolean')throw TypeError('Invalid snapshot source option');
    const owner=new AbortController(),abort=()=>owner.abort(signal?.reason?.name==='TimeoutError'?signal.reason:new DOMException('Snapshot loading cancelled','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const started=performance.now(),check=()=>{
      if(owner.signal.aborted)throw owner.signal.reason??new DOMException('Snapshot loading cancelled','AbortError');
      if(performance.now()-started>timeout){const error=new DOMException('Snapshot loading timed out','TimeoutError');owner.abort(error);throw error;}
    };
    const held=new Promise(()=>{}),awaitOwned=async pending=>{
      let value;const read=Promise.resolve(pending).then(result=>{value=result;});
      await waitGpuPreparation(read,{check,signal:owner.signal,nextFrame:()=>held,pollIntervalMs:Math.min(100,timeout)});
      return value;
    };
    const readCopies=async record=>{
      let failure=Error('Guardado incompatible');
      for(const text of [record?.primary,record?.backup]){
        check();if(typeof text!=='string')continue;
        try{
          const state=await awaitOwned(decode(text,{signal:owner.signal,timeout:Math.max(1,timeout-(performance.now()-started)),onDiagnostic}));check();
          if(state.slotId!==slotId)throw Error('La partida guardada pertenece a otra ranura.');
          // Keep the exact copy that passed validation, including a recovered
          // backup. The Worker can consume it without reserializing in the UI.
          return withSource?{state,source:text}:state;
        }catch(error){if(interrupted(error))throw error;failure=error;}
      }
      throw failure;
    };
    const legacy=()=>{const key=this.legacy.key(slotId);return readCopies({primary:this.legacy.storage.getItem(key),backup:this.legacy.storage.getItem(key+':backup')});};
    try{
      check();if(!this.database)return await legacy();
      // Reuse the bounded ownership waiter. Storage waits have no RAF dependency;
      // a held wake source is raced with transaction completion and owner signal.
      const record=await awaitOwned(this.records(slotId));check();
      try{return await readCopies(record);}catch(error){if(interrupted(error))throw error;return await legacy();}
    }finally{signal?.removeEventListener('abort',abort);owner.abort();}
  }
  async list() {
    if(!this.database)return this.legacy.list();
    const result=new Map(this.legacy.list().map(row=>[row.slotId,row]));
    for(const record of await this.records())try{
      const state=recover(record,record.slotId);
      result.set(state.slotId,{slotId:state.slotId,day:state.day,time:state.time,biome:state.biome,culture:state.culture,money:state.ledger.balance,updated:state.savedAt});
    }catch{/* Surface only valid recoverable slots. */}
    return [...result.values()].sort((a,b)=>(b.updated??0)-(a.updated??0));
  }
  delete(slotId) {
    if(typeof slotId!=='string'||!slotId)throw Error('Ranura inválida');
    if(!this.database)return Promise.resolve().then(()=>this.legacy.delete(slotId));
    return this.enqueue(async()=>{
      const db=await this.open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('slots','readwrite');tx.objectStore('slots').delete(slotId);
        tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??Error('No se pudo eliminar la partida.'));tx.onerror=()=>{};
      });
      if(this.lastCommitted?.slotId===slotId)this.lastCommitted=null;
      this.legacy.delete(slotId);
    });
  }
}
