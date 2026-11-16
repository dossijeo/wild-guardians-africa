import {PROFILES,contractExpired} from '../simulation/workforce.js';
import {nativeEntityNumericId as numericId} from './native-entity-id.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';

// Semantic declaration only. Missing, unused locomotion accumulators have the
// same zero origin as the legacy mover. Heading must come from the actor or
// its actual presentation heading; never invent a replacement orientation.
function initialIdleState(state,worker,{yaw=worker?.heading,canonical=false}={},activeContract=true){
 const profile=PROFILES.findIndex(p=>p.id===worker?.profile),center=state.structures.find(c=>c.id===worker?.centerId);
 if(!Number.isFinite(state.elapsed)||state.elapsed<0||!Number.isFinite(state.time)||state.time<0||!state.workers.includes(worker)||profile<0||worker.status!=='idle'||worker.taskId||worker.crateId||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||
  worker.nativeRouteAdmission!==undefined&&!['pending-idle-resources','native-idle'].includes(worker.nativeRouteAdmission)||worker.path!==null||worker.running!==undefined&&worker.running!==false||worker.gateWaiting!==undefined&&worker.gateWaiting!==false||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||
  state.tasks.some(t=>t.workerId===worker.id)||center?.kind!=='center'||center.status!=='intact'||activeContract&&(contractExpired(worker,state)||state.time>=PROFILES[profile].end))throw Error('Invalid native initial Idle declaration');
 const pose={x:worker.x,z:worker.z,yaw,runPhase:worker.runPhase??0,walkPhase:worker.walkPhase??0,carryPhase:worker.carryPhase??0,runRemaining:worker.runRemaining};
 if(worker.heading!==undefined&&worker.heading!==yaw||!Object.values(pose).every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||['x','z'].some(k=>Math.abs(pose[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0)||
  canonical&&(worker.heading!==yaw||worker.running!==false||worker.gateWaiting!==false||['runPhase','walkPhase','carryPhase'].some(k=>worker[k]!==pose[k])))throw Error('Invalid native initial Idle pose');
 const idle=worker.idleState,idleState=copyNativeInitialIdleState(idle==null?null:{anchorId:idle.anchorId,mode:idle.mode,elapsed:idle.elapsed,remaining:idle.remaining,rng:idle.rng,approachRetry:idle.approachRetry??0});
 const anchor=idleState&&/^(farm-plant|farm-structure|village)-(\d+)$/.exec(idleState.anchorId);
 return {pose,idleState,args:[numericId(worker.id),profile,idleState?{rest:1,watch:2}[idleState.mode]:0,idleState?.elapsed??0,idleState?.remaining??0,idleState?.rng??0,anchor?['','farm-plant','farm-structure','village'].indexOf(anchor[1]):0,anchor?Number(anchor[2]):0,idleState?.approachRetry??0,yaw,pose.runPhase,pose.walkPhase,pose.carryPhase,pose.runRemaining]};
}
export function nativeInitialIdleDeclaration(state,worker,options){if(worker?.nativeRouteAdmission==='native-idle')throw Error('Native initial Idle already has an admitted body');return initialIdleState(state,worker,options,true);}
export function nativeInitialIdleSavedState(state,worker,options){const result=initialIdleState(state,worker,options,true);if(worker.nativeRouteAdmission==='native-idle'&&!result.idleState)throw Error('Native initial Idle body has no initialized pose');return result;}
export function nativeInitialIdleRetainedState(state,worker,options){return initialIdleState(state,worker,options,false);}
