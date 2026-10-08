import {prepareBiomeTangents} from './biome-tangents.js';
export function prepareBiomeTangentsAsync(buffer,assets,{signal,workerAvailable=typeof Worker!=='undefined',createWorker=()=>new Worker(new URL('./biome-tangents-worker.js',import.meta.url),{type:'module'})}={}){
 if(signal?.aborted)return Promise.reject(Error('Biome preparation cancelled'));
 if(!workerAvailable)return Promise.resolve(prepareBiomeTangents(buffer,assets));
 return new Promise((resolve,reject)=>{
  let worker;try{worker=createWorker();}catch(error){reject(error);return;}
  let settled=false;const finish=(error,data)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(data);};
  const abort=()=>finish(Error('Biome preparation cancelled'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  worker.onmessage=event=>event.data.error?finish(Error(event.data.error)):finish(null,event.data.tangents);worker.onerror=event=>finish(Error(event.message??'Biome worker failed'));
  // Preserve packed original vertex/index storage; only this disposable copy moves.
  try{const copied=buffer.slice(0);worker.postMessage({buffer:copied,assets},[copied]);}catch(error){finish(error);}
 });
}
