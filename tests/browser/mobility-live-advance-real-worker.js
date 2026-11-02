import {createSimulation} from './mobility-worker-simulation-core.js';
import {advanceReal} from '../../src/simulation/game.js';
let simulation;
onmessage=async({data})=>{try{
 if(data.kind==='init'){const at=performance.now();simulation=await createSimulation({snapshotSource:data.source,chunkKeys:data.chunks});postMessage({kind:'ready',initializationMs:performance.now()-at});}
 else if(data.kind==='advance'){const {game,nav}=simulation.diagnosticWorld(),at=performance.now();advanceReal(game,data.seconds,nav);nav.serviceRaidConnectivityDemand?.();const workMs=performance.now()-at;postMessage({kind:'result',workMs,...simulation.state()});}
 else throw Error('Unknown command');
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
