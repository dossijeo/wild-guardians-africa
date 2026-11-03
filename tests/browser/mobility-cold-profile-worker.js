import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation;
self.onmessage=async({data})=>{
 try{
  if(data.kind==='init'){
   const at=performance.now();simulation=await createSimulation({mangrove:true,snapshotSource:data.snapshot,chunkKeys:data.chunks});
   postMessage({kind:'ready',initMs:performance.now()-at});return;
  }
  if(data.kind==='build'){
   if(!simulation)throw Error('Simulation not initialized');
   const {session}=simulation.diagnosticWorld(),rows=[];
   for(const species of ['hyena','lion','buffalo','rhino']){const at=performance.now(),revision=session.actorSectorRevision({worker:false,species});rows.push({species,ms:performance.now()-at,revision});}
   postMessage({kind:'built',rows});return;
  }
  if(data.kind==='tick'){
   if(!simulation)throw Error('Simulation not initialized');
   const at=performance.now(),result=simulation.run(data.steps,data.dt);
   postMessage({kind:'ticked',ms:performance.now()-at,...result});return;
  }
  if(data.kind==='damage-center'){
   if(!simulation)throw Error('Simulation not initialized');
   const at=performance.now();simulation.damageCenter();
   const center=simulation.diagnosticWorld().game.structures.find(s=>s.kind==='center');
   postMessage({kind:'damaged',ms:performance.now()-at,centerStatus:center?.status,hp:center?.hp});return;
  }
  throw Error('Unknown request');
 }catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
};
