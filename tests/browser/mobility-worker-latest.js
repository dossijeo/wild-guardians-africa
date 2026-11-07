import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation,latest=null,version=0,nextEvent=1,delivered=0,acknowledged=0,events=[];const session='latest-audit',capacity=1;
try{simulation=await createSimulation();postMessage({kind:'ready',session,capacity});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 const req=event.data;
 try{
  if(req.kind==='advance'){
   if(!Number.isInteger(req.steps)||req.steps<1||req.steps>100)throw Error('Invalid request');
   if(events.length>=capacity){postMessage({kind:'advanced',id:req.id,steps:0,version,pending:events.length,maxPending:events.length,saturated:true});return;}
   if(req.damageCenter)simulation.damageCenter();
   const started=performance.now();let steps=0,maxPending=events.length;
   while(steps<req.steps&&events.length<capacity){
    const projection=JSON.parse(simulation.run(1,.1,{full:false}).projection);
    for(const item of projection.events)events.push({sequence:nextEvent++,event:item});
    delete projection.events;latest={version:++version,projection};steps++;maxPending=Math.max(maxPending,events.length);
   }
   postMessage({kind:'advanced',id:req.id,steps,version,pending:events.length,maxPending,saturated:events.length>=capacity,workerElapsedMs:performance.now()-started});return;
  }
  if(req.kind==='poll'){
   if(events.length)delivered=events.at(-1).sequence;
   postMessage({kind:'state',id:req.id,session,latest,events,acknowledged,delivered});return;
  }
  if(req.kind==='ack'){
   const valid=req.session===session&&Number.isSafeInteger(req.sequence)&&req.sequence>=acknowledged&&req.sequence<=delivered;
   if(valid){acknowledged=req.sequence;events=events.filter(item=>item.sequence>acknowledged);}
   postMessage({kind:'ack-result',id:req.id,accepted:valid,pending:events.length});
  }
 }catch(error){postMessage({kind:'error',id:req?.id,error:String(error?.stack??error)});}
};
