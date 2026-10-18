// Dawn is the boundary after the raid has ended and before tasks are rebuilt.
// Keep only entities that can still participate in play or validate an active
// crate/spell in a saved game. Financial and event records are separate facts.
export function retireFarmHistory(state){
  const crates=state.crates.filter(crate=>!crate.delivered);
  if(crates.length!==state.crates.length)state.crates=crates;
  const retainedPlants=new Set(crates.map(crate=>crate.sourcePlantId));
  for(const spell of state.spells)if(spell.remaining>0&&spell.targetPlantId)retainedPlants.add(spell.targetPlantId);
  const plants=state.plants.filter(plant=>plant.alive||retainedPlants.has(plant.id));
  if(plants.length!==state.plants.length)state.plants=plants;
}
