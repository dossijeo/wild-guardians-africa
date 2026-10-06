// One bounded experimental request. Termination also cancels synchronous worker
// computation; no stale arrays are attached after disposal or a late message.
export function loadFarSceneData(request,{signal,workerFactory=()=>new Worker(new URL('./far-scene-worker.js',import.meta.url),{type:'module'})}={}){
 return new Promise((resolve,reject)=>{
  const abortError=()=>new DOMException('Far scene load aborted','AbortError');
  if(signal?.aborted){reject(abortError());return;}
  let worker,settled=false;
  const finish=(error,value)=>{
   if(settled)return;settled=true;
   signal?.removeEventListener('abort',abort);
   if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();}
   if(error)reject(error);else resolve(value);
  };
  const abort=()=>finish(abortError());
  try{
   worker=workerFactory();
   worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data);
   worker.onerror=event=>finish(new Error(event.message||'Far scene worker failed'));
   worker.onmessageerror=()=>finish(new Error('Far scene worker message failed'));
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted){abort();return;}
   worker.postMessage(request);
  }catch(error){finish(error);}
 });
}
