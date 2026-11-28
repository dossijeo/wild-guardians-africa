import {createSimulation} from './mobility-worker-simulation-core.js';let simulation,paused=false;
try{simulation=await createSimulation({mangrove:true});postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=({data})=>{try{
 if(data.kind==='advance'){if(paused)throw Error('Paused');const flag=new Int32Array(data.signal),timings=[],start=performance.now();postMessage({kind:'started',id:data.id,at:performance.timeOrigin+start});let performed=0,interrupted=false;while(performed<data.steps){if(data.check&&Atomics.load(flag,0)){simulation.pause('diagnostic');paused=true;interrupted=true;break;}timings.push(simulation.advanceTick(.05));performed++;}postMessage({kind:'result',id:data.id,performed,interrupted,timings,workerMs:performance.now()-start,observedAt:performance.timeOrigin+performance.now(),state:simulation.state()});}
 else if(data.kind==='resume'){if(!paused)throw Error('Not paused');simulation.resume('diagnostic');paused=false;postMessage({kind:'resumed',id:data.id,state:simulation.state()});}
}catch(error){postMessage({kind:'error',id:data.id,error:String(error?.stack??error)});}};
