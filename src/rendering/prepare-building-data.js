import {createNativeDestruction} from './destruction-native.js';
export function prepareBuildingDataAsync(building,input,{signal,workerAvailable=typeof Worker!=='undefined',createWorker=()=>new Worker(new URL('./building-data-worker.js',import.meta.url),{type:'module'})}={}){
 if(signal?.aborted)return Promise.reject(Error('Building preparation cancelled'));
 // Legacy fallback preserves functionality, but is explicitly synchronous.
 if(!workerAvailable)return Promise.resolve(createNativeDestruction(building,input));
 return new Promise((resolve,reject)=>{
  let worker;try{worker=createWorker();}catch(error){reject(error);return;}
  let settled=false;const finish=(error,data)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(data);};
  const abort=()=>finish(Error('Building preparation cancelled'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  worker.onmessage=event=>event.data.error?finish(Error(event.data.error)):finish(null,event.data);worker.onerror=event=>finish(Error(event.message??'Building worker failed'));
  try{const buffers=[...new Set(Object.values(input).filter(ArrayBuffer.isView).map(value=>value.buffer))];worker.postMessage({building,input},buffers);}catch(error){finish(error);}
 });
}
