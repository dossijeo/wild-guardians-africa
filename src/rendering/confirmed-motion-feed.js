// Ordered consumer for motion already validated by the presentation stream.
// This is an observation feed, not a forecast or permission to ignore physics.
// The caller must synchronize peer bodies, physical poses, visual time and
// invalidations before using a trace to drive a mesh.
export function createConfirmedMotionFeed({onChange=()=>{},maxActors=256,maxSegments=64}={}){
 if(typeof onChange!=='function'||!Number.isSafeInteger(maxActors)||maxActors<1||!Number.isSafeInteger(maxSegments)||maxSegments<1)throw TypeError('Invalid confirmed motion feed');
 const actors=new Map();let lastSequence=0,closed=false;
 function accept(event){
  if(closed)throw Error('Motion feed disposed');if(!Number.isSafeInteger(event?.sequence)||event.sequence<=lastSequence||!Number.isFinite(event.elapsed)||!Array.isArray(event.pauses))throw TypeError('Invalid ordered motion event');
  const trace=event.trace,invalidation=event.invalidation,id=invalidation?.actorId??trace?.actorId,paused=event.pauses.length>0;
  if((trace||invalidation)&&(typeof id!=='string'||!id||trace&&invalidation&&trace.actorId!==id))throw TypeError('Invalid motion actor');
  if(id&&!actors.has(id)&&actors.size>=maxActors)throw Error('Motion actor capacity exceeded');
  const poses=event.physicsPoses??(event.physicsPose?[event.physicsPose]:[]);if(!Array.isArray(poses))throw TypeError('Invalid physical pose list');
  const available=event.physicsAvailable??Object.hasOwn(event,'physicsPose');
  const physicalIds=new Set(poses.filter(p=>p?.active===true&&typeof p.actorId==='string').map(p=>p.actorId));if(event.physicsPose?.active===true&&typeof event.physicsPose.actorId==='string')physicalIds.add(event.physicsPose.actorId);
  // On every confirmed publication, physical ownership or pause immediately
  // revokes an earlier trace, even if the publication contains no new trace.
  for(const [actorId,previous] of actors){if(actorId===id)continue;const physical=available?physicalIds.has(actorId):previous.physical,expired=previous.trace!==null&&event.elapsed>previous.trace.end.at+1e-8,revoked=physical||paused||!available||expired,needsRevocation=revoked&&previous.trace!==null;if(!needsRevocation&&previous.physical===physical&&previous.paused===paused)continue;
   const value={...previous,sequence:event.sequence,elapsed:event.elapsed,paused,physical,...(needsRevocation?{trace:null,representable:false,invalidation:{actorId,at:event.elapsed,reason:physical?'physical-pose':paused?'paused':!available?'physics-unavailable':'horizon-expired'}}:{})};actors.set(actorId,value);onChange(value);
  }
  let value=null;if(id){const physical=physicalIds.has(id),revoked=!!invalidation||physical||paused||!available;
   const representable=!!trace&&!revoked&&trace.continuous===true&&trace.timed===true&&Array.isArray(trace.segments)&&trace.segments.length<=maxSegments&&trace.segments.every(segment=>segment.t1>segment.t0);
   // A structurally representable trace is historical observation, not an
   // authority to replay it after the rest of the world has advanced.
   value={sequence:event.sequence,elapsed:event.elapsed,paused,actorId:id,trace:revoked?null:trace,invalidation:invalidation??(physical?{actorId:id,at:event.elapsed,reason:'physical-pose'}:paused?{actorId:id,at:event.elapsed,reason:'paused'}:!available?{actorId:id,at:event.elapsed,reason:'physics-unavailable'}:null),physical,representable,safeForAutonomousPlayback:false};actors.set(id,value);onChange(value);
  }
  lastSequence=event.sequence;return value;
 }
 return {accept,get(actorId){return actors.get(actorId)??null;},status(){return {closed,lastSequence,actors:actors.size};},dispose(){if(closed)return;closed=true;actors.clear();}};
}
