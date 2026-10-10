// Continuous private geometry iterator in ONE Worker. One owned first-yield
// notification permits entry delivery; all further scheduling is Worker-local.
export function createRaidWorkerGeometryScheduler({steps,computeEntry,cacheGeometry,getGeometry,post,now=()=>performance.now(),schedule=fn=>setTimeout(fn,0),maxSteps=128,maxMillis=2}){
 let geometry=null,disposed=false,scheduled=false,entryStreak=0;const entries=[];
 const reply=(job,extra)=>post({kind:'raid-preparation-reply',job:job.job,jobKind:job.jobKind,owner:job.owner,...extra});
 const histogram=()=>({le0_1:0,le0_5:0,le2:0,le10:0,gt10:0});
 const record=(hist,ms)=>{hist[ms<=.1?'le0_1':ms<=.5?'le0_5':ms<=2?'le2':ms<=10?'le10':'gt10']++;};
 function close(){const old=geometry;geometry=null;if(old){old.cancelled=true;old.iterator.return?.();}}
 function ensure(){if(disposed||scheduled||(!geometry&&!entries.length))return;scheduled=true;schedule(run);}
 function advance(job){
  if(disposed||job!==geometry||job.cancelled)return;
  const started=now();let count=0;
  try{
   while(count<maxSteps&&now()-started<maxMillis){
    const before=now(),next=job.iterator.next(),ms=now()-before;job.computeMs+=ms;job.metrics.steps++;job.metrics.maxStepMs=Math.max(job.metrics.maxStepMs,ms);record(job.metrics.stepHistogram,ms);count++;
    if(next.done){const sliceMs=now()-started;job.metrics.slices++;job.metrics.sliceCpuMs+=sliceMs;job.metrics.maxSliceMs=Math.max(job.metrics.maxSliceMs,sliceMs);record(job.metrics.sliceHistogram,sliceMs);cacheGeometry(job.request.key,next.value.geometry);geometry=null;reply(job,{result:next.value,computeMs:job.computeMs,geometryMetrics:job.metrics});return;}
   }
   const sliceMs=now()-started;job.metrics.slices++;job.metrics.sliceCpuMs+=sliceMs;job.metrics.maxSliceMs=Math.max(job.metrics.maxSliceMs,sliceMs);record(job.metrics.sliceHistogram,sliceMs);
   if(!job.announced){job.announced=true;post({kind:'raid-geometry-suspended',job:job.job,owner:job.owner,token:job.request.token,key:job.request.key,slice:1});}
  }catch(error){close();reply(job,{error:String(error),computeMs:job.computeMs,geometryMetrics:job.metrics});}
 }
 function run(){
  scheduled=false;if(disposed)return;
  if(entries.length&&(entryStreak<2||!geometry)){
   const data=entries.shift(),started=now();entryStreak++;
   try{const preparedGeometry=getGeometry(data.request.geometryKey),result=computeEntry(data.request,{preparedGeometry});reply(data,{result,geometryReused:!!preparedGeometry,workerQueueWaitMs:started-data.receivedAt,computeMs:now()-started});}
   catch(error){reply(data,{error:String(error),workerQueueWaitMs:started-data.receivedAt,computeMs:now()-started});}
  }else if(geometry){entryStreak=0;advance(geometry);}
  ensure();
 }
 return {
  handle(data){
   if(disposed)return;
   if(data.kind==='raid-geometry-cancel'){if(geometry?.job===data.job&&geometry.owner===data.owner)close();return;}
   if(data.kind!=='raid-preparation-job')return false;
   if(!Number.isSafeInteger(data.job)||!['entry','geometry'].includes(data.jobKind)||data.request?.owner!==data.owner){reply(data,{error:'Invalid shared raid job',computeMs:0});return true;}
   if(data.jobKind==='geometry'){
    if(geometry){reply(data,{error:'Geometry job already owned',computeMs:0});return true;}
    geometry={...data,iterator:steps(data.request),computeMs:0,announced:false,cancelled:false,metrics:{steps:0,slices:0,maxStepMs:0,maxSliceMs:0,sliceCpuMs:0,stepHistogram:histogram(),sliceHistogram:histogram()}};
   }else{
    if(entries.length){reply(data,{error:'Entry queue already owned',computeMs:0});return true;}
    entries.push({...data,receivedAt:now()});
   }
   ensure();return true;
  },
  dispose(){disposed=true;close();entries.length=0;},
 };
}
