import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedMotion} from './confirmed-motion-validation.js';
import {confirmedAnimalPoses} from './confirmed-animal-poses.js';

// A presentation Worker consumes its own ordered state stream. It never
// advances simulation and only releases terrain after state reconciliation.
export function createConfirmedPresentationStream({port,session,state,terrain,onError=()=>{},onConfirmed=()=>{},onMotion=null,onPhysics=null,validatePhysics=null,diagnostics=false}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||typeof terrain?.confirm!=='function'||typeof onError!=='function'||typeof onConfirmed!=='function'||onMotion!==null&&typeof onMotion!=='function'||onPhysics!==null&&typeof onPhysics!=='function'||validatePhysics!==null&&typeof validatePhysics!=='function')throw TypeError('Invalid presentation stream');
 const timing=[];let decoded=null,pendingPoses=null;const receiver=createConfirmedStateReceiver(state,session,{decodeSnapshot:text=>decoded?.text===text?decoded.value:deserializeConfirmedState(text),onReconciled:()=>{if(pendingPoses)onPhysics(pendingPoses);}});let closed=false;
 function fail(error){if(closed)return;closed=true;try{port.close();}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 port.onmessage=({data})=>{if(closed)return;try{
  if(data?.kind==='presentationFailure'&&data.session===session)throw Error(data.message||'Presentation stream failed');
  if(data?.kind!=='publication'||data.session!==session||!data.publication)throw Error('Invalid presentation publication');
  const started=diagnostics?performance.now():0,message=data.publication,firstSequence=data.firstSequence??message.sequence;
  if(firstSequence!==message.sequence&&data.tick!==true&&!(data.backgroundView===true&&message.unchanged===true))throw Error('Invalid coalesced presentation');
  let poses=null;if(message.unchanged!==true&&(onPhysics||message.motionTrace!==undefined||message.motionInvalidation!==undefined)){decoded={text:message.snapshot,value:deserializeConfirmedState(message.snapshot)};if(onPhysics){poses=confirmedAnimalPoses(message,decoded.value);validatePhysics?.(poses);}if(message.motionTrace!==undefined||message.motionInvalidation!==undefined)validateConfirmedMotion(message,decoded.value,receiver.status().lastElapsed);}else if(message.motionTrace!==undefined||message.motionInvalidation!==undefined)throw TypeError('Unchanged publication cannot carry motion');
  const decodedAt=diagnostics?performance.now():0;pendingPoses=poses;const accepted=message.unchanged===true?receiver.acceptUnchanged(message,{firstSequence}):receiver.accept(message,{firstSequence});if(!accepted.accepted)throw Error('Presentation publication rejected: '+accepted.reason);
  const reconciledAt=diagnostics?performance.now():0;terrain.confirm(message.sequence);if(onMotion&&message.unchanged!==true)onMotion({sequence:message.sequence,elapsed:state.elapsed,pauses:[...state.pauses],trace:message.motionTrace??null,invalidation:message.motionInvalidation??null,physicsAvailable:Object.hasOwn(message,'physicsPose'),physicsPose:message.physicsPose??null,physicsPoses:message.physicsPoses??null});onConfirmed(message);if(diagnostics){const completedAt=performance.now();timing.push({decode:decodedAt-started,reconcile:reconciledAt-decodedAt,hooks:completedAt-reconciledAt,total:completedAt-started});if(timing.length>512)timing.shift();}port.postMessage({kind:'publicationAck',session,sequence:message.sequence});
 }catch(error){fail(error);}finally{decoded=null;pendingPoses=null;}};
 port.onmessageerror=()=>fail(Error('Presentation publication transfer failed'));port.start?.();
 return {dispose(){if(closed)return;closed=true;port.close();},status(){const measure=key=>{const sorted=timing.map(x=>x[key]).sort((a,b)=>a-b);return sorted.length?{mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)}:null;};return {closed,...receiver.status(),timing:{samples:timing.length,decode:measure('decode'),reconcile:measure('reconcile'),hooks:measure('hooks'),total:measure('total')}};}};
}
