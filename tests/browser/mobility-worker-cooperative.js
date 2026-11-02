import {createSimulation} from './mobility-worker-simulation-core.js';
const session='cooperative-test',channel=new MessageChannel();let simulation,active=null,sequence=0,paused=false;
try{simulation=await createSimulation({mangrove:true});postMessage({kind:'ready',session});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
function finish(interrupted){const job=active;active=null;postMessage({kind:'advance-result',request:job.request,performed:job.performed,interrupted,workerMs:performance.now()-job.started,timings:job.timings,state:simulation.state()});if(job.pause){simulation.pause('diagnostic');paused=true;postMessage({kind:'pause-result',request:job.pause.request,state:simulation.state()});}}
function step(){try{if(!active)return;if(active.pause){finish(true);return;}active.timings.push(simulation.advanceTick(.05));active.performed++;if(active.performed===active.steps){finish(false);return;}channel.port2.postMessage(0);}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});active=null;}}
channel.port1.onmessage=step;
self.onmessage=({data})=>{try{
 if(!simulation||data.session!==session||!Number.isSafeInteger(data.sequence)||data.sequence!==sequence+1)throw Error('Invalid session or sequence');
 if(data.action==='advance'){
  if(paused){postMessage({kind:'rejected',request:data.request,reason:'paused'});return;}
  if(active||!['sync','cooperative'].includes(data.mode)||!Number.isInteger(data.steps)||data.steps<1||data.steps>100)throw Error('Invalid advance');sequence=data.sequence;active={request:data.request,steps:data.steps,performed:0,timings:[],started:performance.now(),pause:null};postMessage({kind:'started',request:data.request});
  if(data.mode==='sync'){while(active&&active.performed<active.steps){active.timings.push(simulation.advanceTick(.05));active.performed++;}finish(false);}else step();
 }else if(data.action==='pause'){
  if(paused||active?.pause)throw Error('Pause already queued');sequence=data.sequence;if(active){active.pause={request:data.request};}else{simulation.pause('diagnostic');paused=true;postMessage({kind:'pause-result',request:data.request,state:simulation.state()});}
 }else if(data.action==='resume'){
  if(active||!paused)throw Error('Cannot resume');sequence=data.sequence;simulation.resume('diagnostic');paused=false;postMessage({kind:'resume-result',request:data.request,state:simulation.state()});
 }else throw Error('Unknown command');
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
