import {createTrajectoryReceiver} from './prototype_mobility_contract.mjs';

// Single-actor diagnostic gate. The caller supplies confirmed time and point;
// this does not detect collisions or prove a safe prediction horizon.
export function createGuardedTrajectory(session,actorId,{worldVersion=0}={}){
 if(typeof session!=='string'||!session||typeof actorId!=='string'||!actorId||!Number.isSafeInteger(worldVersion)||worldVersion<0)throw TypeError('Invalid identity');
 const receiver=createTrajectoryReceiver(session);let revision=worldVersion,lastPresented=-1,lastVersion=0,suspended=false;
 return {
  install(event,at){
   if(suspended)return {accepted:false,reason:'reconciliation'};
   if(event?.actorId!==actorId||event?.worldVersion!==revision)return {accepted:false,reason:'world'};
   // Validate on a temporary receiver before mutating the accepted route. This
   // gate checks continuity only; it cannot certify a segment's collision safety.
   const probe=createTrajectoryReceiver(session),checked=probe.apply(event,at);
   if(!checked.accepted)return checked;
   if(event.version<=lastVersion)return {accepted:false,reason:'stale'};
   const previous=receiver.sample(actorId,at),next=probe.sample(actorId,at);
   if(previous&&next&&Math.hypot(previous.x-next.x,previous.z-next.z)>1e-6){suspended=true;return {accepted:false,reason:'position',hide:true};}
   const result=receiver.apply(event,at);if(result.accepted)lastVersion=event.version;return result;
  },
  presented(at){if(!Number.isFinite(at)||at<0||at<lastPresented)throw RangeError('Presentation time must be monotonic');lastPresented=at;},
  invalidate({worldVersion:next,at,point,version},presentedAt){
   if(!Number.isSafeInteger(next)||next<=revision||!Number.isSafeInteger(version)||version<=0||!Number.isFinite(at)||at<0||!Number.isFinite(presentedAt)||presentedAt!==lastPresented||lastPresented<0||!Number.isFinite(point?.x)||!Number.isFinite(point?.z)){suspended=true;throw TypeError('Invalid invalidation');}
   revision=next;
   if(at!==presentedAt){suspended=true;return {accepted:false,reason:'reconciliation',hide:true};}
   suspended=true;
   const sample=receiver.sample(actorId,at);
   if(!sample||Math.hypot(sample.x-point.x,sample.z-point.z)>1e-6){suspended=true;return {accepted:false,reason:'position',hide:true};}
   const result=receiver.apply({session,actorId,version,kind:'stop',at,point,animationState:'idle'},at);
   if(!result.accepted)return {...result,hide:true};lastVersion=version;suspended=false;return result;
  },
  sample(at){return suspended?null:receiver.sample(actorId,at);}
 };
}
