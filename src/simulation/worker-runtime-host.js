import {createSimulationAuthorityClient} from './simulation-authority-client.js';
import {createWorkerGameRuntime} from './worker-game-runtime.js';
import {createHostPublicationQueue} from './host-publication-queue.js';

// Experimental host: scheduling and admission live away from presentation.
// The simulation Worker remains the sole authority; this Worker never waits
// for the renderer to consume a publication.
let runtime=null,session=null,initializing=false,monitor=null,sequence=0,acknowledged=0,peakBacklog=0,measureBacklog=false,outbox=null;
self.onmessage=async({data})=>{
 try{
  if(data?.kind==='initialize'){
   if(initializing||runtime||typeof data.session!=='string'||!data.session)throw Error('Invalid runtime host initialization');
   initializing=true;session=data.session;measureBacklog=data.runtimeOptions?.diagnostics===true;if(data.runtimeOptions?.coalescePublications===true)outbox=createHostPublicationQueue({session,send:message=>postMessage(message),maxBatchPublications:data.runtimeOptions?.publicationBatchSize??1});const client=createSimulationAuthorityClient({...data.clientOptions,session});let lastElapsed=0;
   const world={createConfirmedReceiver(){const forward=(message,meta)=>{if(message.session!==session||message.sequence!==sequence+1)throw Error('Host publication out of order');sequence=message.sequence;lastElapsed=message.elapsed;if(measureBacklog)peakBacklog=Math.max(peakBacklog,sequence-acknowledged);if(outbox)outbox.publication(message,meta?.kind==='advance');else postMessage({kind:'publication',session,publication:message});return {accepted:true,sequence};};return {accept:forward,acceptUnchanged:forward,status:()=>({sequence,lastElapsed})};}};
   runtime=createWorkerGameRuntime({...data.runtimeOptions,client,world,session,onError:error=>postMessage({kind:'failure',session,message:String(error?.stack??error)})});
   const initial=await runtime.start();initializing=false;if(outbox)outbox.message({kind:'started',sequence:initial.sequence,status:runtime.status()});else postMessage({kind:'started',session,sequence:initial.sequence,status:runtime.status()});monitor=setInterval(()=>postMessage({kind:'status',session,status:{...runtime.status(),...(outbox?{outbox:outbox.status()}:{}),...(measureBacklog?{publicationBacklog:sequence-acknowledged,peakPublicationBacklog:peakBacklog}:{})}}),250);return;
  }
  if(data?.session!==session||!runtime)throw Error('Invalid runtime host session');
  if(data.kind==='dispose'){if(monitor!==null)clearInterval(monitor);runtime.dispose();runtime=null;close();return;}
  if(data.kind==='publicationAck'){if(outbox){outbox.ack(data.sequence);acknowledged=data.sequence;return;}if(!measureBacklog||!Number.isSafeInteger(data.sequence)||data.sequence<=acknowledged||data.sequence>sequence)throw Error('Invalid publication acknowledgement');acknowledged=data.sequence;return;}
  if(data.kind==='speed'){runtime.setNightFastForward(data.value);return;}
  if(data.kind==='command'){
   if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid host command id');
   try{const result=await runtime.submit(data.command);if(outbox)outbox.message({kind:'commandResult',id:data.id,sequence:result.sequence});else postMessage({kind:'commandResult',session,id:data.id,sequence:result.sequence});}
   catch(error){const message={kind:'commandFailure',id:data.id,message:String(error?.message??error)};if(outbox)outbox.message(message);else postMessage({...message,session});}return;
  }
  throw Error('Unknown runtime host message');
 }catch(error){postMessage({kind:'failure',session:data?.session??session,message:String(error?.stack??error)});}
};
