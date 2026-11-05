// One-shot initialization has no ownership after completion. Cancellation
// terminates native work; late messages can never adopt a cancelled world.
function requestBootstrap(message,{signal,workerFactory},validate){
 if(typeof workerFactory!=='function')return Promise.reject(TypeError('Invalid fresh worker request'));
 if(signal?.aborted)return Promise.reject(new DOMException('Wild Engine cancelled','AbortError'));
 return new Promise((resolve,reject)=>{let worker,settled=false;const finish=(fn,value)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker?.terminate();fn(value);},abort=()=>finish(reject,new DOMException('Wild Engine cancelled','AbortError'));
  try{worker=workerFactory();worker.onmessage=({data})=>{if(data?.kind==='result'&&validate(data.result))finish(resolve,data.result);else finish(reject,Error(data?.message??'Invalid fresh worker response'));};worker.onerror=event=>finish(reject,Error(event.message||'Fresh world worker failed'));worker.onmessageerror=()=>finish(reject,Error('Fresh world worker transfer failed'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}worker.postMessage(message);}catch(error){finish(reject,error);}
 });
}
const createWorker=()=>new Worker(new URL('./fresh-worker-bootstrap-worker.js',import.meta.url),{type:'module'});
export function prepareFreshWorkerBootstrapInWorker(snapshot,payload,{quality='media',signal,workerFactory=createWorker}={}){
 if(typeof snapshot!=='string'||!payload||typeof quality!=='string')return Promise.reject(TypeError('Invalid fresh worker request'));
 const validPose=point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite);
 return requestBootstrap({snapshot,payload,quality},{signal,workerFactory},result=>typeof result?.initial?.snapshot==='string'&&Array.isArray(result.initial.chunkKeys)&&result.initial.navigationView&&validPose(result.pose?.eye)&&validPose(result.pose?.target));
}
export function repairSavedVillageFootprintsInWorker(snapshot,catalog,{signal,workerFactory=createWorker}={}){
 if(typeof snapshot!=='string'||!Array.isArray(catalog))return Promise.reject(TypeError('Invalid saved village request'));
 return requestBootstrap({kind:'repair-footprints',snapshot,catalog},{signal,workerFactory},result=>typeof result?.snapshot==='string');
}
