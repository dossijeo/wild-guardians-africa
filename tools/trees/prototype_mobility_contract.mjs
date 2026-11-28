// Experimental presentation contract. The caller supplies only confirmed
// instructions and simulation time; this module does not simulate collisions.
const finite=value=>Number.isFinite(value);
const validId=value=>typeof value==='string'&&value.length>0;
const validVersion=value=>Number.isSafeInteger(value)&&value>0;
const point=value=>{
  if(!value||!finite(value.x)||!finite(value.z))throw new TypeError('Invalid trajectory point');
  return Object.freeze({x:value.x,z:value.z});
};

export function createTrajectoryReceiver(session){
  if(!validId(session))throw new TypeError('Invalid session');
  const entries=new Map();
  function apply(event,simulationTime){
    if(!event||!validId(event.session)||!validId(event.actorId)||!validVersion(event.version))throw new TypeError('Invalid instruction identity');
    if(!finite(simulationTime)||simulationTime<0)throw new TypeError('Invalid application time');
    if(event.session!==session)return {accepted:false,reason:'session'};
    const previous=entries.get(event.actorId);
    if(previous&&event.version<=previous.version)return {accepted:false,reason:'stale'};
    if(previous&&simulationTime<previous.appliedAt)throw new TypeError('Simulation time moved backwards');
    let next;
    if(event.kind==='trajectory'){
      if(!finite(event.startTime)||event.startTime<0||event.startTime>simulationTime||!Array.isArray(event.points)||!Array.isArray(event.durations)||event.points.length<2||event.durations.length!==event.points.length-1||!validId(event.movementMode)||!validId(event.animationState))throw new TypeError('Invalid trajectory');
      const points=Object.freeze(event.points.map(point)),durations=Object.freeze(event.durations.map(value=>{if(!finite(value)||value<=0)throw new TypeError('Invalid segment duration');return value;}));
      let endTime=event.startTime;for(const duration of durations){const next=endTime+duration;if(!finite(next)||next<=endTime)throw new TypeError('Invalid trajectory end time');endTime=next;}
      next=Object.freeze({kind:event.kind,version:event.version,appliedAt:simulationTime,startTime:event.startTime,endTime,points,durations,movementMode:event.movementMode,animationState:event.animationState});
    }else if(event.kind==='stop'){
      if(!finite(event.at)||event.at<0||event.at>simulationTime||!validId(event.animationState))throw new TypeError('Invalid stop');
      next=Object.freeze({kind:event.kind,version:event.version,appliedAt:simulationTime,at:event.at,point:point(event.point),animationState:event.animationState});
    }else if(event.kind==='remove'){if(!finite(event.at)||event.at<0||event.at>simulationTime)throw new TypeError('Invalid removal');next=Object.freeze({kind:event.kind,version:event.version,appliedAt:simulationTime});}
    else throw new TypeError('Unknown instruction');
    entries.set(event.actorId,next);return {accepted:true};
  }
  function sample(actorId,simulationTime){
    if(!validId(actorId)||!finite(simulationTime)||simulationTime<0)throw new TypeError('Invalid sample');
    const entry=entries.get(actorId);if(!entry)return null;
    if(simulationTime<entry.appliedAt)throw new TypeError('Sample precedes applied instruction');
    if(entry.kind==='remove')return null;
    if(entry.kind==='stop')return {version:entry.version,x:entry.point.x,z:entry.point.z,animationState:entry.animationState,movementMode:'stopped'};
    let remaining=Math.max(0,Math.min(simulationTime-entry.startTime,entry.endTime-entry.startTime));
    for(let i=0;i<entry.durations.length;i++){
      const duration=entry.durations[i];
      if(remaining<=duration||i===entry.durations.length-1){
        const t=Math.max(0,Math.min(1,remaining/duration)),a=entry.points[i],b=entry.points[i+1];
        return {version:entry.version,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,animationState:entry.animationState,movementMode:entry.movementMode};
      }
      remaining-=duration;
    }
    throw Error('Unreachable trajectory segment');
  }
  return {apply,sample};
}
