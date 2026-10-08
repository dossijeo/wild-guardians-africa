import {prepareSkyPixels} from './sky-pixels.js';
export function prepareSkyPixelsAsync(buffer,index,{signal,createWorker=()=>new Worker(new URL('./sky-pixels-worker.js',import.meta.url),{type:'module'}),workerAvailable=typeof Worker!=='undefined'}={}){
 if(signal?.aborted)return Promise.reject(new Error('Sky preparation cancelled'));
 // Compatibility fallback is explicitly synchronous. Modern web/Tauri targets
 // use Workers; this fallback is not claimed to deliver responsive decode.
 if(!workerAvailable)return Promise.resolve(prepareSkyPixels(buffer,index));
 return new Promise((resolve,reject)=>{
  let worker;try{worker=createWorker();}catch(error){reject(error);return;}
  let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(new Error('Sky preparation cancelled'));
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=event=>event.data.error?finish(new Error(event.data.error)):finish(null,event.data);
  worker.onerror=event=>finish(new Error(event.message??'Sky worker failed'));
  try{worker.postMessage({buffer,index},[buffer]);}catch(error){finish(error);}
 });
}
