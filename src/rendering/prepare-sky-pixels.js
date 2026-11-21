import {prepareSkyPixels} from './sky-pixels.js';
export function prepareSkyPixelsAsync(buffer,index,{signal,waterSlope=false,createWorker=()=>new Worker(new URL('./sky-pixels-worker.js',import.meta.url),{type:'module'}),workerAvailable=typeof Worker!=='undefined'}={}){
 if(typeof waterSlope!=='boolean')throw TypeError('Invalid sky water preparation');
 if(signal?.aborted)return Promise.reject(new Error('Sky preparation cancelled'));
 // Compatibility fallback is explicitly synchronous. Modern web/Tauri targets
 // use Workers; this fallback is not claimed to deliver responsive decode.
 if(!workerAvailable)return Promise.resolve(prepareSkyPixels(buffer,index,{waterSlope}));
 return new Promise((resolve,reject)=>{
  let worker;try{worker=createWorker();}catch(error){reject(error);return;}
  let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(new Error('Sky preparation cancelled'));
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  worker.onmessage=event=>{const data=event?.data;if(!data||typeof data!=='object'){finish(new Error('Invalid sky worker response'));return;}data.error?finish(new Error(data.error)):finish(null,data);};
  worker.onerror=event=>finish(new Error(event.message??'Sky worker failed'));
  worker.onmessageerror=()=>finish(new Error('Sky worker message could not be decoded'));
  try{worker.postMessage({buffer,index,...(waterSlope?{waterSlope:true}:{})},[buffer]);}catch(error){finish(error);}
 });
}
