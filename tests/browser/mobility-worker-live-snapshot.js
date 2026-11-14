import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation;
self.onmessage=async({data})=>{try{
 if(data.kind==='init'){if(simulation)throw Error('Already initialized');const start=performance.now();simulation=await createSimulation({snapshotSource:data.source,chunkKeys:data.chunks,motionTrace:data.motionTrace??false,segmentTrace:!!data.segmentTrace});postMessage({kind:'ready',initializationMs:performance.now()-start});}
 else if(data.kind==='run'){if(!simulation)throw Error('Not initialized');if(data.trace){if(!Number.isInteger(data.steps)||data.steps<1||data.steps>100)throw Error('Invalid trace');const trace=[],timings=[];let result;for(let i=0;i<data.steps;i++){result=simulation.run(1,.05,{full:i===data.steps-1});trace.push(JSON.parse(result.projection));timings.push(result.timings[0]);}postMessage({kind:'result',...result,timings,trace});}else{const result=simulation.run(data.steps,.05,{full:true});postMessage({kind:'result',...result});}}
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
