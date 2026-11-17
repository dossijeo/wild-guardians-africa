import {PROFILES,contractExpired} from '../simulation/workforce.js';
import {centerServicePoint} from './centers.js';
import {nativeEntityNumericId as numericId} from './native-entity-id.js';

function farmArrivalState(state,worker,{yaw=worker?.heading,canonical=false}={},executing=false){
 const profile=PROFILES.findIndex(p=>p.id===worker?.profile),center=state.structures.find(c=>c.id===worker?.centerId);
 if(!Number.isFinite(state.elapsed)||state.elapsed<0||!Number.isFinite(state.time)||state.time<0||!state.workers.includes(worker)||profile<0||worker.status!=='arriving'||worker.taskId||worker.crateId||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||
  (executing?worker.nativeRouteAdmission!=='native-farm-arrival':worker.nativeRouteAdmission!==undefined&&worker.nativeRouteAdmission!=='pending-farm-arrival-resources')||worker.path!==null||worker.destinationId!=null||worker.idleState!=null||(executing?typeof worker.running!=='boolean'||typeof worker.gateWaiting!=='boolean':worker.running!==undefined&&worker.running!==false||worker.gateWaiting!==undefined&&worker.gateWaiting!==false)||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||
  state.tasks.some(t=>t.workerId===worker.id)||center?.kind!=='center'||center.status!=='intact'||contractExpired(worker,state)||state.time>=PROFILES[profile].end)throw Error('Invalid native farm arrival declaration');
 const pose={x:worker.x,z:worker.z,yaw,runPhase:worker.runPhase??0,walkPhase:worker.walkPhase??0,carryPhase:worker.carryPhase??0,runRemaining:worker.runRemaining},target=centerServicePoint(center,state,.8),goal={x:target.x,z:target.z,centerX:center.x,centerZ:center.z,arrivalRadius:2};
 if(worker.heading!==undefined&&worker.heading!==yaw||!Object.values(pose).every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||['x','z'].some(k=>Math.abs(pose[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0)||!Object.values(goal).every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||['x','z','centerX','centerZ'].some(k=>Math.abs(goal[k])>=2147483000)||
  canonical&&(worker.heading!==yaw||!executing&&(worker.running!==false||worker.gateWaiting!==false)||worker.destinationId!==null||['runPhase','walkPhase','carryPhase'].some(k=>worker[k]!==pose[k])))throw Error('Invalid native farm arrival pose');
 return {pose,goal,centerId:numericId(center.id),args:[numericId(worker.id),profile,yaw,pose.runPhase,pose.walkPhase,pose.carryPhase,pose.runRemaining]};
}
export function nativeFarmArrivalState(state,worker,options){return farmArrivalState(state,worker,options,false);}
export function nativeFarmArrivalExecutionState(state,worker){return farmArrivalState(state,worker,{canonical:true},true);}
