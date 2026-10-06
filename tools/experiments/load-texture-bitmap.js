export function loadTextureBitmap(url,options,{signal,workerFactory=()=>new Worker(new URL('./texture-image-bitmap-worker.js',import.meta.url),{type:'module'})}={}){
 return new Promise((resolve,reject)=>{
  let worker,settled=false;
  const finish=(error,bitmap)=>{
   if(settled){bitmap?.close();return;}settled=true;signal?.removeEventListener('abort',abort);
   if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();}
   if(error){bitmap?.close();reject(error);}else resolve(bitmap);
  };
  const abort=()=>finish(new DOMException('Bitmap load aborted','AbortError'));
  if(signal?.aborted){abort();return;}
  try{
   worker=workerFactory();worker.onmessage=({data})=>finish(data.error?Error(data.error):null,data.bitmap);
   worker.onerror=event=>finish(Error(event.message||'Bitmap worker failed'));worker.onmessageerror=()=>finish(Error('Bitmap worker message failed'));
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}worker.postMessage({url,options});
  }catch(error){finish(error);}
 });
}
