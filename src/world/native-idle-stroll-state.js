import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {PROFILES} from '../simulation/workforce.js';

// Semantic live writeback, without native handles or an execution permission.
// Restoring a moving Idle still requires a fresh native source declaration.
function strollState(state,worker,pending=false){
 const center=state.structures.find(value=>value.id===worker?.centerId),idle=worker?.idleState,d=idle?.destination,approach=d?.id===idle?.anchorId;
 if(!state.workers.includes(worker)||!PROFILES.some(p=>p.id===worker.profile)||worker.nativeRouteAdmission!=='native-idle-stroll'&&(!pending||worker.nativeRouteAdmission!=='pending-stroll-resources')||worker.status!=='idle'||worker.taskId||worker.crateId||worker.path!==null||worker.running!==false||worker.gateWaiting!==false||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||state.tasks.some(task=>task.workerId===worker.id)||center?.kind!=='center'||center.status!=='intact')throw Error('Invalid native Idle stroll live owner');
 const pose={x:worker.x,z:worker.z,yaw:worker.heading,runPhase:worker.runPhase,walkPhase:worker.walkPhase,carryPhase:worker.carryPhase,runRemaining:worker.runRemaining};
 if(!Object.values(pose).every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||['x','z'].some(k=>Math.abs(pose[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0)||!idle||Object.keys(idle).some(k=>!['anchorId','mode','elapsed','remaining','rng','approachRetry','destination'].includes(k))||!/^farm-(plant|structure)-[1-9]\d*$/.test(idle.anchorId)||idle.mode!=='walk'||idle.elapsed!==0||(approach?idle.remaining!==LOCOMOTION.sources.find(c=>c.profile===worker.profile).idleSeconds*2:idle.remaining!==0)||!Number.isSafeInteger(idle.rng)||idle.rng<0||idle.rng>0xffffffff||!Number.isFinite(idle.approachRetry)||idle.approachRetry<0||!d||Object.keys(d).some(k=>!['id','x','z'].includes(k))||(!approach&&d.id!==`idle-${worker.id}`)||worker.destinationId!==d.id||!['x','z'].every(k=>Number.isFinite(d[k])&&Number.isFinite(Math.fround(d[k]))&&Math.abs(d[k])<2147483000))throw Error('Invalid native Idle stroll live state');
 return {pose,idleState:idle};
}

export function nativeIdleStrollLiveState(state,worker){return strollState(state,worker);}
// This validates semantic values only. Accepting a saved/pending marker here
// does not make a snapshot loadable or grant a native/graphical permission.
export function nativeIdleStrollSavedState(state,worker){return strollState(state,worker,true);}
