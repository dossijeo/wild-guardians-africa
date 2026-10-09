const distances=[4,8,12,16,24,32];
const angles=32,budget=8;
// An open fractional corridor can have no usable one-metre grid cells. Try
// a bounded physical connector after normal static routing fails. Every leg
// uses the original swept collision rules; no obstacle or body is removed.
export function animalExitConnector(actor,end,nav){
 const radius=actor.radius??.28;
 if(!nav.segmentClear||!nav.walkable)return null;
 const key=JSON.stringify([nav.version??0,actor.x,actor.z,end.x,end.z,radius]);
 let search=actor.exitConnectorSearch;
 if(!search||search.key!==key)search=actor.exitConnectorSearch={key,next:0};
 const heading=Math.atan2(end.x-actor.x,end.z-actor.z);
 const limit=Math.min(distances.length*angles,search.next+budget);
 for(;search.next<limit;){
  const index=search.next++,sample=index%angles;
  const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
  const reach=distances[Math.floor(index/angles)];
  const point={x:actor.x+Math.sin(heading+offset)*reach,z:actor.z+Math.cos(heading+offset)*reach};
  if(!nav.walkable(point.x,point.z,radius,null,false)||
    !nav.segmentClear(actor,point,radius,null,false)||
    !nav.segmentClear(point,end,radius,null,false))continue;
  delete actor.exitConnectorSearch;
  return [point,{x:end.x,z:end.z}];
 }
 // Retain the bounded cursor, including an exhausted search. It survives a
 // save/reload; geometry epochs, displacement or a new exit restart it.
 return null;
}
