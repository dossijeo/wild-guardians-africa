// The presented Rapier pose is held discretely until the next confirmed tick.
// Its collider spheres already enclose every shape independent of rotation.
// Union all tick boxes, then reject any other actor whose *entire* path can
// touch the union expanded by its navigation radius. This intentionally
// rejects dense scenes and does not prove interpolation between physics poses.
export function certifyHistoricalPhysicsIsolation(actors,physics,start,end){
 if(!Array.isArray(actors)||actors.length>256||physics?.complete!==true||!Array.isArray(physics.samples)||physics.samples.length<2||physics.samples[0].at!==start||physics.samples.at(-1).at!==end)return false;
 const initial=physics.samples[0];if(initial.poses?.length!==1||initial.bounds?.length!==1)return false;const id=initial.poses[0].actorId,box={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
 for(const frame of physics.samples){const b=frame.bounds?.[0];if(frame.poses?.length!==1||frame.poses[0].actorId!==id||frame.bounds?.length!==1||b?.actorId!==id||![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||b.minX>b.maxX||b.minZ>b.maxZ)return false;box.minX=Math.min(box.minX,b.minX);box.maxX=Math.max(box.maxX,b.maxX);box.minZ=Math.min(box.minZ,b.minZ);box.maxZ=Math.max(box.maxZ,b.maxZ);}
 if(actors.filter(actor=>actor.actorId===id).length!==1)return false;
 const crosses=(x0,z0,x1,z1,r)=>{let lo=0,hi=1;for(const [origin,delta,min,max] of [[x0,x1-x0,box.minX-r,box.maxX+r],[z0,z1-z0,box.minZ-r,box.maxZ+r]]){if(!delta){if(origin<min||origin>max)return false;continue;}const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;}return true;};
 for(const actor of actors){if(actor.actorId===id)continue;if(actor.continuous!==true||actor.timed!==true||!Number.isFinite(actor.radius)||actor.radius<=0||!Array.isArray(actor.segments)||![actor.start?.x,actor.start?.z,actor.end?.x,actor.end?.z].every(Number.isFinite))return false;let x=actor.start.x,z=actor.start.z;if(crosses(x,z,x,z,actor.radius))return false;for(const s of actor.segments){if(![s.x0,s.z0,s.x1,s.z1].every(Number.isFinite)||s.x0!==x||s.z0!==z||crosses(s.x0,s.z0,s.x1,s.z1,actor.radius))return false;x=s.x1;z=s.z1;}if(x!==actor.end.x||z!==actor.end.z)return false;}
 return true;
}
