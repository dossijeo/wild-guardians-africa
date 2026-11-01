import {createWorkload} from './mobility-worker-workload.js';
let workload,task=null;
try{workload=await createWorkload();postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 const req=event.data;
 try{
  if(req.kind==='start'){if(task)throw Error('Task already active');task=workload.task();postMessage({kind:'started',id:req.id});}
  else if(req.kind==='run'){if(!task)throw Error('Task missing');const start=performance.now(),result=task.run(req.count),elapsed=performance.now()-start;if(req.final)task=null;postMessage({kind:'result',id:req.id,elapsed,...result});}
 }catch(error){postMessage({kind:'error',id:req.id,error:String(error?.stack??error)});}
};
