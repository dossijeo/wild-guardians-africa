import {createSimulation} from './mobility-worker-simulation-core.js';
const session='commands-test';let sequence=0,simulation;
try{simulation=await createSimulation({mangrove:true});postMessage({kind:'ready',session,initialElapsed:simulation.state().elapsed});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=({data})=>{
 try{
  if(!simulation)throw Error('Unavailable');
  if(data.session!==session||!Number.isSafeInteger(data.sequence)||data.sequence!==sequence+1){postMessage({kind:'rejected',request:data.request,sequence,reason:data.session!==session?'session':'sequence'});return;}
  if(!['advance','pause','resume','read'].includes(data.action))throw Error('Unknown action');
  if(data.action==='advance'&&(!Number.isInteger(data.steps)||data.steps<1||data.steps>100))throw Error('Invalid steps');
  sequence=data.sequence;let result=null;
  if(data.action==='advance'){postMessage({kind:'started',request:data.request,sequence});result=simulation.run(data.steps,.05,{full:false});}
  else if(data.action==='pause')simulation.pause('diagnostic');else if(data.action==='resume')simulation.resume('diagnostic');
  postMessage({kind:'ack',request:data.request,sequence,action:data.action,state:simulation.state(),timings:result?.timings??[]});
 }catch(error){postMessage({kind:'error',request:data?.request,error:String(error?.stack??error)});}
};
