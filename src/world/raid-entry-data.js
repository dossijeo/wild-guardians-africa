// Presentation preparation only: no RNG, actor creation or simulation commands.
export function raidEntryKey(state,nav,group,bounds=nav.activeBounds){
  if(!group?.length||!bounds||!nav.raidView||!Number.isSafeInteger(nav.version))return null;
  // Geometry changes advance the native route epoch. Include operational state
  // too: a collapse may begin before its obstacle is removed from navigation.
  const structures=state.structures.map(s=>[s.id,s.status,s.hp>0]);
  const side=state.nightPlan?.entryPreferredSide;
  const draw=Number.isInteger(side)?['selected-side',side]:['next-draw',state.rng];
  return JSON.stringify([state.seed,state.biome,state.culture,state.terrainVersion,draw,nav.version,group,bounds,nav.raidView,structures]);
}
export function raidEntryRetryKey(state,nav,group,bounds,preferredSide){
  // Unlike an unselected prepared request, retry does not depend on unrelated
  // gameplay RNG. Only entry-relevant inputs can trigger another search.
  return JSON.stringify([state.seed,state.biome,state.culture,state.terrainVersion,preferredSide,nav.version,group,bounds,nav.raidView,
    state.structures.map(s=>[s.id,s.status,s.hp>0])]);
}
export function raidEntryRequest(state,nav,group,key,token){
  const {seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}=state;
  const plants=state.plants.filter(p=>p.alive).map(({id,species,x,z,alive,attackHits})=>({id,species,x,z,alive,attackHits}));
  const workers=state.workers.map(({id,x,z,status,incapacitated})=>({id,x,z,status,incapacitated}));
  return structuredClone({key,token,group,profile:nav.profile,bounds:nav.activeBounds,view:nav.raidView,
    state:{seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion,plants,workers,
      nightPlan:{entryPreferredSide:state.nightPlan?.entryPreferredSide}}});
}
