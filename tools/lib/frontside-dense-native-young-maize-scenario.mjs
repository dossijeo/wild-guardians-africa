import {cropSpec} from '../../src/simulation/rules.js';

// Explicit QA workload, never a production save migration or campaign claim.
// The caller hashes serialized input/output and labels the altered workload.
export function denseNativeYoungMaizeScenario(source){
 if(!source||!Array.isArray(source.plants))throw Error('Expected native state plants');
 const state=structuredClone(source),duration=cropSpec('maiz').growth_seconds;
 const distribution={},changed=[],ids=new Set();
 for(const plant of state.plants){
  if(!plant.alive)continue;
  if(typeof plant.id!=='string'||ids.has(plant.id)||!Number.isFinite(plant.x)||!Number.isFinite(plant.z))throw Error('Ambiguous native plant identity or position');
  ids.add(plant.id);distribution[plant.species]=(distribution[plant.species]??0)+1;
  const previous={species:plant.species,growth:plant.growth};
  plant.species='maiz';plant.growth=duration*.31;
  if(previous.species!==plant.species||previous.growth!==plant.growth)changed.push({id:plant.id,previous,next:{species:plant.species,growth:plant.growth}});
 }
 if(!ids.size)throw Error('Dense QA scenario has no alive plants');
 return{state,receipt:{profile:'ARCHIVED_POSITIONS_DENSE_NATIVE_YOUNG_MAIZE_QA_V1',artificialWorkload:true,sourceAliveCount:ids.size,youngMaizeCount:ids.size,normalizedGrowth:.31,growthSeconds:duration*.31,nativeDurationSeconds:duration,changedCount:changed.length,sourceSpeciesDistribution:distribution,changed,placement:'Original IDs, positions, rotations and all fields other than alive-plant species/growth preserved',limitations:['Explicit artificial workload on a separate state copy; no user save, naturally achieved farm or profitability claim.','Existing tasks and actors are retained as source; paused rendering does not prove a completed harvest or campaign.','Both timing arms must consume exactly this same serialized state and native crop batch.']}};
}
