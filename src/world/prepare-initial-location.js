import {findInitialLocationAsync} from './villages.js';
import {TerrainField} from './terrain.js';
export function prepareInitialLocation(nav,payload,{signal,workerAvailable=typeof Worker!=='undefined',createWorker=()=>new Worker(new URL('./initial-location-worker.js',import.meta.url),{type:'module'})}={}){
 if(signal?.aborted)return Promise.reject(Error('Initial location cancelled'));
 // Legacy cooperative search remains available; one candidate can still block.
 if(!workerAvailable)return findInitialLocationAsync(nav,payload);
 return new Promise((resolve,reject)=>{
  let worker;try{worker=createWorker();}catch(error){reject(error);return;}
  let settled=false;const finish=(error,data)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(data);};
  const abort=()=>finish(Error('Initial location cancelled'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  worker.onmessage=event=>{if(settled)return;if(event.data.error){finish(Error(event.data.error));return;}try{nav.config=event.data.config;nav.field=new TerrainField(nav.config);for(const key of ['chunks','walkCache','segmentCache','failedPaths','closedRegions','portalGraphs'])nav[key]?.clear();nav.searchedRegions=[];finish(null,event.data.site);}catch(error){finish(error);}};
  worker.onerror=event=>finish(Error(event.message??'Initial location worker failed'));
  try{worker.postMessage({config:nav.config,profile:nav.profile,payload});}catch(error){finish(error);}
 });
}
