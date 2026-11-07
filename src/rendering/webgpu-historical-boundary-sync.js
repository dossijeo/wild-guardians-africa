// A partial boundary is already a confirmed tick, but not an acknowledged
// publication. Its caller must certify that terrain and physics are unchanged.
export function syncWebGpuHistoricalBoundary({boundary,changedKeys,state,clock,lighting,afterLighting=null,animals,workers,crates,settlements,crops,agriculture,blessings,guardian,groundContacts=null,buildingContacts=false}={}){
 if(!Number.isSafeInteger(boundary?.sequence)||boundary.sequence<1||!Number.isFinite(boundary.at)||!Array.isArray(boundary.events)||boundary.events.some(event=>typeof event?.id!=='string'||!event.id||event.simulationTime!==boundary.at)||!state||state.elapsed!==boundary.at||clock?.elapsed!==boundary.at||changedKeys!==null&&changedKeys!==undefined&&!(changedKeys instanceof Set)||typeof lighting!=='function'||afterLighting!==null&&typeof afterLighting!=='function'||typeof buildingContacts!=='boolean')throw TypeError('Invalid historical presentation boundary');
 const changed=changedKeys??null,events=boundary.events;
 if(buildingContacts&&(!changed||changed.has('structures')||changed.has('villages')||changed.has('culture')))groundContacts?.setBuildings(state);
 lighting();afterLighting?.();animals?.sync();workers?.sync();crates?.syncConfirmed(changed);settlements?.sync(events);crops?.sync(events);agriculture?.sync(events);blessings?.syncConfirmed(changed,events);guardian?.sync(events.map(event=>({kind:'event',eventId:event.id,at:boundary.at})),events);
}
