import {historicalInactiveActor} from '../simulation/historical-inactive-actors.js';
import {actorTickState} from '../simulation/worker-actor-tick-states.js';

// A short stationary fallback keeps the already displayed pose until the next
// confirmed publication. It is never used for displacement, physical poses,
// unobserved actions or ambiguous observations. Harvest and crate pickup are
// admitted only with a stable, fully sampled task and a validated bake.
// Hidden actors still participate in the
// complete roster/collision certificate but do not require a visual rig.
export function confirmedHistoricalParticipant(preview,actorId,entity,kind,tasks=[]){
 const trace=preview?.trace,paths=trace?.actors?.filter(item=>item.actorId===actorId),ticks=trace?.actorTickStates;
 if(!entity||entity.id!==actorId||!['animal','worker'].includes(kind)||paths?.length!==1||ticks?.complete!==true||!Array.isArray(ticks.actors))return null;
 const matches=ticks.actors.filter(item=>item.actorId===actorId),path=paths[0];if(matches.length!==1||!Array.isArray(matches[0].samples)||!Array.isArray(path.segments)||!path.start||!path.end)return null;
 if(path.continuous!==true||path.timed!==true||path.start.at!==preview.start||path.end.at!==preview.end)return null;
 const samples=matches[0].samples,first=samples[0],last=samples.at(-1),hiddenStatus=kind==='animal'?'gone':'home';
 if(samples.length<2||first?.at!==preview.start||last?.at!==preview.end||!Number.isFinite(preview.start)||!Number.isFinite(preview.end)||preview.end<=preview.start)return null;
 const stationary=path.start.x===path.end.x&&path.start.z===path.end.z&&path.segments.every(segment=>segment.x0===path.start.x&&segment.x1===path.start.x&&segment.z0===path.start.z&&segment.z1===path.start.z);
 if(!stationary){
  const allowed=kind==='animal'?['walking','entering','retreating']:['walking','arriving','returning','fleeing'],keys=['status','running','gateWaiting','incapacitated','recovery','recoveryExiting','falling','taskId','animation','idleMode','pathActive','pathPresent'],current=actorTickState(entity,preview.start,tasks),phase=kind==='animal'?'motionPhase':first?.running?'runPhase':'walkPhase',idleWalk=kind==='worker'&&['idle','waiting'].includes(first?.status)&&first.idleMode==='walk'&&!first.running;
  if(!allowed.includes(first?.status)&&!idleWalk||first.status!==entity.status||path.startStatus!==first.status||path.endStatus!==first.status||first.x!==entity.x||first.z!==entity.z||first.x!==path.start.x||first.z!==path.start.z||first.falling||first.recovery||first.incapacitated||first.gateWaiting||keys.some(key=>first[key]!==current[key])||first[phase]!==current[phase])return null;
  if(samples.some((sample,index)=>![sample?.at,sample?.x,sample?.z].every(Number.isFinite)||index&&sample.at<=samples[index-1].at||keys.some(key=>sample[key]!==first[key])||sample[phase]!==null&&(!Number.isFinite(sample[phase])||sample[phase]<0)||index&&sample[phase]!==null&&samples[index-1][phase]!==null&&sample[phase]<samples[index-1][phase]||(sample[phase]===null)!==(first[phase]===null)))return null;
  return 'moving';
 }
 if(!Number.isFinite(first.x)||!Number.isFinite(first.z)||first.x!==entity.x||first.z!==entity.z||first.status!==entity.status||path.startStatus!==entity.status||path.endStatus!==entity.status)return null;
 const keys=['x','z','status','yaw','heading','running','gateWaiting','incapacitated','recovery','recoveryExiting','falling','taskId','animation','idleMode','walkPhase','runPhase','carryPhase','motionPhase','pathActive','pathPresent'];
 const current=actorTickState(entity,preview.start,tasks);if(keys.some(key=>first[key]!==current[key])||first.idleElapsed!==current.idleElapsed||samples.some((sample,index)=>!Number.isFinite(sample?.at)||index&&sample.at<=samples[index-1].at||keys.some(key=>sample[key]!==first[key]))||path.start.x!==first.x||path.start.z!==first.z)return null;
 if(first.status===hiddenStatus)return historicalInactiveActor(path,ticks,preview.start,preview.end)?'hidden':null;
 const clock=preview.clockSegments;if(!clock?.complete||clock.start!==preview.start||clock.end!==preview.end||!Array.isArray(clock.segments)||!clock.segments.length||clock.segments.some(segment=>!Number.isFinite(segment.realDuration)||segment.realDuration<=0)||clock.segments.reduce((sum,segment)=>sum+segment.realDuration,0)>.100000001)return null;
 const harvest=kind==='worker'&&first.status==='acting'&&['harvest','crate'].includes(first.actionTaskKind)&&typeof first.actionTargetId==='string'&&first.actionTargetId.length>0&&first.taskId!==null&&Number.isFinite(first.actionRemaining)&&first.actionRemaining>0&&first.actionRemaining===current.actionRemaining&&first.actionTaskKind===current.actionTaskKind&&first.actionTargetId===current.actionTargetId&&samples.every((sample,index)=>sample.actionTaskKind===first.actionTaskKind&&sample.actionTargetId===first.actionTargetId&&Number.isFinite(sample.actionRemaining)&&sample.actionRemaining>0&&(!index||sample.actionRemaining<=samples[index-1].actionRemaining));
 const allowed=kind==='animal'?['waiting','walking','entering','retreating']:['idle','waiting','walking','arriving','returning'];
 if(!allowed.includes(first.status)&&!harvest||first.incapacitated||first.recovery||first.recoveryExiting||first.gateWaiting||first.falling||entity.recovery||entity.fallRemaining>0||entity.incapacitated)return null;
 // A waiting animal chooses a different pose depending on whether it has a
 // path. Require the authority to capture that dependency explicitly.
 if(kind==='animal'&&first.status==='waiting'&&(typeof first.pathPresent!=='boolean'||first.pathPresent!==!!entity.path))return null;
 return 'stationary';
}
