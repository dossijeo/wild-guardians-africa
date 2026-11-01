import {createSimulation} from './mobility-worker-simulation-core.js';

const worker=new Worker(new URL('./mobility-worker-simulation.js',import.meta.url),{type:'module'}),pending=new Map();let error=null,id=0;
const workerReady=new Promise((resolve,reject)=>{
 worker.onerror=e=>{error=e.message;reject(Error(error));};
 worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve();else if(row.kind==='error'){error=row.error;reject(Error(error));for(const p of pending.values())p.reject(Error(error));pending.clear();}else if(row.kind==='result'){const p=pending.get(row.id);if(p){pending.delete(row.id);p.resolve(row);}}};
});
const percentile=(values,p)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
try{
 const [reference]=await Promise.all([createSimulation(),workerReady]);
 window.runSimulationWorkerAudit=async(full=true)=>{
  const batches=[],allMain=[],allWorker=[];
  for(let batch=0;batch<8;batch++){
   const request=performance.now(),result=new Promise((resolve,reject)=>pending.set(++id,{resolve,reject}));
   const damageCenter=batch===3;worker.postMessage({kind:'run',id,steps:10,dt:.1,damageCenter,full});if(damageCenter)reference.damageCenter();
   const main=reference.run(10,.1),mainDone=performance.now(),remote=await result,received=performance.now();
   if(full&&main.snapshot!==remote.snapshot)throw Error(`Simulation diverged in batch ${batch}`);
   if(main.projection!==remote.projection)throw Error(`Projection diverged in batch ${batch}`);
   allMain.push(...main.timings);allWorker.push(...remote.timings);
   const projected=JSON.parse(remote.projection),eventTypes=projected.events.map(e=>e.type);
   batches.push({batch,elapsed:main.elapsed,animals:main.animals,restored:main.restored,centerStatus:main.centerStatus,ruinedEvents:main.ruinedEvents,eventTypes,snapshotBytes:new TextEncoder().encode(main.snapshot).length,projectionBytes:new TextEncoder().encode(remote.projection).length,mainRunAndSerializeMs:mainDone-request,mainSerializationMs:main.serializationMs,workerTotalMs:remote.workerTotalMs,workerSerializationMs:remote.serializationMs,workerProjectionMs:remote.projectionMs,requestToReceiptMs:received-request});
  }
  const stats=a=>({p95:percentile(a,.95),p99:percentile(a,.99),max:Math.max(...a)});
  if(!batches.some(b=>b.centerStatus==='collapsing')||!batches.some(b=>b.centerStatus==='ruined'&&b.ruinedEvents>0&&b.eventTypes.includes('StructureRuined')))throw Error('Structural collapse was not observed');
  return {equal:true,fullSnapshotCompared:full,steps:allMain.length,mainTickMs:stats(allMain),workerTickMs:stats(allWorker),batches,scope:'Two sessions restored from one saved raid; selected fields and events compared every ten 0.1s ticks, including a scripted center collapse. Full mode also compares complete serialized snapshots. Both sessions run concurrently. Rendering, physics manager, input handling and production publication are not exercised.'};
 };
 window.simulationWorkerReady=true;document.querySelector('#status').textContent='Preparado';
}catch(e){window.simulationWorkerError=String(e?.stack??e);document.querySelector('#status').textContent=window.simulationWorkerError;}
