import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation;
onmessage=async({data})=>{try{
 if(data.kind==='init'){const start=performance.now();simulation=await createSimulation({snapshotSource:data.source,chunkKeys:data.chunks});postMessage({kind:'ready',initializationMs:performance.now()-start});}
 else if(data.kind==='run'){
  if(data.damageCenter)simulation.damageCenter();
  const result=simulation.run(1,.05,{full:false}),projection=JSON.parse(result.projection),{game}=simulation.diagnosticWorld();
  projection.structures=game.structures.map(s=>({id:s.id,status:s.status,hp:s.hp,collapseRemaining:s.collapseRemaining}));
  postMessage({kind:'result',...result,projection:JSON.stringify(projection)});
 }else if(data.kind==='snapshot')postMessage({kind:'snapshot',snapshot:simulation.state().snapshot});
 else throw Error('Unknown request');
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
