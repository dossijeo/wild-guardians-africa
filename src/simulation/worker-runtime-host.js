import {createSimulationAuthorityClient} from './simulation-authority-client.js';
import {createWorkerGameRuntime} from './worker-game-runtime.js';

// Experimental host: scheduling and admission live away from presentation.
// The simulation Worker remains the sole authority; this Worker never waits
// for the renderer to consume a publication.
let runtime=null,session=null,initializing=false,monitor=null;
self.onmessage=async({data})=>{
 try{
  if(data?.kind==='initialize'){
   if(initializing||runtime||typeof data.session!=='string'||!data.session)throw Error('Invalid runtime host initialization');
   initializing=true;session=data.session;const client=createSimulationAuthorityClient({...data.clientOptions,session});let sequence=0,lastElapsed=0;
   const world={createConfirmedReceiver(){const forward=message=>{if(message.session!==session||message.sequence!==sequence+1)throw Error('Host publication out of order');sequence=message.sequence;lastElapsed=message.elapsed;postMessage({kind:'publication',session,publication:message});return {accepted:true,sequence};};return {accept:forward,acceptUnchanged:forward,status:()=>({sequence,lastElapsed})};}};
   runtime=createWorkerGameRuntime({...data.runtimeOptions,client,world,session,onError:error=>postMessage({kind:'failure',session,message:String(error?.stack??error)})});
   const initial=await runtime.start();initializing=false;postMessage({kind:'started',session,initial,status:runtime.status()});monitor=setInterval(()=>postMessage({kind:'status',session,status:runtime.status()}),250);return;
  }
  if(data?.session!==session||!runtime)throw Error('Invalid runtime host session');
  if(data.kind==='dispose'){if(monitor!==null)clearInterval(monitor);runtime.dispose();runtime=null;close();return;}
  if(data.kind==='speed'){runtime.setNightFastForward(data.value);return;}
  if(data.kind==='command'){
   if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid host command id');
   try{const result=await runtime.submit(data.command);postMessage({kind:'commandResult',session,id:data.id,result});}
   catch(error){postMessage({kind:'commandFailure',session,id:data.id,message:String(error?.message??error)});}return;
  }
  throw Error('Unknown runtime host message');
 }catch(error){postMessage({kind:'failure',session:data?.session??session,message:String(error?.stack??error)});}
};
