// The active terrain rectangle is finite even though the generated world is not.
// Keep this calculation independent of Three so simulation-only runs can use
// the same default region before a renderer supplies its actual camera region.
export function activeChunkRegion(eye,quality='media'){
  const cx=Math.floor((eye.x+24)/48),cz=Math.floor((eye.z+24)/48),range=quality==='alta'?3:2;
  return {cx,cz,range,bounds:[(cx-range)*48-24,(cz-range)*48-24,(cx+range)*48+24,(cz+range)*48+24]};
}

export function validActiveBounds(bounds){
  return Array.isArray(bounds)&&bounds.length===4&&bounds.every(Number.isFinite)&&bounds[2]>bounds[0]&&bounds[3]>bounds[1];
}
