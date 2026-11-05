import {createSimulationAuthorityClient} from './simulation-authority-client.js';
import {createWorkerGameRuntime} from './worker-game-runtime.js';
import {createHostPublicationQueue} from './host-publication-queue.js';
import {openVisualStream} from './visual-publication-stream.js';
import {createPresentationRecoveryJournal,assertPresentationRecoveryBoundary,shouldRenewPresentationCheckpoint} from './presentation-recovery-journal.js';
import {createPresentationRecoveryReplay} from './presentation-recovery-replay.js';

// Experimental host: scheduling and admission live away from presentation.
// The simulation Worker remains the sole authority; this Worker never waits
// for the renderer to consume a publication.
let runtime=null,session=null,initializing=false,monitor=null,sequence=0,acknowledged=0,peakBacklog=0,measureBacklog=false,outbox=null,visualStream=null,recoveryBase=null,recoveryJournal=null,authorityClient=null,recoveryFrozen=false,recoveryReplay=null,concurrentRecovery=false,workRecovery=false,recoveryAttachStarted=false,recoverySwitching=false,recoveryFault=null,recoveryTimer=null;const foldedViews=new Map();
self.onmessage=async({data})=>{
 try{
  if(data?.kind==='initialize'){
   if(initializing||runtime||typeof data.session!=='string'||!data.session)throw Error('Invalid runtime host initialization');
   initializing=true;session=data.session;measureBacklog=data.runtimeOptions?.diagnostics===true;workRecovery=import.meta.env.DEV&&data.runtimeOptions?.qaVisualWorkRecovery===true&&data.runtimeOptions?.qaVisualRecovery===true;concurrentRecovery=import.meta.env.DEV&&data.runtimeOptions?.qaVisualRecoveryConcurrent===true&&data.runtimeOptions?.qaVisualRecovery===true;if(data.runtimeOptions?.coalescePublications===true)outbox=createHostPublicationQueue({session,diagnostics:measureBacklog,foldViews:data.runtimeOptions?.foldViews===true,send:message=>postMessage(message)});if(data.runtimeOptions?.qaVisualRecovery===true)recoveryJournal=createPresentationRecoveryJournal({compactTicks:!workRecovery&&data.runtimeOptions?.qaVisualRecoveryCompact===true});if(data.presentationPort)visualStream=openVisualStream(data.presentationPort,session,()=>runtime?.resumeDispatch(),{diagnostics:measureBacklog,workRecovery,...(data.runtimeOptions?.qaVisualRecovery===true?{recoveryJournal,onCheckpointAcknowledged:checkpoint=>{recoveryBase=checkpoint;}}:{})});const client=authorityClient=createSimulationAuthorityClient({...data.clientOptions,session,terrainPort:data.terrainPort??null,...(recoveryJournal?{onTerrainJournal:(sequence,chunks)=>{recoveryJournal.appendTerrain(sequence,chunks);recoveryReplay?.wake();}}:{})});let lastElapsed=0;
   const world={createConfirmedReceiver(){const forward=(message,meta)=>{if(message.session!==session||message.sequence!==sequence+1)throw Error('Host publication out of order');sequence=message.sequence;lastElapsed=message.elapsed;if(measureBacklog)peakBacklog=Math.max(peakBacklog,sequence-acknowledged);if(outbox){const {terrainCheckpoint,...remaining}=message;const mainMessage=visualStream&&terrainCheckpoint?remaining:message;if(outbox.publication(mainMessage,meta?.kind==='advance',{backgroundView:meta?.backgroundView===true})&&!meta?.backgroundView)foldedViews.set(sequence,message);}else{const {terrainCheckpoint,...remaining}=message;postMessage({kind:'publication',session,publication:visualStream&&terrainCheckpoint?remaining:message});}visualStream?.publish(message,meta?.kind==='advance',{backgroundView:meta?.backgroundView===true});recoveryReplay?.wake();return {accepted:true,sequence};};return {accept:forward,acceptUnchanged:forward,status:()=>({sequence,lastElapsed})};}};
   // Attach renewal to an already ordered command. Never inject or prioritize
   // a snapshot: even sampling Rapier an extra time can affect rig state.
   const dispatchClient=recoveryJournal?{...client,submit(command){return client.submit(!recoveryFrozen&&command.visualTerrain!==true&&shouldRenewPresentationCheckpoint(recoveryJournal.status())?{...command,visualTerrain:true,visualRecoveryOnly:true}:command);}}:client;
   runtime=createWorkerGameRuntime({...data.runtimeOptions,client:dispatchClient,world,session,canDispatch:command=>!recoveryFault&&!recoverySwitching&&(!recoveryFrozen||concurrentRecovery)&&!visualStream?.blocked()&&!(command.visualTerrain===true&&(recoveryFrozen||recoveryJournal?.status().candidate!==null&&recoveryJournal?.status().candidate!==undefined)),onError:error=>postMessage({kind:'failure',session,message:String(error?.stack??error)})});
   const initial=await runtime.start();initializing=false;if(outbox)outbox.message({kind:'started',sequence:initial.sequence,status:runtime.status()});else postMessage({kind:'started',session,sequence:initial.sequence,status:runtime.status()});monitor=setInterval(()=>postMessage({kind:'status',session,status:{...runtime.status(),...(outbox?{outbox:outbox.status()}:{}),...(measureBacklog&&visualStream?{visualPublication:visualStream.status()}:{}),...(measureBacklog?{publicationBacklog:sequence-acknowledged,peakPublicationBacklog:peakBacklog}:{}),...(data.runtimeOptions?.qaVisualRecovery===true?{recoveryBaseSequence:recoveryBase?.sequence??null,recoveryJournal:recoveryJournal?.status()??null,recoveryFault}:{})}}),250);return;
  }
  if(data?.session!==session||!runtime)throw Error('Invalid runtime host session');
  if(data.kind==='dispose'){if(monitor!==null)clearInterval(monitor);if(recoveryTimer!==null)clearTimeout(recoveryTimer);recoveryReplay?.dispose();visualStream?.close();recoveryJournal?.dispose();runtime.dispose();runtime=null;close();return;}
  if(data.kind==='publicationAck'){if(outbox){outbox.ack(data.sequence);acknowledged=data.sequence;return;}if(!measureBacklog||!Number.isSafeInteger(data.sequence)||data.sequence<=acknowledged||data.sequence>sequence)throw Error('Invalid publication acknowledgement');acknowledged=data.sequence;return;}
  if(import.meta.env.DEV&&data.kind==='prepareVisualRecovery'){try{
   if(!recoveryJournal||!recoveryBase||recoveryFrozen||!Number.isSafeInteger(data.id))throw Error('Visual recovery unavailable');recoveryFrozen=true;
   const deadline=performance.now()+10000;while(runtime.status().busy&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));
   if(runtime.status().busy)throw Error('Visual recovery boundary unavailable');
   assertPresentationRecoveryBoundary(recoveryJournal,visualStream,recoveryBase,sequence);
   postMessage({kind:'visualRecoveryPrepared',session,id:data.id,checkpoint:recoveryBase});}catch(error){if(error?.code!=='recovery-incomplete'){recoveryFrozen=false;runtime.resumeDispatch();}postMessage({kind:'visualRecoveryFailed',session,id:data.id,message:String(error?.message??error)});}return;
  }
  if(import.meta.env.DEV&&data.kind==='attachVisualRecovery'){try{
   if(!recoveryFrozen||recoveryReplay||!data.presentationPort||!data.terrainPort||!data.recoveryPort||!Number.isSafeInteger(data.id))throw Error('Invalid visual recovery attachment');
   recoveryAttachStarted=true;
   recoverySwitching=true;
   const failRecovery=error=>{if(recoveryFault)return;recoveryFault=String(error?.message??error);runtime.rejectQueuedCommands(Error(recoveryFault));if(recoveryTimer!==null)clearTimeout(recoveryTimer);recoveryTimer=null;recoveryReplay?.dispose();recoveryReplay=null;postMessage({kind:'visualRecoveryFailed',session,id:data.id,message:recoveryFault});};
   if(concurrentRecovery)recoveryTimer=setTimeout(()=>failRecovery(Error('Concurrent visual recovery timed out; explicit recovery is required')),10000);
   const deadline=performance.now()+10000;while(runtime.status().busy&&!recoveryFault&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));if(recoveryFault)return;if(runtime.status().busy)throw Error('Visual recovery terrain switch unavailable');
   await authorityClient.reattachTerrain(data.terrainPort);
   if(recoveryFault)return;
   recoveryReplay=createPresentationRecoveryReplay({port:data.recoveryPort,session,checkpoint:recoveryBase,journal:recoveryJournal,onCaughtUp:result=>{
    if(assertPresentationRecoveryBoundary(recoveryJournal,visualStream,recoveryBase,sequence)!==result.sequence)throw Error('Recovery replay did not reach authority boundary');
    if(recoveryTimer!==null)clearTimeout(recoveryTimer);recoveryTimer=null;
    recoveryReplay.dispose();recoveryReplay=null;visualStream?.close();visualStream=openVisualStream(data.presentationPort,session,()=>runtime?.resumeDispatch(),{diagnostics:measureBacklog,workRecovery,recoveryJournal,onCheckpointAcknowledged:checkpoint=>{recoveryBase=checkpoint;}});
    postMessage({kind:'visualRecoveryAttached',session,id:data.id,sequence:result.sequence});
   },onError:failRecovery});recoverySwitching=false;runtime.resumeDispatch();}catch(error){if(recoveryAttachStarted){recoveryFault=String(error?.message??error);runtime.rejectQueuedCommands(Error(recoveryFault));if(recoveryTimer!==null)clearTimeout(recoveryTimer);recoveryTimer=null;}postMessage({kind:'visualRecoveryFailed',session,id:data.id,message:String(error?.message??error)});}return;
  }
  if(import.meta.env.DEV&&data.kind==='cancelVisualRecovery'){try{if(!Number.isSafeInteger(data.id)||!recoveryFrozen||recoveryAttachStarted||recoveryReplay||recoveryFault)throw Error('Visual recovery cannot be safely cancelled');recoveryFrozen=false;runtime.resumeDispatch();postMessage({kind:'visualRecoveryCancelled',session,id:data.id});}catch(error){postMessage({kind:'visualRecoveryFailed',session,id:data.id,message:String(error?.message??error)});}return;}
  if(import.meta.env.DEV&&data.kind==='finishVisualRecovery'){if(!recoveryFrozen||recoveryReplay||recoveryFault)throw Error('Visual recovery not caught up');assertPresentationRecoveryBoundary(recoveryJournal,visualStream,recoveryBase,sequence);recoveryFrozen=false;recoveryAttachStarted=false;runtime.resumeDispatch();return;}
  if(data.kind==='speed'){runtime.setNightFastForward(data.value);return;}
  if(data.kind==='view'){if(!outbox||data.command?.kind!=='setNavigationView')throw Error('Invalid background view');try{if(recoveryFault)throw Error(recoveryFault);await runtime.submit(data.command,{backgroundView:true});}catch(error){postMessage({kind:'viewFailure',session,message:String(error?.message??error)});}return;}
  if(data.kind==='command'){
   if(!Number.isSafeInteger(data.id)||data.id<1)throw TypeError('Invalid host command id');
   try{if(recoveryFault)throw Error(recoveryFault);const result=await runtime.submit(data.command),receipt=foldedViews.get(result.sequence);if(receipt)foldedViews.delete(result.sequence);if(outbox)outbox.message({kind:'commandResult',id:data.id,sequence:result.sequence,...(receipt?{receipt}:{})});else postMessage({kind:'commandResult',session,id:data.id,sequence:result.sequence});}
   catch(error){const message={kind:'commandFailure',id:data.id,message:String(error?.message??error)};if(outbox)outbox.message(message);else postMessage({...message,session});}return;
  }
  throw Error('Unknown runtime host message');
 }catch(error){postMessage({kind:'failure',session:data?.session??session,message:String(error?.stack??error)});}
};
