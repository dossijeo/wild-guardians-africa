// Presentation preparation only: no RNG, actor creation or simulation commands.
const WAVE_SPECIES=new Set(['warthog','hyena','buffalo','lion','rhino']);
export function eligiblePendingRaidWavePlan(state){
  if(state.result||state.postgame)return null;
  const raid=state.raid,plan=raid?.pendingWavePlan;
  if(!raid||typeof raid.id!=='string'||!raid.id||!Array.isArray(raid.animals)||raid.animals.some(a=>a?.status!=='gone'))return null;
  if(!plan||plan.done!==false||!Number.isSafeInteger(plan.index)||plan.index<1||!Number.isFinite(plan.at)||plan.at<0)return null;
  if(!Array.isArray(plan.group)||plan.group.length<1||plan.group.length>16||plan.group.some(id=>!WAVE_SPECIES.has(id)))return null;
  if(!Array.isArray(plan.actors)||plan.actors.length!==plan.group.length||plan.actors.some((a,i)=>!a||a.species!==plan.group[i]))return null;
  return plan;
}
function waveContext(state,group){
  if(!state.raid)return null;
  const plan=eligiblePendingRaidWavePlan(state);
  if(!plan||group.length!==plan.group.length||group.some((id,i)=>id!==plan.group[i]))return null;
  return [state.raid.id,plan.index,state.workers.map(({id,x,z,status,incapacitated})=>[id,x,z,status,!!incapacitated])];
}
export function raidEntryKey(state,nav,group,bounds=nav.activeBounds){
  if(!group?.length||!bounds||!nav.raidView||!Number.isSafeInteger(nav.version))return null;
  // Geometry changes advance the native route epoch. Include operational state
  // too: a collapse may begin before its obstacle is removed from navigation.
  const structures=state.structures.map(s=>[s.id,s.status,s.hp>0]);
  const wave=waveContext(state,group);if(state.raid&&!wave)return null;
  const inputs=[state.seed,state.biome,state.culture,state.terrainVersion,state.rng,nav.version,group,bounds,nav.raidView,structures];
  if(wave)inputs.push(['wave',...wave]);
  return JSON.stringify(inputs);
}
export function raidEntryRequest(state,nav,group,key,token){
  const {seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion}=state;
  const plants=state.plants.filter(p=>p.alive).map(({id,species,x,z,alive,attackHits,attackHitPoints})=>({id,species,x,z,alive,attackHits,attackHitPoints}));
  const workers=state.workers.map(({id,x,z,status,incapacitated})=>({id,x,z,status,incapacitated}));
  const wave=waveContext(state,group);
  return structuredClone({key,token,group,...(wave?{waveContext:{raidId:wave[0],index:wave[1]}}:{}),profile:nav.profile,bounds:nav.activeBounds,view:nav.raidView,
    state:{seed,biome,culture,terrainVersion,rng,villages,structures,suppressed,spells,navigationVersion,plants,workers}});
}

// Residency can expand bounds using a validated pending entry. Keep those pins
// while its refreshed full-key request runs; geometry/view/RNG changes invalidate.
export function raidEntryContextKey(state,nav,group){return raidEntryKey(state,nav,group,[]);}

// One readiness owner: an already rolled daytime raid remains ahead of night.
// This selector observes state only; it never chooses a group or advances RNG.
export function activeRaidEntryPlan(state){
  if(state.result||state.postgame)return null;
  if(state.raid)return eligiblePendingRaidWavePlan(state);
  const day=state.dayPlan;
  if(day&&!day.done&&day.group?.length&&state.time>=day.at)return day;
  const night=state.nightPlan;
  return night&&!night.done&&night.group?.length?night:null;
}
