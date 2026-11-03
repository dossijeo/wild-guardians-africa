import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedAnimalPose} from './confirmed-animal-pose.js';

const validTransform=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite);
// Applies a single ordered authority publication to the existing scene state.
// It does not advance simulation or install a second physics owner.
export function createConfirmedSceneReceiver(state,session,world){
 if(!world||world.state!==state||!(world.mixers instanceof Map))throw TypeError('Invalid confirmed scene');
 let pending=null;const receiver=createConfirmedStateReceiver(state,session,{onReconciled:()=>{
  if(!pending)throw Error('Missing confirmed scene poses');const previous=world.confirmedAnimalPoses??new Map();for(const id of previous.keys())if(!pending.has(id)){const rig=world.mixers.get(id);if(rig)rig.key=null;}world.confirmedAnimalPoses=pending;
 }});
 return {
  acceptUnchanged(message){return receiver.acceptUnchanged(message);},
  accept(message,{firstSequence=message?.sequence}={}){
   const status=receiver.status();if(status.fault)return {accepted:false,reason:'fault'};if(message?.session!==session||!Number.isSafeInteger(message?.sequence)||firstSequence!==status.sequence+1)return receiver.accept(message,{firstSequence});
   const snapshot=deserializeConfirmedState(message.snapshot),actors=new Map((snapshot.raid?.animals??[]).map(a=>[a.id,a]));
   if(!Object.hasOwn(message,'physicsPose'))throw TypeError('Missing confirmed physics pose');
   const poses=message.physicsPoses??(message.physicsPose?[message.physicsPose]:[]);
   if(!Array.isArray(poses)||message.physicsPoses&&(!poses.length||JSON.stringify(poses[0])!==JSON.stringify(message.physicsPose)))throw TypeError('Invalid confirmed pose publication');
   const next=new Map(),seen=new Set();
   for(const pose of poses){
    if(!pose||typeof pose.actorId!=='string'||!pose.actorId||seen.has(pose.actorId)||typeof pose.active!=='boolean'||!validTransform(pose.root)||!validTransform(pose.model)||!Array.isArray(pose.bones)||pose.bones.some(b=>typeof b?.name!=='string'||!validTransform(b.transform)))throw TypeError('Invalid confirmed animal pose');
    seen.add(pose.actorId);if(!pose.active)continue;
    const animal=actors.get(pose.actorId);if(!animal?.magicDown)throw Error('Confirmed pose lacks active animal');
    const rig=world.mixers.get(pose.actorId);if(rig)validateConfirmedAnimalPose(rig.model,pose);next.set(pose.actorId,pose);
   }
   pending=next;try{return receiver.accept(message,{firstSequence});}finally{pending=null;}
  },
  status(){return receiver.status();},
 };
}
