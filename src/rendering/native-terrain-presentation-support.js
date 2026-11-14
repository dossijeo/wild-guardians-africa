import {createSettlementHeightSampler} from './webgpu-settlement-height.js';

// Terrain/biome and admitted villages have explicit prepared render selections.
// Other owners still sample support on confirmed publication. Do not authorize
// an intervening image with their old placement if that support would change.
export function assertNativeTerrainPresentationSupport({state,residency,view,participants=[]}){
 const previous=createSettlementHeightSampler(residency),next=createSettlementHeightSampler(view);
 const entities=[...(state.workers??[]),...(state.raid?.animals??[]),...(state.plants??[]).filter(plant=>plant.alive!==false),...(state.structures??[]),...(state.crates??[]).filter(crate=>!crate.delivered&&!crate.carrierId)];
 for(const entity of entities){
  if(!Number.isFinite(entity.x)||!Number.isFinite(entity.z)||!view.changedKeys.has(`${Math.floor((entity.x+24)/48)},${Math.floor((entity.z+24)/48)}`))continue;
  const oldHeight=previous(entity.x,entity.z),newHeight=next(entity.x,entity.z);
  if(oldHeight===null&&newHeight===null||oldHeight!==null&&newHeight!==null&&Math.abs(oldHeight-newHeight)<=1e-6)continue;
  if(participants.some(part=>{const claim=part.terrainSupport;return part.valid()===true&&claim?.entity===entity&&claim.x===entity.x&&claim.z===entity.z&&claim.previousHeight===oldHeight&&claim.nextHeight===newHeight;}))continue;
  throw Error('Native terrain requires prepared support for entity '+entity.id);
 }
}
