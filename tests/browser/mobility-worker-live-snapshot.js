import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation;
self.onmessage=async({data})=>{try{
 if(data.kind==='init'){if(simulation)throw Error('Already initialized');const start=performance.now();simulation=await createSimulation({snapshotSource:data.source,chunkKeys:data.chunks});postMessage({kind:'ready',initializationMs:performance.now()-start});}
 else if(data.kind==='run'){if(!simulation)throw Error('Not initialized');const result=simulation.run(data.steps,.05,{full:true});postMessage({kind:'result',...result});}
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
