// A prepared target choice is valid only while every input to native target
// ordering and approach collision remains unchanged. This is presentation
// preparation, not a gameplay/save identifier.
export function raidTargetFingerprint(state,nav){
 return JSON.stringify([
  nav.version,
  state.plants.filter(p=>p.alive).map(p=>[p.id,p.species,p.x,p.z,p.attackHits,p.attackHitPoints]),
  state.structures.map(t=>[t.id,t.kind,t.x,t.z,t.yaw,t.status,t.hp,t.cost,t.material,t.gate,t.baseScaleX]),
  state.spells.filter(a=>a.kind==='shield'&&a.remaining>0).map(a=>[a.id,a.x,a.z,a.radius]),
  state.workers.filter(w=>w.status!=='home'&&w.incapacitated).map(w=>[w.id,w.x,w.z,w.radius]),
 ]);
}
