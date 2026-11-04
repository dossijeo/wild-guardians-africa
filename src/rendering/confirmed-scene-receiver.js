import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedAnimalPose} from './confirmed-animal-pose.js';
import {validateConfirmedMotion} from './confirmed-motion-validation.js';
import {confirmedAnimalPoses} from './confirmed-animal-poses.js';

// Applies a single ordered authority publication to the existing scene state.
// It does not advance simulation or install a second physics owner.
export function createConfirmedSceneReceiver(state,session,world,{repeatDecode=false}={}){
 if(!world||world.state!==state||!(world.mixers instanceof Map))throw TypeError('Invalid confirmed scene');
 let pending=null,decoded=null;const receiver=createConfirmedStateReceiver(state,session,{decodeSnapshot:text=>{if(!decoded||decoded.text!==text)throw Error('Missing validated scene snapshot');return repeatDecode?deserializeConfirmedState(text):decoded.value;},onReconciled:()=>{
  if(!pending)throw Error('Missing confirmed scene poses');const previous=world.confirmedAnimalPoses??new Map();for(const id of previous.keys())if(!pending.has(id)){const rig=world.mixers.get(id);if(rig)rig.key=null;}world.confirmedAnimalPoses=pending;
 }});
 return {
  acceptUnchanged(message,options){return receiver.acceptUnchanged(message,options);},
  accept(message,{firstSequence=message?.sequence}={}){
   const status=receiver.status();if(status.fault)return {accepted:false,reason:'fault'};if(message?.session!==session||!Number.isSafeInteger(message?.sequence)||firstSequence!==status.sequence+1)return receiver.accept(message,{firstSequence});
   const snapshot=deserializeConfirmedState(message.snapshot),next=confirmedAnimalPoses(message,snapshot);
   for(const [id,pose] of next){const rig=world.mixers.get(id);if(rig)validateConfirmedAnimalPose(rig.model,pose);}
   const {trace,invalidation}=validateConfirmedMotion(message,snapshot,status.lastElapsed);
   pending=next;decoded={text:message.snapshot,value:snapshot};try{const result=receiver.accept(message,{firstSequence});if(result.accepted){if(invalidation){if(world.lastObservedPathMotion?.actorId===invalidation.actorId)world.lastObservedPathMotion=null;world.lastObservedPathInvalidation=invalidation;if(Array.isArray(world.observedPathInvalidations)){if(trace)world.lastObservedUnusablePathMotion=trace;world.observedPathInvalidations.push(invalidation);if(world.observedPathInvalidations.length>64)world.observedPathInvalidations.shift();}}else if(trace)world.lastObservedPathMotion=trace;}return result;}finally{pending=null;decoded=null;}
  },
  status(){return receiver.status();},
 };
}
