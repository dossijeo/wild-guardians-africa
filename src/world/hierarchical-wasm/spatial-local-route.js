const finitePoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const anchors=point=>{
  const xs=[Math.floor(point.x),Math.ceil(point.x)],zs=[Math.floor(point.z),Math.ceil(point.z)];
  const candidates=[];
  for(const x of xs)for(const z of zs){
    if(candidates.some(other=>other.x===x&&other.z===z))continue;
    candidates.push({x,z});
  }
  return candidates.sort((a,b)=>distance(point,a)-distance(point,b)||a.x-b.x||a.z-b.z);
};

// Return every nearby sector component reached by a short physical connector.
// A boundary position can touch more than one component; collapsing that set
// to one ID would incorrectly exclude otherwise reachable target groups.
export function spatialWorldComponents(wasm,gridComponent,point){
  if(!finitePoint(point))throw RangeError('Region lookup needs finite world coordinates');
  const ids=new Set();
  let unknown=false;
  for(const anchor of anchors(point)){
    const result=gridComponent(anchor);
    if(result===null){unknown=true;continue;}
    if(!wasm.spatial_local_clear(point.x,point.z,anchor.x,anchor.z))continue;
    if(result>=0)ids.add(result);
  }
  return {ids:[...ids].sort((a,b)=>a-b),unknown};
}

// A positive component result is only a possibility: directed local edges
// can still make the final route fail. Unknown residency is never blocked.
export function spatialWorldConnectivity(wasm,gridConnected,start,end){
  if(!finitePoint(start)||!finitePoint(end))throw RangeError('Connectivity needs finite world coordinates');
  if(wasm.spatial_local_clear(start.x,start.z,end.x,end.z))return 'possible';
  let unknown=false,startReachable=false,endReachable=false;
  const ends=anchors(end).filter(to=>wasm.spatial_walkable(to.x,to.z)&&
    wasm.spatial_local_clear(end.x,end.z,to.x,to.z));
  endReachable=ends.length>0;
  for(const from of anchors(start)){
    if(!wasm.spatial_walkable(from.x,from.z)||
       !wasm.spatial_local_clear(start.x,start.z,from.x,from.z))continue;
    startReachable=true;
    for(const to of ends){
      const status=gridConnected(from,to);
      if(status==='possible')return status;
      if(status==='unknown')unknown=true;
    }
  }
  return unknown||!startReachable||!endReachable?'unknown':'blocked';
}

// The graph is discrete; actors are not. Only these short, physically checked
// connectors bridge the two spaces. Failed connectors are unknown, not proof
// that the destination is unreachable through another loaded region.
export function spatialWorldRoute(wasm,gridRoute,start,end){
  if(!finitePoint(start)||!finitePoint(end))throw RangeError('A route needs finite world coordinates');
  if(wasm.spatial_local_clear(start.x,start.z,end.x,end.z)){
    return {status:'found',points:[{x:end.x,z:end.z}]};
  }
  const starts=anchors(start),ends=anchors(end);
  let unknown=false,startReachable=false,endReachable=false;
  for(const from of starts){
    if(!wasm.spatial_walkable(from.x,from.z)||
       !wasm.spatial_local_clear(start.x,start.z,from.x,from.z))continue;
    startReachable=true;
    for(const to of ends){
      if(!wasm.spatial_walkable(to.x,to.z)||
         !wasm.spatial_local_clear(end.x,end.z,to.x,to.z))continue;
      endReachable=true;
      const path=gridRoute(from,to);
      if(path.status==='unknown'){unknown=true;continue;}
      if(path.status!=='found')continue;
      const points=[];
      if(distance(start,from)>1e-6)points.push(from);
      points.push(...path.points);
      if(distance(points.at(-1)??from,end)>1e-6)points.push({x:end.x,z:end.z});
      return {status:'found',points};
    }
  }
  return {status:unknown||!startReachable||!endReachable?'unknown':'blocked',points:[]};
}
