// Private, immutable observation shared by support consumers. External callers
// keep the defensive getPreview() copy; repeated support reads need no cloning.
function freezePreview(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))freezePreview(child);return Object.freeze(value);}
// Ordered consumer for motion already validated by the presentation stream.
// This is an observation feed, not a forecast or permission to ignore physics.
// The caller must synchronize peer bodies, physical poses, visual time and
// invalidations before using a trace to drive a mesh.
export function createConfirmedMotionFeed({onChange=()=>{},prepareTerrainSupport=null,maxActors=256,maxSegments=64}={}){
 if(typeof onChange!=='function'||prepareTerrainSupport!==null&&typeof prepareTerrainSupport!=='function'||!Number.isSafeInteger(maxActors)||maxActors<1||!Number.isSafeInteger(maxSegments)||maxSegments<1)throw TypeError('Invalid confirmed motion feed');
 const actors=new Map();let lastSequence=0,closed=false,world=null,worldBatches=0,preview=null,previewSupport=null;
 function offerPreview(value,boundary){if(closed)throw Error('Motion feed disposed');if(value===null){preview=null;previewSupport=null;return;}if(!Number.isSafeInteger(boundary?.sequence)||!Number.isFinite(boundary.lastElapsed)||value?.sequence!==boundary.sequence+1||value.start!==boundary.lastElapsed||!Number.isFinite(value.end)||value.end<value.start||value.safeForAutonomousPlayback!==false||!Array.isArray(value.reasons)||!value.reasons.includes('visual-time-and-support-unverified'))throw TypeError('Invalid motion preview boundary');const next=freezePreview(structuredClone(value)),support=prepareTerrainSupport?.(next)??null;if(support!==null&&(typeof support.valid!=='function'||support.sequence!==next.sequence||support.start!==next.start||support.end!==next.end||!Array.isArray(support.actors)))throw TypeError('Invalid preview terrain support');preview=next;previewSupport=support;}
 function accept(event){
  if(closed)throw Error('Motion feed disposed');if(!Number.isSafeInteger(event?.sequence)||event.sequence<=lastSequence||!Number.isFinite(event.elapsed)||!Array.isArray(event.pauses))throw TypeError('Invalid ordered motion event');if(preview&&event.sequence>=preview.sequence){preview=null;previewSupport=null;}
  const trace=event.trace,invalidation=event.invalidation,candidateId=invalidation?.actorId??trace?.actorId,paused=event.pauses.length>0;
  if((trace||invalidation)&&(typeof candidateId!=='string'||!candidateId||trace&&invalidation&&trace.actorId!==candidateId))throw TypeError('Invalid motion actor');
  let liveIds=null;if(event.actorIds!==undefined){if(!Array.isArray(event.actorIds)||event.actorIds.some(id=>typeof id!=='string'||!id)||new Set(event.actorIds).size!==event.actorIds.length)throw TypeError('Invalid motion roster');liveIds=new Set(event.actorIds);}
  const id=liveIds&&!liveIds.has(candidateId)?null:candidateId;
  // Until dependencies are certified, any intervening event or terrain
  // change is a boundary for every retained historical trace, not just the
  // actor explicitly named in an invalidation.
  const boundary=event.terrainChanged===true?'terrain-changed':event.eventful===true?'simulation-event':null;
  const poses=event.physicsPoses??(event.physicsPose?[event.physicsPose]:[]);if(!Array.isArray(poses))throw TypeError('Invalid physical pose list');
  const available=event.physicsAvailable??Object.hasOwn(event,'physicsPose');
  const physicalIds=new Set(poses.filter(p=>p?.active===true&&typeof p.actorId==='string').map(p=>p.actorId));if(event.physicsPose?.active===true&&typeof event.physicsPose.actorId==='string')physicalIds.add(event.physicsPose.actorId);
  const retained=liveIds?[...actors.keys()].filter(actorId=>liveIds.has(actorId)).length:actors.size;
  if(id&&!actors.has(id)&&retained>=maxActors)throw Error('Motion actor capacity exceeded');
  if(liveIds)for(const [actorId,previous] of actors)if(!liveIds.has(actorId)){actors.delete(actorId);onChange({...previous,sequence:event.sequence,elapsed:event.elapsed,paused,physical:false,trace:null,representable:false,safeForAutonomousPlayback:false,removed:true,invalidation:{actorId,at:event.elapsed,reason:'actor-removed'}});}
  // This remains a historical observation; even a complete X/Z batch is not
  // a physical-pose, terrain-history or future-movement certificate.
  if(event.worldTrace){const trace=event.worldTrace,changed=trace.rosterChanged||trace.topologyChanged||trace.chunkChanged||trace.terrainChanged||event.terrainChanged===true||event.eventful===true,representable=event.terrainReady===true&&!changed&&!paused&&available&&!physicalIds.size&&trace.physicsActivity?.samplesComplete===true&&trace.physicsActivity.observed===false&&trace.actorTickStates?.complete===true&&trace.actors.every(actor=>actor.continuous&&actor.timed&&actor.segments.length<=maxSegments&&actor.segments.every(segment=>segment.t1>segment.t0));world={sequence:event.sequence,trace,representable,safeForAutonomousPlayback:false};worldBatches++;}else if(world)world=null;
  // On every confirmed publication, physical ownership or pause immediately
  // revokes an earlier trace, even if the publication contains no new trace.
  for(const [actorId,previous] of actors){if(actorId===id)continue;const physical=available?physicalIds.has(actorId):previous.physical,expired=previous.trace!==null&&event.elapsed>previous.trace.end.at+1e-8,revoked=physical||paused||!available||expired||boundary,needsRevocation=revoked&&previous.trace!==null;if(!needsRevocation&&previous.physical===physical&&previous.paused===paused)continue;
   const value={...previous,sequence:event.sequence,elapsed:event.elapsed,paused,physical,...(needsRevocation?{trace:null,representable:false,invalidation:{actorId,at:event.elapsed,reason:physical?'physical-pose':paused?'paused':!available?'physics-unavailable':boundary??'horizon-expired'}}:{})};actors.set(actorId,value);onChange(value);
  }
  let value=null;if(id){const physical=physicalIds.has(id),revoked=!!invalidation||physical||paused||!available||!!boundary;
   const representable=!!trace&&!revoked&&trace.continuous===true&&trace.timed===true&&Array.isArray(trace.segments)&&trace.segments.length<=maxSegments&&trace.segments.every(segment=>segment.t1>segment.t0);
   // A structurally representable trace is historical observation, not an
   // authority to replay it after the rest of the world has advanced.
   value={sequence:event.sequence,elapsed:event.elapsed,paused,actorId:id,trace:revoked?null:trace,invalidation:invalidation??(physical?{actorId:id,at:event.elapsed,reason:'physical-pose'}:paused?{actorId:id,at:event.elapsed,reason:'paused'}:!available?{actorId:id,at:event.elapsed,reason:'physics-unavailable'}:boundary?{actorId:id,at:event.elapsed,reason:boundary}:null),physical,representable,safeForAutonomousPlayback:false};actors.set(id,value);onChange(value);
  }
  lastSequence=event.sequence;return value;
 }
 return {accept,offerPreview,getReadonlyPreview(){return preview;},getPreview(){return preview===null?null:structuredClone(preview);},getPreviewSupport(){return previewSupport?.valid()===true?previewSupport:null;},invalidateTerrain(){if(closed)return false;let changed=preview!==null;preview=null;previewSupport=null;if(world){world.representable=false;world.invalidated='terrain-revision';world.trace=null;world=null;changed=true;}for(const [actorId,previous] of actors){if(!previous.trace)continue;previous.trace=null;previous.representable=false;previous.invalidation={actorId,at:previous.elapsed,reason:'terrain-revision'};onChange(previous);changed=true;}return changed;},get(actorId){return actors.get(actorId)??null;},getWorld(){return world;},status(){return {closed,lastSequence,actors:actors.size,...(preview?{previewSequence:preview.sequence}:{}),...(worldBatches?{worldBatches,worldActors:world?.trace.actors.length??0,worldRepresentable:world?.representable??false}:{})};},dispose(){if(closed)return;closed=true;preview=null;previewSupport=null;world=null;actors.clear();}};
}
