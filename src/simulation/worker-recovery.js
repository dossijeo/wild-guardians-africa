import bank from '../../content/manifests/worker-recovery.json' with {type:'json'};
export const WORKER_RECOVERY=bank.profiles;
export const RECOVERY_EXIT_SECONDS=.24;
export const workerRecoveryExitRemaining=age=>Math.max(0,RECOVERY_EXIT_SECONDS-age);

export function woundedHomeSourceCurrent(state,worker,{recoveryHit,requestedAt},age){
 return !!recoveryHit&&age>=0&&!state.raid&&worker?.status==='incapacitated'&&
  worker.incapacitated===true&&worker.hits===2&&!worker.recovery&&!worker.fallRemaining&&
  worker.recoveryExitRemaining===workerRecoveryExitRemaining(age)&&
  state.events?.some(event=>event.type==='WorkerIncapacitated'&&event.targetId===worker.id&&
    event.id==='event-'+recoveryHit&&event.simulationTime<=requestedAt)===true;
}

function rootOffset(spec,heading){
 const c=Math.cos(heading),s=Math.sin(heading),[x,,z]=spec.finalOffset;
 return {dx:x*c+z*s,dz:z*c-x*s};
}

function blockedRootTravel(worker,nav,{dx,dz},from,to){
 let reached=from;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)*(to-from)/.08));
 for(let i=1;i<=steps;i++){
  const f=from+(to-from)*i/steps;
  const previous={x:worker.x+dx*reached,z:worker.z+dz*reached};
  const next={x:worker.x+dx*f,z:worker.z+dz*f};
  if(!nav.walkable(next.x,next.z,.28,null,true)||nav.workerMotionClear&&!nav.workerMotionClear(previous,next,.28))return reached;
  reached=f;
 }
}

// Predict the next phase and final body position using confirmed terrain.
// A terrain query that throws leaves the current phase available for retry.
export function prepareWorkerRecovery(worker,dt,nav){
 if(!(dt>=0&&Number.isFinite(dt)))throw Error('Invalid worker recovery step');
 const exit=worker.recoveryExitRemaining>0?Math.max(0,worker.recoveryExitRemaining-dt):null;
 if(!(worker.fallRemaining>0)&&!worker.recovery&&exit===null)return null;
 let fall=null,recovery=worker.recovery,offset;
 if(worker.fallRemaining>0){
  const spent=Math.min(dt,worker.fallRemaining);
  fall={remaining:worker.fallRemaining-spent,heading:worker.downHeading??worker.heading??0};
  dt-=spent;
  if(fall.remaining>0)return {exit,fall,recovery:null,destination:null};
  const spec=WORKER_RECOVERY[worker.profile];
  if(!spec)throw Error('Missing worker recovery profile');
  offset=rootOffset(spec,fall.heading);
  const fraction=blockedRootTravel(worker,nav,offset,0,1)??1;
  recovery={elapsed:0,duration:spec.duration,heading:fall.heading,
   dx:offset.dx*fraction,dz:offset.dz*fraction,fraction};
 }else if(recovery)recovery={...recovery};
 if(!recovery)return {exit,fall,recovery:null,destination:null};
 const previousTime=recovery.elapsed/recovery.duration;
 const previousMix=previousTime*previousTime*(3-2*previousTime);
 recovery.elapsed=Math.min(recovery.duration,recovery.elapsed+dt);
 const time=recovery.elapsed/recovery.duration,mix=time*time*(3-2*time);
 // Recheck the remaining root travel against current geometry. A wall/gate
 // can change after the initial sweep. Once blocked, hold the attained root
 // displacement while the pose continues rising; never snap back to its start.
 if(mix>previousMix&&recovery.fraction>0){
  offset??=rootOffset(WORKER_RECOVERY[worker.profile],recovery.heading);
  const from=recovery.travelLimit??recovery.fraction*previousMix;
  const to=recovery.travelLimit??recovery.fraction*mix;
  const limit=blockedRootTravel(worker,nav,offset,from,to);
  if(limit!==undefined)recovery.travelLimit=limit;
  if(recovery.travelLimit!==undefined){
   recovery.fraction=recovery.travelLimit/mix;
   recovery.dx=offset.dx*recovery.fraction;
   recovery.dz=offset.dz*recovery.fraction;
  }
 }
 const destination=recovery.elapsed>=recovery.duration?
  {x:worker.x+recovery.dx,z:worker.z+recovery.dz,heading:recovery.heading}:null;
 return {exit,fall,recovery,destination};
}

// Plain state fields survive saves. The prepared phase has no render clock
// and the body does not adopt the root displacement until the rise completes.
export function applyWorkerRecovery(worker,prepared){
 if(!prepared)return false;
 const {exit,fall,recovery,destination}=prepared;
 if(fall){
  delete worker.recoveryExitRemaining;
  worker.fallRemaining=fall.remaining;
  worker.downHeading=fall.heading;
 }else if(exit!==null)worker.recoveryExitRemaining=exit;
 if(!recovery)return !!fall;
 if(fall){worker.recovery=recovery;worker.path=null;}
 else Object.assign(worker.recovery,recovery);
 if(destination){
  Object.assign(worker,destination);
  worker.path=null;worker.pathVersion=-1;worker.recoveryExitRemaining=RECOVERY_EXIT_SECONDS;delete worker.recovery;delete worker.downHeading;
 }
 return true;
}

export function advanceWorkerRecovery(worker,dt,nav){
 return applyWorkerRecovery(worker,prepareWorkerRecovery(worker,dt,nav));
}
