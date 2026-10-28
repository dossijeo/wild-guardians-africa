import bank from '../../content/manifests/worker-recovery.json' with {type:'json'};
export const WORKER_RECOVERY=bank.profiles;
// Advance a downed worker before navigation or work can move it. Plain state
// fields survive saves; no render clock, callbacks or physics objects are stored.
export function advanceWorkerRecovery(worker,dt,nav){
 if(!(dt>=0&&Number.isFinite(dt)))throw Error('Invalid worker recovery step');
 if(worker.fallRemaining>0){
  const spent=Math.min(dt,worker.fallRemaining);worker.fallRemaining-=spent;dt-=spent;
  worker.downHeading??=worker.heading??0;
  if(worker.fallRemaining>0)return true;
  const spec=WORKER_RECOVERY[worker.profile];if(!spec)throw Error('Missing worker recovery profile');
  const heading=worker.downHeading,c=Math.cos(heading),s=Math.sin(heading),[x,,z]=spec.finalOffset;
  const dx=x*c+z*s,dz=z*c-x*s;let fraction=0;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
  for(let i=1;i<=steps;i++){
   const f=i/steps,next={x:worker.x+dx*f,z:worker.z+dz*f},previous={x:worker.x+dx*fraction,z:worker.z+dz*fraction};
   if(!nav.walkable(next.x,next.z,.28,null,true)||nav.workerMotionClear&&!nav.workerMotionClear(previous,next,.28))break;
   fraction=f;
  }
  worker.recovery={elapsed:0,duration:spec.duration,heading,dx:dx*fraction,dz:dz*fraction,fraction};
  worker.path=null;
 }
 const recovery=worker.recovery;if(!recovery)return false;
 recovery.elapsed=Math.min(recovery.duration,recovery.elapsed+dt);
 if(recovery.elapsed>=recovery.duration){
  worker.x+=recovery.dx;worker.z+=recovery.dz;worker.heading=recovery.heading;
  worker.path=null;worker.pathVersion=-1;delete worker.recovery;delete worker.downHeading;
 }
 return true;
}
