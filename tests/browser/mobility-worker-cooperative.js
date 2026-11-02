import {createSimulation} from './mobility-worker-simulation-core.js';
const session='cooperative-test',channel=new MessageChannel();let simulation,active=null,sequence=0;
try{simulation=await createSimulation({mangrove:true});postMessage({kind:'ready',session});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
function finish(interrupted){const job=active;active=null;postMessage({kind:'advance-result',request:job.request,performed:job.performed,interrupted,workerMs:performance.now()-job.started,timings:job.timings,state:simulation.state()});if(job.pause){simulation.pause('diagnostic');postMessage({kind:'pause-result',request:job.pause.request,state:simulation.state()});}}
function step(){try{if(!active)return;if(active.pause){finish(true);return;}active.timings.push(simulation.advanceTick(.05));active.performed++;if(active.performed===active.steps){finish(false);return;}channel.port2.postMessage(0);}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});active=null;}}
channel.port1.onmessage=step;
self.onmessage=({data})=>{try{
 if(!simulation||data.session!==session||!Number.isSafeInteger(data.sequence)||data.sequence!==sequence+1)throw Error('Invalid session or sequence');
 if(data.action==='advance'){
  if(active||!['sync','cooperative'].includes(data.mode)||!Number.isInteger(data.steps)||data.steps<1||data.steps>100)throw Error('Invalid advance');sequence=data.sequence;active={request:data.request,steps:data.steps,performed:0,timings:[],started:performance.now(),pause:null};postMessage({kind:'started',request:data.request});
  if(data.mode==='sync'){while(active&&active.performed<active.steps){active.timings.push(simulation.advanceTick(.05));active.performed++;}finish(false);}else step();
 }else if(data.action==='pause'){
  sequence=data.sequence;if(active){if(active.pause)throw Error('Pause already queued');active.pause={request:data.request};}else{simulation.pause('diagnostic');postMessage({kind:'pause-result',request:data.request,state:simulation.state()});}
 }else throw Error('Unknown command');
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
