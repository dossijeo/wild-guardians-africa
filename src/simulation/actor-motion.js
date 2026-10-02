import {edgeDistance} from '../world/footprints.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const radius=a=>a.radius??.28;
// Active worker encounters keep their approved hit/knockback rules. Exhausted
// animals and incapacitated people need physical clearance without another hit.
export function actorBlockers(state,actor,worker){
  const animals=(state.raid?.animals??[]).filter(a=>a!==actor&&a.status!=='gone');
  if(worker)return animals.filter(a=>actor.incapacitated||a.status==='retreating'||a.hitsRemaining<=0);
  return [...animals,...state.workers.filter(w=>w.status!=='home'&&(w.incapacitated||actor.status==='retreating'||actor.hitsRemaining<=0))];
}
export function actorSegmentClear(start,end,actor,blockers){
  return blockers.every(other=>{
    const required=radius(actor)+radius(other),before=distance(start,other);
    // Legacy overlaps can escape continuously, without a position correction.
    if(before<required-1e-8){
      if(distance(start,actor)>1e-9)return false;
      const dx=end.x-start.x,dz=end.z-start.z;
      return (start.x-other.x)*dx+(start.z-other.z)*dz>=-1e-10&&distance(end,other)>=before-1e-8;
    }
    return edgeDistance(start,end,other.x,other.z)>=required-1e-8;
  });
}
export function prepareActorMotion(state,actor,nav,worker){
  const blockers=actorBlockers(state,actor,worker);
  if(!blockers.length)return null;
  const clear=(a,b)=>actorSegmentClear(a,b,actor,blockers);
  if(!actor.path?.length)return clear;
  let rejoin=0;
  while(rejoin<actor.path.length-1&&!clear(actor.path[rejoin],actor.path[rejoin]))rejoin++;
  const next=actor.path[rejoin],length=distance(actor,next);
  if(length<1e-9)return clear;
  const horizon=Math.max(4,...blockers.map(b=>2*(radius(actor)+radius(b))+.2));
  const look=Math.min(length,horizon),goal={x:actor.x+(next.x-actor.x)*look/length,z:actor.z+(next.z-actor.z)*look/length};
  if(clear(actor,goal))return clear;
  if(!clear(goal,goal))return clear;
  const nearby=blockers.filter(b=>edgeDistance(actor,goal,b.x,b.z)<radius(actor)+radius(b)+.1);
  const staticClear=(a,b)=>nav.segmentClear?.(a,b,radius(actor),null,worker)??nav.workerMotionClear?.(a,b,radius(actor))??true;
  const nodes=[{x:actor.x,z:actor.z},goal];
  for(const other of nearby){
    // Circumscribe the clearance disc: chords between adjacent samples must
    // also stay outside it. This margin is routing precision, not a new size.
    const r=(radius(actor)+radius(other)+.02)/Math.cos(Math.PI/16);
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,point={x:other.x+Math.sin(angle)*r,z:other.z+Math.cos(angle)*r};
      if((nav.walkable?.(point.x,point.z,radius(actor),null,worker)??true)&&clear(point,point))nodes.push(point);
    }
  }
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),closed=new Set();costs[0]=0;
  while(closed.size<nodes.length){
    let index=-1;
    for(let i=0;i<nodes.length;i++)if(!closed.has(i)&&(index<0||costs[i]+distance(nodes[i],goal)<costs[index]+distance(nodes[index],goal)))index=i;
    if(index<0||!Number.isFinite(costs[index]))break;
    if(index===1){
      const route=[];for(let i=1;i!==0;i=previous[i])route.unshift(nodes[i]);
      // Retain the authoritative destination and the rest of its static path.
      actor.path=[...route,...actor.path.slice(rejoin+(look===length?1:0))];return clear;
    }
    closed.add(index);
    for(let j=1;j<nodes.length;j++)if(!closed.has(j)){
      const cost=costs[index]+distance(nodes[index],nodes[j]);
      if(cost<costs[j]&&clear(nodes[index],nodes[j])&&staticClear(nodes[index],nodes[j])){costs[j]=cost;previous[j]=index;}
    }
  }
  // A narrow occupied passage waits; neither teleport nor discard the route.
  return clear;
}
