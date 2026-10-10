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
  const plants=state.plants.filter(p=>p.alive).map(({id,species,x,z,alive,attackHits})=>({id,species,x,z,alive,attackHits}));
  const workers=state.workers.map(({id,x,z,status,incapacitated})=>({id,x,z,status,incapacitated}));
  return structuredClone({key,token,group,profile:nav.profile,bounds:nav.activeBounds,view:nav.raidView,
    state:{seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion,plants,workers}});
}

// Residency can expand bounds using a validated pending entry. Keep those pins
// while its refreshed full-key request runs; geometry/view/RNG changes invalidate.
export function raidEntryContextKey(state,nav,group){return raidEntryKey(state,nav,group,[]);}

// One readiness owner: an already rolled daytime raid remains ahead of night.
// This selector observes state only; it never chooses a group or advances RNG.
export function activeRaidEntryPlan(state){
  if(state.raid||state.result||state.postgame)return null;
  const day=state.dayPlan;
  if(day&&!day.done&&day.group?.length&&state.time>=day.at)return day;
  const night=state.nightPlan;
  return night&&!night.done&&night.group?.length?night:null;
}
