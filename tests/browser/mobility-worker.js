import {createWorkload} from './mobility-worker-workload.js';
let workload;
try{workload=await createWorkload();postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 if(event.data?.kind!=='work'||!workload)return;
 const {id,duration}=event.data,startedEpoch=performance.timeOrigin+performance.now();postMessage({kind:'started',id,startedEpoch});
 try{const result=workload.execute(duration);postMessage({kind:'done',id,startedEpoch,finishedEpoch:performance.timeOrigin+performance.now(),...result});}
 catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
};
