// Village building footprints are authored in the same layout consumed by
// Three.js. Install them before building the navigation profiles whenever a
// village is present at load time; a newly founded village can add them later.
export function addSpatialVillageBuildings(core,village){
  if(village?.id==null||!Array.isArray(village.buildings))
    throw TypeError('Expected a village with authored buildings');
  const solids=village.buildings.filter(building=>building.kind!=='Zona común');
  const keys=new Set();
  for(const building of solids){
    if(building.key==null||keys.has(building.key)||!Array.isArray(building.footprint))
      throw TypeError('Village building needs a unique key and authored footprint');
    keys.add(building.key);
  }
  const ids=new Map();
  try{
    for(const building of solids)ids.set(building.key,core.addPolygon(building.footprint,0));
  }catch(error){
    for(const id of ids.values())core.removePolygon(id);
    throw error;
  }
  return ids;
}

export function removeSpatialVillageBuildings(core,ids){
  for(const id of ids.values())if(core.removePolygon(id)!==1)
    throw Error(`Could not remove spatial village building ${id}`);
}
