// Experimental serial decoder: keeps one worker warm, never decodes multiple
// textures concurrently. Callers own successful bitmaps; the pool owns workers.
export class TextureBitmapWorkerPool {
 constructor({workerFactory=()=>new Worker(new URL('./texture-image-bitmap-worker.js',import.meta.url),{type:'module'})}={}){
  this.workerFactory=workerFactory;this.worker=null;this.current=null;this.queue=[];this.disposed=false;
 }
 load(url,options,{signal,onTiming}={}){
  return new Promise((resolve,reject)=>{
   if(this.disposed){reject(Error('Bitmap pool disposed'));return;}
   if(signal?.aborted){reject(new DOMException('Bitmap load aborted','AbortError'));return;}
   const request={url,options,signal,onTiming,resolve,reject,beginEpochMs:performance.timeOrigin+performance.now()};
   request.abort=()=>{
    if(this.current===request){this.stopWorker();this.complete(request,new DOMException('Bitmap load aborted','AbortError'));}
    else {const index=this.queue.indexOf(request);if(index<0)return;this.queue.splice(index,1);signal.removeEventListener('abort',request.abort);reject(new DOMException('Bitmap load aborted','AbortError'));}
   };
   signal?.addEventListener('abort',request.abort,{once:true});this.queue.push(request);this.pump();
  });
 }
 stopWorker(){const worker=this.worker;this.worker=null;if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();}}
 complete(request,error,bitmap){
  if(this.current!==request){bitmap?.close();return;}
  this.current=null;request.signal?.removeEventListener('abort',request.abort);
  if(error){bitmap?.close();request.reject(error);}else request.resolve(bitmap);
  this.pump();
 }
 pump(){
  if(this.disposed||this.current||!this.queue.length)return;
  const request=this.current=this.queue.shift();
  try{
   if(!this.worker){
    const worker=this.worker=this.workerFactory();
    worker.onmessage=({data})=>{
     if(this.worker!==worker||!this.current){data.bitmap?.close();return;}
     const active=this.current;
     try{
      if(data.error)throw Error(data.error);if(!data.bitmap)throw Error('Bitmap worker returned no image');
      if(data.timing&&active.onTiming){const receivedEpochMs=performance.timeOrigin+performance.now();active.onTiming({...data.timing,startupAndDispatchMs:data.timing.receivedEpochMs-active.beginEpochMs,transferAndDeliveryMs:receivedEpochMs-data.timing.postEpochMs,totalMs:receivedEpochMs-active.beginEpochMs});}
      this.complete(active,null,data.bitmap);
     }catch(error){this.complete(active,error,data.bitmap);}
    };
    const fail=error=>{if(this.worker!==worker)return;const active=this.current;this.stopWorker();if(active)this.complete(active,error);};
    worker.onerror=event=>fail(Error(event.message||'Bitmap worker failed'));worker.onmessageerror=()=>fail(Error('Bitmap worker message failed'));
   }
   this.worker.postMessage({url:request.url,options:request.options});
  }catch(error){this.stopWorker();this.complete(request,error);}
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.stopWorker();
  if(this.current)this.complete(this.current,Error('Bitmap pool disposed'));
  for(const request of this.queue.splice(0)){request.signal?.removeEventListener('abort',request.abort);request.reject(Error('Bitmap pool disposed'));}
 }
}
