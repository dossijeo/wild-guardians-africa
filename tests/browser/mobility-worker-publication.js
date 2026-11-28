import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation,inFlight=null,version=0;const session='publication-audit';
try{simulation=await createSimulation();postMessage({kind:'ready',session});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 const request=event.data;
 try{
  if(request?.kind==='ack'){
   const accepted=!!inFlight&&request.session===session&&request.version===inFlight.version;
   if(accepted)inFlight=null;
   postMessage({kind:'ack-result',id:request.id,accepted});return;
  }
  if(request?.kind!=='run'||!simulation)return;
  if(inFlight){postMessage({kind:'busy',id:request.id,version:inFlight.version,elapsed:inFlight.projection.elapsed});return;}
  if(request.damageCenter)simulation.damageCenter();
  const result=simulation.run(request.steps,request.dt,{full:false});
  inFlight={session,version:++version,projection:JSON.parse(result.projection)};
  postMessage({kind:'publication',id:request.id,...inFlight});
 }catch(error){postMessage({kind:'error',id:request?.id,error:String(error?.stack??error)});}
};
