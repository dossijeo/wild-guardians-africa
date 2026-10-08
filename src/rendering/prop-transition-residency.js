// Horizontal chunk membership only; no terrain sampling or instance rebuilding.
// A square radius of one chunk can end at 48m while a 40–60m handoff is active.
export function chunkInPropTransition(origin,eye,distance){
 const dx=Math.max(0,Math.abs(origin[0]-eye.x)-24),dz=Math.max(0,Math.abs(origin[1]-eye.z)-24);
 return dx*dx+dz*dz<=distance*distance;
}
export function nativePropBatchVisible(group,batch){
 return batch.clip||group.userData.farPropsVisible!==false||group.userData.farTreesVisible===true&&group.userData.farTransitionTreeSlots?.includes(batch.slot)===true;
}
