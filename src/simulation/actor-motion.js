import {edgeDistance} from '../world/footprints.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const radius=a=>a.radius??.28;
const blockedDetours=new WeakMap();
const pendingDetours=new WeakMap();
// Match the native search corridor (32 grid cells). Bodies whose clearance
// discs cannot touch it cannot change this search, even while moving elsewhere.
function detourBodies(actor,goal,blockers){
  const minX=Math.min(Math.round(actor.x),Math.round(goal.x))-32,maxX=Math.max(Math.round(actor.x),Math.round(goal.x))+32;
  const minZ=Math.min(Math.round(actor.z),Math.round(goal.z))-32,maxZ=Math.max(Math.round(actor.z),Math.round(goal.z))+32;
  return blockers.filter(b=>{const reach=radius(actor)+radius(b);return b.x+reach>=minX&&b.x-reach<=maxX&&b.z+reach>=minZ&&b.z-reach<=maxZ;});
}
const detourKey=(actor,goal,blockers,nav,worker)=>JSON.stringify([nav.version,worker,actor.x,actor.z,goal.x,goal.z,blockers.map(b=>[b.id,Math.floor(b.x*4),Math.floor(b.z*4),radius(b)])]);
const exactDetourKey=(key,blockers)=>JSON.stringify([key,blockers.map(b=>[b.x,b.z])]);
// The small disc graph cannot route around a solid corner next to a fallen
// worker. Use the native terrain search only after that graph fails. Dynamic
// caches belong to this attempt, never to the shared static navigation graph.
function terrainDetour(actor,goal,blockers,nav,worker,clear){
  if(!nav.findPathSteps)return null;
  blockers=detourBodies(actor,goal,blockers);
  const key=detourKey(actor,goal,blockers,nav,worker);
  const exactKey=exactDetourKey(key,blockers);
  if(blockedDetours.get(actor)===exactKey)return null;
  let pending=pendingDetours.get(actor);
  if(!pending||pending.key!==key){
  const origin={x:actor.x,z:actor.z,radius:radius(actor)},snapshot=blockers.map(b=>({x:b.x,z:b.z,radius:radius(b)}));
  const snapshotClear=(a,b)=>actorSegmentClear(a,b,origin,snapshot);
  const search=Object.assign(Object.create(Object.getPrototypeOf(nav)),nav,{
    preparedPaths:null,walkCache:new Map(),segmentCache:new Map(),failedPaths:new Set(),closedRegions:new Map(),searchedRegions:[],searchNeighborCache:new Map(),portalGraphs:new Map(),
    testWalkable:(x,z,r,ignore,w)=>nav.walkable(x,z,r,ignore,w)&&snapshotClear({x,z},{x,z}),
    testSegmentClear:(a,b,r,ignore,w)=>nav.segmentClear(a,b,r,ignore,w)&&snapshotClear(a,b)
  });
  pending={key,exactKey,iterator:search.findPathSteps(origin,{...goal},radius(actor),null,worker,32)};
  pendingDetours.set(actor,pending);
  }
  // One bounded search slice per blocked simulation step. No long synchronous
  // A* on the rendering thread; stationary failures are not retried each frame.
  const step=pending.iterator.next();if(!step.done)return null;
  pendingDetours.delete(actor);
  let path=step.value;
  if(path){let before=actor;for(const point of path){if(!clear(before,point)){path=null;break;}before=point;}}
  if(!path&&pending.exactKey===exactKey)blockedDetours.set(actor,exactKey);else blockedDetours.delete(actor);
  return path;
}
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
  const horizon=Math.max(4,...blockers.map(b=>2*(radius(actor)+radius(b))+.2));
  let rejoin=0;
  // Occupied distant bends still belong to the static route. Approach them
  // before replacing connectors; a body far away must not trigger local yields.
  if(distance(actor,actor.path[0])<=horizon)while(rejoin<actor.path.length-1&&!clear(actor.path[rejoin],actor.path[rejoin]))rejoin++;
  const next=actor.path[rejoin],length=distance(actor,next);
  if(length<1e-9)return clear;
  let look=Math.min(length,horizon),goal={x:actor.x+(next.x-actor.x)*look/length,z:actor.z+(next.z-actor.z)*look/length};
  const staticClear=(a,b)=>nav.segmentClear?.(a,b,radius(actor),null,worker)??nav.workerMotionClear?.(a,b,radius(actor))??true;
  const yieldToOpposing=()=>{
    const opposing=blockers.find(other=>distance(actor,other)<=horizon&&edgeDistance(actor,goal,other.x,other.z)<radius(actor)+radius(other)+.1&&
      other.path?.length&&String(actor.id)>String(other.id)&&
      (next.x-actor.x)*(other.path[0].x-other.x)+(next.z-actor.z)*(other.path[0].z-other.z)<0);
    if(!opposing)return;
    const angle=Math.atan2(actor.x-opposing.x,actor.z-opposing.z),r=radius(actor)+radius(opposing)+.5;
    for(const offset of [0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4]){
      const point={x:actor.x+Math.sin(angle+offset)*r,z:actor.z+Math.cos(angle+offset)*r};
      if(clear(actor,point)&&staticClear(actor,point)){actor.path=[point,...actor.path];return;}
    }
  };
  // Old saves may retain a long connector created by a remote yield. Repair
  // its next local section through native terrain search before advancing;
  // never let the occupied endpoint justify crossing a prop on the way back.
  if(!rejoin&&length>horizon&&!clear(next,next)&&!staticClear(actor,goal)){
    if(!(nav.walkable?.(goal.x,goal.z,radius(actor),null,worker)??true)){
      for(const candidate of [Math.min(length,look+horizon),Math.min(length,look+2*horizon)]){
        const point={x:actor.x+(next.x-actor.x)*candidate/length,z:actor.z+(next.z-actor.z)*candidate/length};
        if(clear(point,point)&&(nav.walkable?.(point.x,point.z,radius(actor),null,worker)??true)){look=candidate;goal=point;break;}
      }
    }
    const detour=terrainDetour(actor,goal,blockers,nav,worker,clear);
    if(detour)actor.path=[...detour,...actor.path];
    return (a,b)=>clear(a,b)&&staticClear(a,b);
  }
  // Skipping occupied bends creates a new connector. Its tail beyond the
  // local lookahead must also be clear before it can replace the saved route.
  if(rejoin&&look<length&&!staticClear(goal,next)){look=length;goal={x:next.x,z:next.z};}
  if(clear(actor,goal)&&(!rejoin||staticClear(actor,goal))){
    // A later waypoint can be clear while the retained first waypoint is inside
    // another actor. Commit the safe rejoin instead of repeatedly waiting at it.
    if(rejoin)actor.path=[goal,...actor.path.slice(rejoin+(look===length?1:0))];
    return clear;
  }
  if(!clear(goal,goal)){
    // Dense opposing traffic can occupy every short lookahead goal at once.
    // Find a clear point further along the same authoritative segment, then
    // route around the bodies; neither their size nor the destination changes.
    const initial=look;
    for(const candidate of [...new Set([Math.min(length,initial+horizon),Math.min(length,initial+2*horizon),length])]){
      const point={x:actor.x+(next.x-actor.x)*candidate/length,z:actor.z+(next.z-actor.z)*candidate/length};
      if(clear(point,point)){look=candidate;goal=point;break;}
    }
    // A short retained exit can be entirely occupied by opposing traffic.
    // Give its elected actor the same verified yield used after graph search;
    // returning here first made both bodies wait forever at the saved route.
    if(!clear(goal,goal)){yieldToOpposing();return clear;}
  }
  const localBlockers=detourBodies(actor,goal,blockers),key=detourKey(actor,goal,localBlockers,nav,worker);
  if(pendingDetours.get(actor)?.key===key||blockedDetours.get(actor)===exactDetourKey(key,localBlockers)){
    // The same disc graph already failed. Resume its bounded terrain search,
    // rather than rebuilding every local edge while the actor waits.
    const detour=terrainDetour(actor,goal,blockers,nav,worker,clear);
    if(detour)actor.path=[...detour,...actor.path.slice(rejoin+(look===length?1:0))];
    else yieldToOpposing();
    return clear;
  }
  const nearby=blockers.filter(b=>edgeDistance(actor,goal,b.x,b.z)<radius(actor)+radius(b)+.1);
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
  // Opposing traffic beside a solid corner may have no room to pass directly.
  // One actor yields into verified free space while retaining its full route.
  // Stable identity chooses only one side; stationary bodies never cause this.
  const detour=terrainDetour(actor,goal,blockers,nav,worker,clear);
  if(detour){actor.path=[...detour,...actor.path.slice(rejoin+(look===length?1:0))];return clear;}
  yieldToOpposing();
  // A narrow occupied passage waits; neither teleport nor discard the route.
  return clear;
}
