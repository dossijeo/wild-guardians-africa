import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedMotion} from './confirmed-motion-validation.js';
import {confirmedAnimalPoses} from './confirmed-animal-poses.js';

// A presentation Worker consumes its own ordered state stream. It never
// advances simulation and only releases terrain after state reconciliation.
export function createConfirmedPresentationStream({port,session,state,terrain,onError=()=>{},onConfirmed=()=>{},onMotion=null,onPhysics=null,validatePhysics=null,diagnostics=false,initialSequence=0,allowPresentationHold=false}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||typeof terrain?.confirm!=='function'||typeof onError!=='function'||typeof onConfirmed!=='function'||onMotion!==null&&typeof onMotion!=='function'||onPhysics!==null&&typeof onPhysics!=='function'||validatePhysics!==null&&typeof validatePhysics!=='function'||typeof allowPresentationHold!=='boolean')throw TypeError('Invalid presentation stream');
 const timing=[];let decoded=null,pendingPoses=null;const receiver=createConfirmedStateReceiver(state,session,{initialSequence,decodeSnapshot:text=>decoded?.text===text?decoded.value:deserializeConfirmedState(text),onReconciled:()=>{if(pendingPoses)onPhysics(pendingPoses);}});let closed=false,hold=false,held=null,receivedSequence=initialSequence,receivedElapsed=state.elapsed;
 function clearHeld(){if(held){receiver.discard(held.token);held=null;}}
 function fail(error){if(closed)return;closed=true;try{clearHeld();}catch{}try{port.close();}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 function commit(item){
  const at=diagnostics?performance.now():0;pendingPoses=item.poses;receiver.commit(item.token);pendingPoses=null;const reconciledAt=diagnostics?performance.now():0;
  const {message,ack,beforeConfirmed}=item;terrain.confirm(message.sequence);beforeConfirmed?.();if(onMotion&&message.unchanged!==true)onMotion({sequence:message.sequence,elapsed:state.elapsed,pauses:[...state.pauses],trace:message.motionTrace??null,invalidation:message.motionInvalidation??null,physicsAvailable:Object.hasOwn(message,'physicsPose'),physicsPose:message.physicsPose??null,physicsPoses:message.physicsPoses??null});onConfirmed(message);if(diagnostics){const completedAt=performance.now(),decode=item.decodedAt-item.started,reconcile=reconciledAt-at,hooks=completedAt-reconciledAt;timing.push({decode,reconcile,hooks,total:decode+reconcile+hooks});if(timing.length>512)timing.shift();}if(ack)port.postMessage({kind:'publicationAck',session,sequence:message.sequence});
 }
 function receive(data,ack=true,beforeConfirmed=null){if(closed)throw Error('Presentation stream closed');try{
  if(data?.kind==='presentationFailure'&&data.session===session)throw Error(data.message||'Presentation stream failed');
  if(data?.kind!=='publication'||data.session!==session||!data.publication||held||hold&&!ack)throw Error('Invalid presentation publication');
  const started=diagnostics?performance.now():0,message=data.publication,firstSequence=data.firstSequence??message.sequence;
  if(firstSequence!==message.sequence&&data.tick!==true&&!(data.backgroundView===true&&message.unchanged===true))throw Error('Invalid coalesced presentation');
  let poses=null;if(message.unchanged!==true&&(onPhysics||message.motionTrace!==undefined||message.motionInvalidation!==undefined)){decoded={text:message.snapshot,value:deserializeConfirmedState(message.snapshot)};if(onPhysics){poses=confirmedAnimalPoses(message,decoded.value);validatePhysics?.(poses);}if(message.motionTrace!==undefined||message.motionInvalidation!==undefined)validateConfirmedMotion(message,decoded.value,receiver.status().lastElapsed);}else if(message.motionTrace!==undefined||message.motionInvalidation!==undefined)throw TypeError('Unchanged publication cannot carry motion');
  const decodedAt=diagnostics?performance.now():0,prepared=message.unchanged===true?receiver.prepareUnchanged(message,{firstSequence}):receiver.prepare(message,{firstSequence});if(!prepared.accepted)throw Error('Presentation publication rejected: '+prepared.reason);
  receivedSequence=message.sequence;receivedElapsed=prepared.elapsed;const item={token:prepared.token,message,poses,ack,beforeConfirmed,started,decodedAt};
  if(hold){held=item;return;}commit(item);
 }catch(error){fail(error);if(!ack)throw error;}finally{decoded=null;pendingPoses=null;}}
 port.onmessage=({data})=>receive(data);
 port.onmessageerror=()=>fail(Error('Presentation publication transfer failed'));port.start?.();
 return {...(import.meta.env?.DEV?{acceptRecovery(data,beforeConfirmed=null){receive(data,false,beforeConfirmed);}}:{}),...(allowPresentationHold?{holdPresentation(){if(closed||hold)throw Error('Presentation hold unavailable');hold=true;},releasePresentation(){if(closed||!hold)throw Error('Presentation is not held');hold=false;if(held){const item=held;held=null;try{commit(item);}catch(error){fail(error);throw error;}finally{pendingPoses=null;}}}}:{}),dispose(){if(closed)return;closed=true;clearHeld();port.close();},status(){const measure=key=>{const sorted=timing.map(x=>x[key]).sort((a,b)=>a-b);return sorted.length?{mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)}:null;};return {closed,...receiver.status(),...(allowPresentationHold?{receivedSequence,receivedElapsed,holding:hold,held:!!held}:{}),timing:{samples:timing.length,decode:measure('decode'),reconcile:measure('reconcile'),hooks:measure('hooks'),total:measure('total')}};}};
}
