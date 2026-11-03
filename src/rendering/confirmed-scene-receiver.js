import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {deserializeConfirmedState} from '../simulation/confirmed-live-state.js';
import {validateConfirmedAnimalPose} from './confirmed-animal-pose.js';

const validTransform=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite);
const validPoint=p=>p&&[p.at,p.x,p.z].every(Number.isFinite);
function validMotionTrace(t){
 if(!t||typeof t.actorId!=='string'||!t.actorId||!validPoint(t.start)||!validPoint(t.end)||t.end.at<t.start.at||typeof t.continuous!=='boolean'||typeof t.timed!=='boolean'||!Array.isArray(t.segments))return false;
 let last=t.start.at,x=t.start.x,z=t.start.z;for(const s of t.segments){if(!s||![s.at,s.x0,s.z0,s.x1,s.z1].every(Number.isFinite)||s.at<t.start.at-1e-8||s.at>t.end.at+1e-8||t.continuous&&(s.x0!==x||s.z0!==z))return false;x=s.x1;z=s.z1;if(t.timed){if(!Number.isFinite(s.t0)||!Number.isFinite(s.t1)||s.t0<last-1e-8||s.t1<s.t0||s.t1>s.at+1e-8||s.t1>t.end.at+1e-8)return false;last=s.t1;}}return !t.continuous||x===t.end.x&&z===t.end.z;
}
// Applies a single ordered authority publication to the existing scene state.
// It does not advance simulation or install a second physics owner.
export function createConfirmedSceneReceiver(state,session,world){
 if(!world||world.state!==state||!(world.mixers instanceof Map))throw TypeError('Invalid confirmed scene');
 let pending=null,decoded=null;const receiver=createConfirmedStateReceiver(state,session,{decodeSnapshot:text=>{if(!decoded||decoded.text!==text)throw Error('Missing validated scene snapshot');return decoded.value;},onReconciled:()=>{
  if(!pending)throw Error('Missing confirmed scene poses');const previous=world.confirmedAnimalPoses??new Map();for(const id of previous.keys())if(!pending.has(id)){const rig=world.mixers.get(id);if(rig)rig.key=null;}world.confirmedAnimalPoses=pending;
 }});
 return {
  acceptUnchanged(message,options){return receiver.acceptUnchanged(message,options);},
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
   const trace=message.motionTrace;if(trace!==undefined){const actor=actors.get(trace?.actorId)??snapshot.workers.find(w=>w.id===trace?.actorId);if(!validMotionTrace(trace)||trace.start.at<status.lastElapsed-1e-8||trace.end.at!==snapshot.elapsed||trace.continuous&&(!actor||trace.end.x!==actor.x||trace.end.z!==actor.z))throw TypeError('Invalid observed path motion');
    if(trace.peers!==undefined){if(!Array.isArray(trace.peers)||typeof trace.rosterChanged!=='boolean')throw TypeError('Invalid observed peer motion');const seen=new Set([trace.actorId]);for(const peer of trace.peers){const body=actors.get(peer?.actorId)??snapshot.workers.find(w=>w.id===peer?.actorId);if(!validMotionTrace(peer)||seen.has(peer.actorId)||peer.start.at!==trace.start.at||peer.end.at!==trace.end.at||!Number.isFinite(peer.radius)||peer.radius<=0||typeof peer.startStatus!=='string'||typeof peer.endStatus!=='string'||peer.continuous&&(!body||peer.end.x!==body.x||peer.end.z!==body.z))throw TypeError('Invalid observed peer motion');seen.add(peer.actorId);}}
   }
   const invalidation=message.motionInvalidation;if(invalidation!==undefined&&(!invalidation||typeof invalidation.actorId!=='string'||!invalidation.actorId||!validPoint(invalidation)||invalidation.at<0||!Number.isFinite(message.elapsed)||invalidation.at>message.elapsed||message.elapsed!==snapshot.elapsed||typeof invalidation.reason!=='string'||!invalidation.reason||trace&&(invalidation.actorId!==trace.actorId||invalidation.at<trace.start.at||invalidation.at>trace.end.at)))throw TypeError('Invalid path motion invalidation');
   pending=next;decoded={text:message.snapshot,value:snapshot};try{const result=receiver.accept(message,{firstSequence});if(result.accepted){if(invalidation){if(world.lastObservedPathMotion?.actorId===invalidation.actorId)world.lastObservedPathMotion=null;world.lastObservedPathInvalidation=invalidation;if(Array.isArray(world.observedPathInvalidations)){if(trace)world.lastObservedUnusablePathMotion=trace;world.observedPathInvalidations.push(invalidation);if(world.observedPathInvalidations.length>64)world.observedPathInvalidations.shift();}}else if(trace)world.lastObservedPathMotion=trace;}return result;}finally{pending=null;decoded=null;}
  },
  status(){return receiver.status();},
 };
}
