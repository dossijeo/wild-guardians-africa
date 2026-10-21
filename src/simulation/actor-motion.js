import {edgeDistance} from '../world/footprints.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const radius=a=>a.radius??.28;
const bodyCellSize=10;
const bodyCell=(x,z)=>`${Math.floor(x/bodyCellSize)},${Math.floor(z/bodyCellSize)}`;
// The worker pass advances in roster order. Keep bucket membership current
// after each actor so local queries see exactly the same positions as a scan.
export function createWorkerBodyIndex(workers){
  const buckets=new Map(),cells=new Array(workers.length),indicesByWorker=new WeakMap();
  let maxRadius=0;
  for(let i=0;i<workers.length;i++){
    const w=workers[i];indicesByWorker.set(w,i);maxRadius=Math.max(maxRadius,radius(w));
    if(!Number.isFinite(w.x)||!Number.isFinite(w.z))continue;
    const key=bodyCell(w.x,w.z);cells[i]=key;
    let bucket=buckets.get(key);if(!bucket)buckets.set(key,bucket=new Set());
    bucket.add(i);
  }
  return {
    update(worker){
      const i=indicesByWorker.get(worker);if(i===undefined)return;
      maxRadius=Math.max(maxRadius,radius(worker));
      const previous=cells[i],next=Number.isFinite(worker.x)&&Number.isFinite(worker.z)?bodyCell(worker.x,worker.z):undefined;
      if(previous===next)return;
      if(previous!==undefined){const bucket=buckets.get(previous);bucket.delete(i);if(!bucket.size)buckets.delete(previous);}
      cells[i]=next;
      if(next!==undefined){let bucket=buckets.get(next);if(!bucket)buckets.set(next,bucket=new Set());bucket.add(i);}
    },
    nearby(actor,range){
      if(!Number.isFinite(actor.x)||!Number.isFinite(actor.z))return workers;
      const reach=range+radius(actor)+maxRadius,
        minX=Math.floor((actor.x-reach)/bodyCellSize),maxX=Math.floor((actor.x+reach)/bodyCellSize),
        minZ=Math.floor((actor.z-reach)/bodyCellSize),maxZ=Math.floor((actor.z+reach)/bodyCellSize),indices=[];
      for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
        const bucket=buckets.get(`${x},${z}`);if(bucket)indices.push(...bucket);
      }
      indices.sort((a,b)=>a-b);
      return indices.map(i=>workers[i]);
    }
  };
}
const blockedDetours=new WeakMap();
const pendingDetours=new WeakMap();
// Match the native search corridor (32 grid cells). Bodies whose clearance
// discs cannot touch it cannot change this search, even while moving elsewhere.
function detourBodies(actor,goal,blockers){
  const minX=Math.min(Math.round(actor.x),Math.round(goal.x))-32,maxX=Math.max(Math.round(actor.x),Math.round(goal.x))+32;
  const minZ=Math.min(Math.round(actor.z),Math.round(goal.z))-32,maxZ=Math.max(Math.round(actor.z),Math.round(goal.z))+32;
  return blockers.filter(b=>{const reach=radius(actor)+radius(b);return b.x+reach>=minX&&b.x-reach<=maxX&&b.z+reach>=minZ&&b.z-reach<=maxZ;});
}
const detourKey=(actor,goal,blockers,nav,worker)=>JSON.stringify([nav.version,
  nav.routeStamp?.().chunks??null,worker,actor.x,actor.z,goal.x,goal.z,
  blockers.map(b=>[b.id,Math.floor(b.x*4),Math.floor(b.z*4),radius(b)])]);
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
export function actorBlockers(state,actor,worker,range=Infinity,workerIndex=null){
  const blockers=[],reach=range+radius(actor);
  for(const animal of state.raid?.animals??[]){
    if(animal===actor||animal.status==='gone'||(worker&&
      !actor.incapacitated&&animal.status!=='retreating'&&animal.hitsRemaining>0))continue;
    const clearance=reach+radius(animal);
    if(Math.abs(actor.x-animal.x)<=clearance&&Math.abs(actor.z-animal.z)<=clearance)
      blockers.push(animal);
  }
  for(const other of workerIndex&&Number.isFinite(range)?workerIndex.nearby(actor,range):state.workers){
    if(other===actor||other.status==='home'||(!worker&&
      !other.incapacitated&&actor.status!=='retreating'&&actor.hitsRemaining>0))continue;
    const clearance=reach+radius(other);
    if(Math.abs(actor.x-other.x)<=clearance&&Math.abs(actor.z-other.z)<=clearance)
      blockers.push(other);
  }
  return blockers;
}
export function actorSegmentClear(start,end,actor,blockers){
  const minX=Math.min(start.x,end.x),maxX=Math.max(start.x,end.x);
  const minZ=Math.min(start.z,end.z),maxZ=Math.max(start.z,end.z);
  return blockers.every(other=>{
    const required=radius(actor)+radius(other);
    // A disc outside the swept segment's expanded bounds cannot collide.
    if(other.x<minX-required||other.x>maxX+required||
      other.z<minZ-required||other.z>maxZ+required)return true;
    const before=distance(start,other);
    // Legacy overlaps can escape continuously, without a position correction.
    if(before<required-1e-8){
      if(distance(start,actor)>1e-9)return false;
      const dx=end.x-start.x,dz=end.z-start.z;
      return (start.x-other.x)*dx+(start.z-other.z)*dz>=-1e-10&&distance(end,other)>=before-1e-8;
    }
    return edgeDistance(start,end,other.x,other.z)>=required-1e-8;
  });
}
// A proposed shoulder for a moving worker. This is only a geometric proposal:
// the caller must keep checking live bodies while travelling and before rejoining.
export function workerYieldPoint(state,actor,opposing,nav,blockers=actorBlockers(state,actor,true,8)){
  if(!actor.path?.length||!opposing?.path?.length)return null;
  const angle=Math.atan2(actor.x-opposing.x,actor.z-opposing.z),
    required=radius(actor)+radius(opposing),next=actor.path[0];
  for(const reach of [.5,1,1.5,2,3,4]){
    let best=null,bestScore=Infinity;
    for(const offset of [0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4,
      Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4]){
      const point={x:actor.x+Math.sin(angle+offset)*reach,
        z:actor.z+Math.cos(angle+offset)*reach};
      if(distance(point,opposing)<required+.2||
        !actorSegmentClear(actor,point,actor,blockers)||
        !nav.workerMotionClear?.(actor,point,radius(actor)))continue;
      const future=opposing.path[0],span=distance(opposing,future),
        end=span>1?{x:opposing.x+(future.x-opposing.x)/span,
          z:opposing.z+(future.z-opposing.z)/span}:future;
      if(!actorSegmentClear(opposing,end,opposing,[{...point,radius:radius(actor)+.1}]))continue;
      const score=distance(point,next);
      if(score<bestScore){best=point;bestScore=score;}
    }
    if(best)return best;
  }
  return null;
}
export function prepareActorMotion(state,actor,nav,worker,workerIndex=null){
  // A worker step only needs the local approach. Animal detours retain their
  // full native search corridor dependencies, including remote bodies that
  // may enter an incremental search while it is pending.
  const blockers=actorBlockers(state,actor,worker,worker?8:Infinity,workerIndex);
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
  const yieldPoint=(body,other,isWorker)=>{
    const bodies=body===actor?blockers:actorBlockers(state,body,isWorker);
    const angle=Math.atan2(body.x-other.x,body.z-other.z),r=radius(body)+radius(other)+.5;
    // Retain the original roomy yield first. Tight wall corridors may permit
    // only a short lateral step; each fallback is still a swept body movement.
    for(const reach of [r,1,.5,.25])for(const offset of (reach===r?[0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4]:[0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2])){
      const point={x:body.x+Math.sin(angle+offset)*reach,z:body.z+Math.cos(angle+offset)*reach};
      if(!actorSegmentClear(body,point,body,bodies))continue;
      const terrain=nav.segmentClear?.(body,point,radius(body),null,isWorker)??nav.workerMotionClear?.(body,point,radius(body))??true;
      if(terrain)return point;
    }
    return null;
  };
  const yieldToOpposing=()=>{
    const opposing=blockers.find(other=>distance(actor,other)<=horizon&&edgeDistance(actor,goal,other.x,other.z)<radius(actor)+radius(other)+.1&&
      other.path?.length&&
      (next.x-actor.x)*(other.path[0].x-other.x)+(next.z-actor.z)*(other.path[0].z-other.z)<0);
    if(!opposing)return;
    // Identity breaks ties, but the elected body may be boxed in by terrain
    // or fleeing workers. Let the other body yield only when the elected one
    // has no physically clear yield; never relax clearance or move either body.
    if(String(actor.id)<String(opposing.id)&&yieldPoint(opposing,actor,state.workers.includes(opposing)))return;
    const point=yieldPoint(actor,opposing,worker);
    if(point)actor.path=[point,...actor.path];
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
  // Wild Engine has no incremental terrain fallback. Repeating this exact
  // failed disc graph every tick cannot uncover a new path until the actor,
  // a blocker or the navigation revision changes.
  if(!nav.findPathSteps)blockedDetours.set(actor,exactDetourKey(key,localBlockers));
  yieldToOpposing();
  // A narrow occupied passage waits; neither teleport nor discard the route.
  return clear;
}
