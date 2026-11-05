import {createConfirmedStateReceiver} from './confirmed-state-receiver.js';
import {deserializeConfirmedState} from './confirmed-live-state.js';
import {confirmedAnimalPoses} from '../rendering/confirmed-animal-poses.js';
import {validateConfirmedMotion} from '../rendering/confirmed-motion-validation.js';

// Stable receiver identity before and after a presentation is attached. It is
// not a second simulation; capacity exhaustion fails before accepting a packet.
export function createConfirmedPresentationAdapter(state,session,{maxBufferedEvents=512}={}){
 if(!Number.isSafeInteger(maxBufferedEvents)||maxBufferedEvents<1)throw TypeError('Invalid presentation adapter capacity');
 let decoded=null,pendingPoses=null,poses=new Map(),events=[],attached=false,handoffFault=false;
 let receiver=createConfirmedStateReceiver(state,session,{decodeSnapshot:text=>decoded?.text===text?decoded.value:deserializeConfirmedState(text),onReconciled:message=>{poses=pendingPoses;events.push(...structuredClone(message.events));}});
 const adapter={
  acceptUnchanged(message,options){if(handoffFault)throw Error('Presentation adapter handoff failed');return receiver.acceptUnchanged(message,options);},
  accept(message,options){if(handoffFault)throw Error('Presentation adapter handoff failed');if(attached)return receiver.accept(message,options);const status=receiver.status(),first=options?.firstSequence??message?.sequence;if(status.fault||message?.session!==session||!Number.isSafeInteger(message?.sequence)||first!==status.sequence+1)return receiver.accept(message,options);if(message.presentationWorkerHeadings!==undefined||message.motionTrace!==undefined||message.worldMotionTrace!==undefined||message.motionInvalidation!==undefined)throw Error('Early presentation motion and headings are not supported');if(!Array.isArray(message.events)||events.length+message.events.length>maxBufferedEvents)throw Error('Presentation adapter event capacity exceeded');const snapshot=deserializeConfirmedState(message.snapshot);pendingPoses=confirmedAnimalPoses(message,snapshot);validateConfirmedMotion(message,snapshot,status.lastElapsed);decoded={text:message.snapshot,value:snapshot};try{return receiver.accept(message,options);}finally{decoded=null;pendingPoses=null;}},
  status(){return {...receiver.status(),fault:handoffFault||receiver.status().fault,attached,bufferedEvents:events.length};},
  attach(next,{onBufferedEvents=null,onAnimalPoses=null}={}){if(handoffFault||attached||!next||typeof next.accept!=='function'||typeof next.acceptUnchanged!=='function'||typeof next.status!=='function'||next.status().sequence!==receiver.status().sequence||events.length&&typeof onBufferedEvents!=='function'||poses.size&&typeof onAnimalPoses!=='function')throw Error('Presentation adapter handoff unavailable');const buffered=structuredClone(events),savedPoses=structuredClone(poses);try{onAnimalPoses?.(savedPoses);onBufferedEvents?.(buffered);}catch(error){handoffFault=true;throw error;}receiver=next;attached=true;events=[];poses=new Map();return {sequence:receiver.status().sequence,events:buffered.length};},
 };
 return adapter;
}
