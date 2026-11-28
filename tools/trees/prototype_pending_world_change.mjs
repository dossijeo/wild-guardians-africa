import {createGuardedTrajectory} from './prototype_guarded_trajectory.mjs';

// QA only. A caller must invoke begin before submitting an affecting world
// change; this freezes time, but does not certify that the frozen point is safe.
export function createPendingWorldChangeGate(session,actorId,options){
 const base=createGuardedTrajectory(session,actorId,options);let presented=-1,pending=null,failed=false;
 return {
  install(event,at){if(pending||failed)return {accepted:false,reason:'pending'};return base.install(event,at);},
  presented(at){if(pending||failed)throw Error('Cannot advance a held trajectory');base.presented(at);presented=at;},
  begin(token){
   if(typeof token!=='string'||!token)throw TypeError('Invalid command token');
   if(pending||failed)return {accepted:false,reason:'pending'};
   if(presented<0)throw Error('No presented pose');const pose=base.sample(presented);if(!pose)throw Error('No active pose');
   pending={token,at:presented,point:{x:pose.x,z:pose.z},pose:{...pose}};return {accepted:true,at:presented,point:{...pending.point}};
  },
  confirm(token,event){
   if(!pending||token!==pending.token)return {accepted:false,reason:'token'};
   try{const result=base.invalidate(event,pending.at);if(!result.accepted){failed=true;return result;}pending=null;return result;}catch(error){failed=true;throw error;}
  },
  sample(at){if(!Number.isFinite(at)||at<0)throw TypeError('Invalid sample time');if(failed)return null;if(pending&&at<pending.at)throw RangeError('Sample precedes held pose');return pending?{...pending.pose,movementMode:'stopped'}:base.sample(at);},
  state(){return {pending:!!pending,failed,at:pending?.at??null};}
 };
}
