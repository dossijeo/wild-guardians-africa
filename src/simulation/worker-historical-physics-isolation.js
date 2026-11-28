// Stable IDs for the physical participants described by an authority proof.
// Version 1 remains valid for recordings containing a single isolated body.
export function historicalPhysicalActorIds(trace){
 const proof=trace?.physicalIsolationEvidence,frames=trace?.physicsPoseSamples;
 if(!proof||!Array.isArray(trace?.actors)||proof.start!==trace.start||proof.end!==trace.end||proof.actors!==trace.actors.length||frames?.complete!==true)return [];
 const ids=proof.version===1?[proof.actorId]:proof.version===2?proof.actorIds:null,poses=frames.samples?.[0]?.poses;
 if(!Array.isArray(ids)||!ids.length||ids.length>128||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||!Array.isArray(poses)||poses.length!==ids.length||poses.some((pose,i)=>pose.actorId!==ids[i]))return [];
 return ids;
}

// Hold each confirmed Rapier pose until its next tick. Never interpolate a
// contact or invent a collision result. Whole-interval envelopes must be
// disjoint from each other and every ordinary actor path. Dense/interacting
// bodies and lifecycle transitions use the confirmed-boundary presentation.
export function certifyHistoricalPhysicsIsolation(actors,physics,start,end){
 if(!Array.isArray(actors)||actors.length>256||physics?.complete!==true||!Array.isArray(physics.samples)||physics.samples.length<2||physics.samples.length>128||physics.samples[0].at!==start||physics.samples.at(-1).at!==end)return false;
 const initial=physics.samples[0],ids=initial.poses?.map(pose=>pose.actorId);
 if(!ids?.length||ids.length>128||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||initial.bounds?.length!==ids.length)return false;
 const boxes=ids.map(()=>({minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity}));let checks=0;
 for(const frame of physics.samples){if(frame.poses?.length!==ids.length||frame.bounds?.length!==ids.length)return false;for(let i=0;i<ids.length;i++){const b=frame.bounds[i],box=boxes[i];if(frame.poses[i]?.actorId!==ids[i]||b?.actorId!==ids[i]||![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||b.minX>b.maxX||b.minZ>b.maxZ)return false;box.minX=Math.min(box.minX,b.minX);box.maxX=Math.max(box.maxX,b.maxX);box.minZ=Math.min(box.minZ,b.minZ);box.maxZ=Math.max(box.maxZ,b.maxZ);}}
 if(ids.some(id=>actors.filter(actor=>actor.actorId===id).length!==1))return false;
 for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++){const a=boxes[i],b=boxes[j];if(a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ)return false;}
 const crosses=(box,x0,z0,x1,z1,r)=>{let lo=0,hi=1;for(const [origin,delta,min,max] of [[x0,x1-x0,box.minX-r,box.maxX+r],[z0,z1-z0,box.minZ-r,box.maxZ+r]]){if(!delta){if(origin<min||origin>max)return false;continue;}const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;}return true;};
 for(const actor of actors){if(ids.includes(actor.actorId))continue;if(actor.continuous!==true||actor.timed!==true||!Number.isFinite(actor.radius)||actor.radius<=0||!Array.isArray(actor.segments)||![actor.start?.x,actor.start?.z,actor.end?.x,actor.end?.z].every(Number.isFinite))return false;for(const box of boxes){let x=actor.start.x,z=actor.start.z;if(++checks>100000||crosses(box,x,z,x,z,actor.radius))return false;for(const s of actor.segments){if(++checks>100000||![s.x0,s.z0,s.x1,s.z1].every(Number.isFinite)||s.x0!==x||s.z0!==z||crosses(box,s.x0,s.z0,s.x1,s.z1,actor.radius))return false;x=s.x1;z=s.z1;}if(x!==actor.end.x||z!==actor.end.z)return false;}}
 return true;
}
