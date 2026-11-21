import {createSimulation} from './mobility-worker-simulation-core.js';
import {advanceReal} from '../../src/simulation/game.js';
let simulation,last=0;
try{simulation=await createSimulation({mangrove:true});postMessage({kind:'ready'});}catch(e){postMessage({kind:'error',message:String(e.stack??e)});}
onmessage=({data})=>{try{if(!simulation||data.sequence!==++last)throw Error('Out of order');const {game,nav}=simulation.diagnosticWorld(),start=performance.now();if(data.kind==='advance'){advanceReal(game,data.seconds,nav);nav.serviceRaidConnectivityDemand?.();}else if(data.kind==='pause')simulation.pause('diagnostic');else if(data.kind==='resume')simulation.resume('diagnostic');else throw Error('Unknown command');const workMs=performance.now()-start;postMessage({kind:'result',sequence:last,workMs,...simulation.state()});}catch(e){postMessage({kind:'error',message:String(e.stack??e)});}};
