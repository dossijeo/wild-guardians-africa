// Bounded immutable prop chunks, static collision answers and successful path
// query results. Actor choices, reservations and failed search regions stay local.
export function raidNavigationWarmth(nav){
  return {version:nav.version,chunks:[...nav.chunks].slice(-8),
    walk:[...nav.walkCache].slice(-5000),segments:[...nav.segmentCache].slice(-10000),paths:[...(nav.warmPaths??[])]};
}
export const navigationPathKey=(start,end,radius,ignore,worker,margin)=>`${start.x},${start.z}|${end.x},${end.z}:${radius}:${ignore}:${worker}:${margin}`;
export function warmRaidNavigation(nav,warmth){
  if(!warmth||warmth.version!==nav.version||!(nav.chunks instanceof Map)||
    !(nav.walkCache instanceof Map)||!(nav.segmentCache instanceof Map))return false;
  for(const [key,chunk] of warmth.chunks){
    if(nav.chunks.has(key))continue;
    nav.chunks.set(key,chunk);if(nav.chunks.size>64)nav.chunks.delete(nav.chunks.keys().next().value);
  }
  for(const [target,entries,limit] of [[nav.walkCache,warmth.walk,50000],[nav.segmentCache,warmth.segments,100000]]){
    for(const [key,value] of entries){if(target.size>=limit)break;if(!target.has(key))target.set(key,value);}
  }
  nav.preparedPaths={version:nav.version,entries:new Map(warmth.paths??[])};
  return true;
}
