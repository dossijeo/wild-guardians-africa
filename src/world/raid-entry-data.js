// Presentation preparation only: no RNG, actor creation or simulation commands.
export function raidEntryKey(state,nav,group,bounds=nav.activeBounds){
  if(!group?.length||!bounds||!nav.raidView||!Number.isSafeInteger(nav.version))return null;
  // Geometry changes advance the native route epoch. Include operational state
  // too: a collapse may begin before its obstacle is removed from navigation.
  const structures=state.structures.map(s=>[s.id,s.status,s.hp>0]);
  return JSON.stringify([state.seed,state.biome,state.culture,state.terrainVersion,state.rng,nav.version,group,bounds,nav.raidView,structures]);
}
export function raidEntryRequest(state,nav,group,key,token){
  const {seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}=state;
  return structuredClone({key,token,group,profile:nav.profile,bounds:nav.activeBounds,view:nav.raidView,
    state:{seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}});
}
