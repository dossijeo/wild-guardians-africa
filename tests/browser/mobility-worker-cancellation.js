import {createWorkload} from './mobility-worker-workload.js';
let workload,active=null,nextRun=null;const channel=new MessageChannel();channel.port1.onmessage=()=>{const callback=nextRun;nextRun=null;callback?.();};
try{workload=await createWorkload();postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 const req=event.data;
 if(req.kind==='cancel'){
  const accepted=!!active&&active.id===req.id;
  if(accepted)active.cancelled=true;
  postMessage({kind:'cancel-result',id:req.id,accepted,at:performance.timeOrigin+performance.now()});return;
 }
 if(req.kind!=='run'||!workload)return;
 if(active){postMessage({kind:'error',id:req.id,error:'Worker busy'});return;}
 const job=active={id:req.id,cancelled:false},task=workload.task(),start=performance.now();
 postMessage({kind:'started',id:req.id,at:performance.timeOrigin+start});
 const run=()=>{
  try{
   if(job.cancelled){active=null;postMessage({kind:'done',id:req.id,status:'cancelled',at:performance.timeOrigin+performance.now(),queries:job.queries??0});return;}
   const count=req.mode==='single'?req.count:Math.min(req.quantum,req.count-(job.queries??0)),result=task.run(count);job.queries=result.queries;
   if(result.queries===req.count){active=null;postMessage({kind:'done',id:req.id,status:'completed',at:performance.timeOrigin+performance.now(),elapsed:performance.now()-start,...result});return;}
   if(req.mode==='channel'){nextRun=run;channel.port2.postMessage(0);}else setTimeout(run,0);
  }catch(error){active=null;postMessage({kind:'error',id:req.id,error:String(error?.stack??error)});}
 };
 run();
};
