// One in-flight request and at most one queued request per chunk. Results are
// proposals: consumers must additionally validate terrain and occupancy.
export function createGrassGenerationQueue(worker) {
 if(!worker || typeof worker.postMessage!=='function' || typeof worker.addEventListener!=='function' || typeof worker.terminate!=='function') throw new TypeError('Invalid grass worker');
 let closed=false,nextId=0,active=null;const queued=new Map();
 function pump(){
  if(closed||active||!queued.size)return;
  const [key,job]=queued.entries().next().value;queued.delete(key);active=job;
  try {worker.postMessage({id:job.id,request:job.request});} catch(error){active=null;job.reject(error);pump();}
 }
 function onMessage({data}){
  if(!active||data?.id!==active.id)return;
  const job=active;active=null;
  if(!job.stale){if(data.error)job.reject(new Error(data.error));else job.resolve(data.result);}
  pump();
 }
 function onError(event){
  if(closed)return;const error=event.error??new Error(event.message??'Grass generation worker failed');
  closed=true;if(active&&!active.stale)active.reject(error);active=null;
  for(const job of queued.values())job.reject(error);queued.clear();worker.terminate();
 }
 worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);worker.addEventListener('messageerror',onError);
 return {
  submit(key,request){
   if(closed)return Promise.reject(new Error('Grass generation queue closed'));
   const snapshot=structuredClone(request),id=++nextId;
   return new Promise((resolve,reject)=>{
    if(active?.key===key&&!active.stale){active.stale=true;active.resolve(null);}
    const prior=queued.get(key);if(prior)prior.resolve(null);
    queued.set(key,{id,key,request:snapshot,resolve,reject,stale:false});pump();
   });
  },
  cancel(key){if(active?.key===key&&!active.stale){active.stale=true;active.resolve(null);}const job=queued.get(key);if(job){queued.delete(key);job.resolve(null);}},
  dispose(){if(closed)return;closed=true;if(active&&!active.stale)active.resolve(null);active=null;for(const job of queued.values())job.resolve(null);queued.clear();worker.terminate();},
  status(){return {closed,active:active?1:0,queued:queued.size};}
 };
}
