// Query the prop records delivered by the authoritative spatial chunk stream.
// Missing chunks are unknown, never silently treated as empty buildable land.
export function queryResidentSpatialProps(loaded,suppressed,x,z,radius,terrainRevision=null){
  if(!(loaded instanceof Map)||!(suppressed instanceof Set)||
     ![x,z,radius].every(Number.isFinite)||radius<0)
    throw TypeError('Expected loaded spatial chunks and a finite query');
  const minX=Math.floor((x-radius+24)/48),maxX=Math.floor((x+radius+24)/48);
  const minZ=Math.floor((z-radius+24)/48),maxZ=Math.floor((z+radius+24)/48);
  const reach=radius+8,props=[],missing=[];
  for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++){
    const key=`${cx},${cz}`,chunk=loaded.get(key);
    const trusted=(terrainRevision===null||
      (chunk?.terrainRevision??chunk?.userData?.spatialTerrainRevision)===terrainRevision)&&
      (chunk?.authority==='spatial-wasm'||
      chunk?.userData?.spatialAuthority==='spatial-wasm');
    const instances=trusted?(chunk.instances??chunk.userData?.propSources):null;
    if(!Array.isArray(instances)){missing.push({cx,cz});continue;}
    for(const list of instances)for(const prop of list){
      if(suppressed.has(prop.id)||Math.abs(prop.x-x)>=reach||
         Math.abs(prop.z-z)>=reach||Math.hypot(prop.x-x,prop.z-z)>=reach)continue;
      props.push(prop);
    }
  }
  return {status:missing.length?'unknown':'ready',props,missing};
}
