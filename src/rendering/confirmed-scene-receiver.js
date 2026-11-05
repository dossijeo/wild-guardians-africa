import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedAnimalPose} from './confirmed-animal-pose.js';
import {validateConfirmedMotion} from './confirmed-motion-validation.js';
import {confirmedAnimalPoses} from './confirmed-animal-poses.js';
import {preparePresentationWorkerHeadingDeltas,applyPresentationWorkerHeadingDeltas} from '../simulation/presentation-worker-headings.js';
import {createConfirmedVfxEventWindow} from './confirmed-vfx-event-window.js';
import {vfxDefinitions} from './vfx-native.js';

// Applies a single ordered authority publication to the existing scene state.
// It does not advance simulation or install a second physics owner.
export function createConfirmedSceneReceiver(state,session,world,{repeatDecode=false,initialSequence=0}={}){
 if(!world||world.state!==state||!(world.mixers instanceof Map))throw TypeError('Invalid confirmed scene');
 const vfxEvents=createConfirmedVfxEventWindow({lifetime:Math.max(.9,...vfxDefinitions.map(definition=>definition.duration))});vfxEvents.sync(state.elapsed??0,[],state.events??[]);world.confirmedVfxEventWindow=vfxEvents;
 let pending=null,pendingHeadings=null,decoded=null;const receiver=createConfirmedStateReceiver(state,session,{initialSequence,decodeSnapshot:text=>{if(!decoded||decoded.text!==text)throw Error('Missing validated scene snapshot');return repeatDecode?deserializeConfirmedState(text):decoded.value;},onReconciled:message=>{
  if(!pending)throw Error('Missing confirmed scene poses');const previous=world.confirmedAnimalPoses??new Map();for(const id of previous.keys())if(!pending.has(id)){const rig=world.mixers.get(id);if(rig)rig.key=null;}world.confirmedAnimalPoses=pending;if(pendingHeadings){applyPresentationWorkerHeadingDeltas(world.confirmedWorkerVisualHeadings,pendingHeadings);for(const item of pendingHeadings)if(item.yaw===null)world.confirmedWorkerVisualIdentities?.delete(item.id);else if(item.add)world.confirmedWorkerVisualIdentities?.set(item.id,{pending:true,revoked:world.mixers.has(item.id)||world.objects?.has(item.id)});}world.legacyActorRevision=(world.legacyActorRevision??0)+1;vfxEvents.sync(state.elapsed??0,message.events,state.events??[]);
 }});
 return {
  acceptUnchanged(message,options){if(message?.presentationWorkerHeadings!==undefined)throw TypeError('Unchanged publication cannot carry presentation headings');return receiver.acceptUnchanged(message,options);},
  accept(message,{firstSequence=message?.sequence}={}){
   const status=receiver.status();if(status.fault)return {accepted:false,reason:'fault'};if(message?.session!==session||!Number.isSafeInteger(message?.sequence)||firstSequence!==status.sequence+1)return receiver.accept(message,{firstSequence});
   const snapshot=deserializeConfirmedState(message.snapshot),next=confirmedAnimalPoses(message,snapshot);
   for(const [id,pose] of next){const rig=world.mixers.get(id);if(rig)validateConfirmedAnimalPose(rig.model,pose);}
   const {trace,invalidation}=validateConfirmedMotion(message,snapshot,status.lastElapsed);
   pendingHeadings=message.presentationWorkerHeadings===undefined?null:preparePresentationWorkerHeadingDeltas(world.confirmedWorkerVisualHeadings,message.presentationWorkerHeadings,snapshot,state);pending=next;decoded={text:message.snapshot,value:snapshot};try{const result=receiver.accept(message,{firstSequence});if(result.accepted){if(invalidation){if(world.lastObservedPathMotion?.actorId===invalidation.actorId)world.lastObservedPathMotion=null;world.lastObservedPathInvalidation=invalidation;if(Array.isArray(world.observedPathInvalidations)){if(trace)world.lastObservedUnusablePathMotion=trace;world.observedPathInvalidations.push(invalidation);if(world.observedPathInvalidations.length>64)world.observedPathInvalidations.shift();}}else if(trace)world.lastObservedPathMotion=trace;}return result;}finally{pending=null;pendingHeadings=null;decoded=null;}
  },
  status(){return receiver.status();},
 };
}
