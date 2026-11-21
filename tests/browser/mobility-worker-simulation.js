import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation;
try{simulation=await createSimulation({mangrove:new URL(self.location.href).searchParams.has('mangrove')});postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 if(event.data?.kind!=='run'||!simulation)return;
 try{const started=performance.now();if(event.data.damageCenter)simulation.damageCenter();const result=simulation.run(event.data.steps,event.data.dt,{full:event.data.full!==false});postMessage({kind:'result',id:event.data.id,...result,workerTotalMs:performance.now()-started});}
 catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
};
