// Worker-private continuous geometry iterator. A suspension is scheduling
// permission only; no partial geometry/result/cache is exposed.
export function createRaidWorkerGeometryScheduler({steps,computeEntry,cacheGeometry,getGeometry,post,now=()=>performance.now(),schedule=fn=>setTimeout(fn,0),maxSteps=128,maxMillis=2}){
 let geometry=null,disposed=false;
 const reply=(job,extra)=>post({kind:'raid-preparation-reply',job:job.job,jobKind:job.jobKind,owner:job.owner,...extra});
 function close(){const old=geometry;geometry=null;if(old){old.cancelled=true;old.iterator.return?.();}}
 function advance(job){
  if(disposed||job!==geometry||job.cancelled)return;
  const started=now();let count=0;
  try{
   while(count<maxSteps&&now()-started<maxMillis){
    const before=now(),next=job.iterator.next(),ms=now()-before;job.computeMs+=ms;job.metrics.steps++;job.metrics.maxStepMs=Math.max(job.metrics.maxStepMs,ms);job.metrics.stepSamples.push({phase:job.phase,ms});count++;
    if(next.done){job.metrics.sliceSamples.push({steps:count,ms:now()-started});job.metrics.slices++;job.metrics.maxSliceMs=Math.max(job.metrics.maxSliceMs,now()-started);cacheGeometry(job.request.key,next.value.geometry);geometry=null;reply(job,{result:next.value,computeMs:job.computeMs,geometryMetrics:job.metrics});return;}
    job.phase=next.value?.phase??'unknown';
   }
   const ms=now()-started;job.metrics.sliceSamples.push({steps:count,ms});job.metrics.slices++;job.metrics.maxSliceMs=Math.max(job.metrics.maxSliceMs,ms);job.slice++;
   job.waiting=true;post({kind:'raid-geometry-suspended',job:job.job,owner:job.owner,token:job.request.token,key:job.request.key,slice:job.slice});
  }catch(error){close();reply(job,{error:String(error),computeMs:job.computeMs,geometryMetrics:job.metrics});}
 }
 return {
  handle(data){
   if(disposed)return;
   if(data.kind==='raid-geometry-cancel'){if(geometry?.job===data.job&&geometry.owner===data.owner)close();return;}
   if(data.kind==='raid-geometry-resume'){
    const job=geometry;if(!job||job.job!==data.job||job.owner!==data.owner||!job.waiting||job.slice!==data.slice)return;
    job.waiting=false;schedule(()=>advance(job));return;
   }
   if(data.kind!=='raid-preparation-job')return false;
   if(!Number.isSafeInteger(data.job)||!['entry','geometry'].includes(data.jobKind)||data.request?.owner!==data.owner){reply(data,{error:'Invalid shared raid job',computeMs:0});return true;}
   if(data.jobKind==='geometry'){
    if(geometry){reply(data,{error:'Geometry job already owned',computeMs:0});return true;}
    const job={...data,iterator:steps(data.request),phase:'geometry-first-yield',slice:0,computeMs:0,waiting:false,cancelled:false,metrics:{steps:0,slices:0,maxStepMs:0,maxSliceMs:0,stepSamples:[],sliceSamples:[]}};geometry=job;schedule(()=>advance(job));return true;
   }
   const started=now();try{const preparedGeometry=getGeometry(data.request.geometryKey),result=computeEntry(data.request,{preparedGeometry});reply(data,{result,geometryReused:!!preparedGeometry,computeMs:now()-started});}
   catch(error){reply(data,{error:String(error),computeMs:now()-started});}return true;
  },
  dispose(){disposed=true;close();},
 };
}
