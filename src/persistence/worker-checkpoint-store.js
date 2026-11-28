import {BrowserSaveRepository} from './browser-saves.js';
import {workerCheckpointPolicy} from './worker-save.js';
import {prepareWorkerCheckpoint} from './prepare-worker-checkpoint.js';

// The Worker owns validation, JSON work and the IndexedDB transaction. Legacy
// copies are read by the caller because localStorage is unavailable here.
self.onmessage=async({data})=>{
 try{
  if(data?.kind!=='save' || typeof data.slotId!=='string'||!data.slotId||typeof data.databaseName!=='string'||!data.databaseName||!self.indexedDB)throw TypeError('Invalid worker checkpoint store request');
  const policy=workerCheckpointPolicy(data.policy),prepared=prepareWorkerCheckpoint(data.checkpoint,{slotId:data.slotId,policy,savedAt:data.savedAt});
  if(!prepared.saved){self.postMessage({kind:'result',result:prepared});return;}
  const key=`wild-guardians:slot:${data.slotId}`,values=new Map();if(typeof data.legacyPrimary==='string')values.set(key,data.legacyPrimary);if(typeof data.legacyBackup==='string')values.set(key+':backup',data.legacyBackup);
  const storage={getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,value),removeItem:name=>values.delete(name)};
  const repository=new BrowserSaveRepository(storage,{database:self.indexedDB,name:data.databaseName});await repository.save(prepared.state);
  self.postMessage({kind:'result',result:{saved:true,sequence:prepared.sequence,elapsed:prepared.elapsed}});
 }catch(error){self.postMessage({kind:'error',message:String(error?.message??error)});}
};
