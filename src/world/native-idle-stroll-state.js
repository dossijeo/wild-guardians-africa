import {PROFILES,contractExpired} from '../simulation/workforce.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {activeCrops} from '../simulation/active-crops.js';
import {farmIdleAnchor} from '../simulation/idle.js';

const profileEnd=new Map(PROFILES.map(({id,end})=>[id,end]));

// Semantic live writeback, without native handles or an execution permission.
// Restoring a moving Idle still requires a fresh native source declaration.
function strollState(state,worker,pending=false){
 const center=state.structures.find(value=>value.id===worker?.centerId),idle=worker?.idleState,d=idle?.destination,approach=d?.id===idle?.anchorId;
 if(!state.workers.includes(worker)||!PROFILES.some(p=>p.id===worker.profile)||worker.nativeRouteAdmission!=='native-idle-stroll'&&(!pending||worker.nativeRouteAdmission!=='pending-stroll-resources')||worker.status!=='idle'||worker.taskId||worker.crateId||worker.path!==null||worker.running!==false||worker.gateWaiting!==false||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||state.tasks.some(task=>task.workerId===worker.id)||center?.kind!=='center'||center.status!=='intact')throw Error('Invalid native Idle stroll live owner');
 const pose={x:worker.x,z:worker.z,yaw:worker.heading,runPhase:worker.runPhase,walkPhase:worker.walkPhase,carryPhase:worker.carryPhase,runRemaining:worker.runRemaining};
 if(!Object.values(pose).every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||['x','z'].some(k=>Math.abs(pose[k])>=2147483000)||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>pose[k]<0)||!idle||Object.keys(idle).some(k=>!['anchorId','mode','elapsed','remaining','rng','approachRetry','destination'].includes(k))||!/^farm-(plant|structure)-[1-9]\d*$/.test(idle.anchorId)||idle.mode!=='walk'||idle.elapsed!==0||(approach?!Number.isFinite(idle.remaining)||!Number.isFinite(Math.fround(idle.remaining))||idle.remaining<0:idle.remaining!==0)||!Number.isSafeInteger(idle.rng)||idle.rng<0||idle.rng>0xffffffff||!Number.isFinite(idle.approachRetry)||idle.approachRetry<0||!d||Object.keys(d).some(k=>!['id','x','z'].includes(k))||(!approach&&d.id!==`idle-${worker.id}`)||worker.destinationId!==d.id||!['x','z'].every(k=>Number.isFinite(d[k])&&Number.isFinite(Math.fround(d[k]))&&Math.abs(d[k])<2147483000))throw Error('Invalid native Idle stroll live state');
 return {pose,idleState:idle};
}

export function nativeIdleStrollLiveState(state,worker){return strollState(state,worker);}
// This validates semantic values only. Accepting a saved/pending marker here
// does not make a snapshot loadable or grant a native/graphical permission.
export function nativeIdleStrollSavedState(state,worker){return strollState(state,worker,true);}

export function nativeIdleStrollShiftEnded(state,worker){
 return contractExpired(worker,state)||state.time>=profileEnd.get(worker.profile);
}

export function nativeIdleStrollRestoreState(state,worker){
 const semantic=nativeIdleStrollSavedState(state,worker),idle=semantic.idleState,approach=idle.destination.id===idle.anchorId;
 const center=state.structures.find(c=>c.id===worker.centerId);
 const match=/^farm-(plant|structure)-(\d+)$/.exec(idle.anchorId);
 const plant=match?.[1]==='plant'?activeCrops(state.plants).find(p=>p.id===`plant-${match[2]}`&&p.centerId===worker.centerId&&p.alive):null;
 if(!match||match[1]==='plant'&&!plant||match[1]==='structure'&&center.id!==`structure-${match[2]}`)throw Error('Invalid saved native stroll anchor');
 // Loading keeps the saved anchor even when a different crop is nearer now.
 const a=farmIdleAnchor(state,center,plant),anchor={kind:plant?1:2,id:Number(match[2]),x:a.x,z:a.z,radius:a.idleRadius};
 const calibration=LOCOMOTION.sources.find(c=>c.profile===worker.profile);
 if(a.id!==idle.anchorId||!calibration||!['x','z','radius'].every(k=>Number.isFinite(anchor[k]))||anchor.radius<=0||anchor.radius>8||!approach&&Math.hypot(worker.x-anchor.x,worker.z-anchor.z)>anchor.radius||(approach?idle.destination.x!==anchor.x||idle.destination.z!==anchor.z:Math.hypot(idle.destination.x-anchor.x,idle.destination.z-anchor.z)>anchor.radius+1e-9))throw Error('Invalid saved native stroll geometry');
 return {...semantic,anchor,calibration,approach};
}

export function nativeIdleStrollSaveAvailable(state,worker){
 try{
  if(nativeIdleStrollShiftEnded(state,worker))nativeIdleStrollSavedState(state,worker);
  else nativeIdleStrollRestoreState(state,worker);
  return true;
 }catch{return false;}
}
