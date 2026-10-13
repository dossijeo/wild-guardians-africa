import {HierarchicalNavigator} from './hierarchical-navigation.js';
import {gatePortalPoints} from './gate-passages.js';

// The physical world remains authoritative when a sector is first sampled.
// Route planning after that uses the sector graph and its local grid edges.
export function createHierarchicalNavigationAdapter(nav){
  const profiles=new Map();
  const profile=(radius,worker,ignore)=>{
    const key=`${worker?'worker':'animal'}:${radius}:${ignore??''}`;
    if(!profiles.has(key))profiles.set(key,{radius,worker,ignore});
    return key;
  };
  const physical=key=>profiles.get(key);
  const planner=new HierarchicalNavigator({
    cellPassable:(x,z,key)=>{const {radius,worker,ignore}=physical(key);return nav.walkable(x,z,radius,ignore,worker);},
    edgePassable:(a,b,key)=>{const {radius,worker,ignore}=physical(key);return nav.segmentClear(a,b,radius,ignore,worker);},
    connectorClear:(a,b,key)=>{const {radius,worker,ignore}=physical(key);return nav.segmentClear(a,b,radius,ignore,worker);},
    portals:key=>{
      const {radius,worker,ignore}=physical(key);
      if(!worker)return [];
      return nav.obstacles.filter(o=>o.gate&&o.id!==ignore).flatMap(o=>{
        const pair=gatePortalPoints(o,radius);
        return pair.length===2?[{from:pair[0],to:pair[1]}]:[];
      });
    },
  });
  return {
    planner,profile,
    path:(start,end,radius=.3,ignore=null,worker=true,margin=32)=>planner.path(start,end,profile(radius,worker,ignore),{margin}),
    region:(point,radius=.3,ignore=null,worker=true)=>{
      const key=profile(radius,worker,ignore),cell={x:Math.round(point.x),z:Math.round(point.z)};
      return planner.location(key,cell)??planner.connector(point,key,true)[0]?.loc??null;
    },
    connected:(from,to,radius=.3,ignore=null,worker=true,margin=32)=>{
      const key=profile(radius,worker,ignore);
      const source=planner.location(key,{x:Math.round(from.x),z:Math.round(from.z)})??planner.connector(from,key,true)[0]?.loc;
      const target=planner.location(key,{x:Math.round(to.x),z:Math.round(to.z)})??planner.connector(to,key,false)[0]?.loc;
      // A fractional endpoint with no grid connector is unresolved here. The
      // physical final-approach query decides it; do not certify isolation.
      if(!source||!target)return null;
      if(source.key===target.key)return true;
      const a=planner.coordinates(Math.min(from.x,to.x)-margin,Math.min(from.z,to.z)-margin);
      const b=planner.coordinates(Math.max(from.x,to.x)+margin,Math.max(from.z,to.z)+margin);
      return !!planner.abstractPath(key,source,target,{minSX:a.sx,maxSX:b.sx,minSZ:a.sz,maxSZ:b.sz});
    },
    invalidateRect:(minX,minZ,maxX,maxZ)=>planner.invalidateRect(minX,minZ,maxX,maxZ),
    clear:()=>planner.clear(),
  };
}
