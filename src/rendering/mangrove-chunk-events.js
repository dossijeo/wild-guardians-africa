// Material cache ownership uses existing Three scene events. No entity polling or Engine calls.
// Native chunk installation inserts into world.chunks before scene.add; removal
// calls scene.remove before disposing the chunk's materials.
export function observeMangroveChunks(world,{add,remove,material=()=>{}}){
 const records=new Map(),byGroup=new Map();let closed=false;
 const enter=group=>{
  if(closed||byGroup.has(group))return;
  const ground=group.children.find(o=>o.userData.ground);
  if(!ground||ground.material.userData.groundBiome!=='mangrove')return;
  const pair=[...world.chunks].find(([,value])=>value===group);if(!pair)return;
  const [key]=pair,source=ground.material,record={key,group,ground,materials:new Set(),releases:new Map(),retains:[]};
  records.set(key,record);byGroup.set(group,record);
  const track=next=>{if(record.materials.has(next))return;record.materials.add(next);const release=()=>{record.materials.delete(next);record.releases.delete(next);next.removeEventListener('dispose',release);};record.releases.set(next,release);next.addEventListener('dispose',release);};
  track(source);
  const original=source.userData.retainBiomeGround;
  if(original){
   const retain=next=>{original(next);if(closed||!byGroup.has(group))return;track(next);material(record,next);};
   source.userData.retainBiomeGround=retain;record.retains.push({source,original,retain});
  }
  add(record);
 };
 const leave=group=>{const record=byGroup.get(group);if(!record)return;byGroup.delete(group);if(records.get(record.key)===record)records.delete(record.key);remove(record);
  for(const [value,release]of record.releases)value.removeEventListener('dispose',release);record.releases.clear();record.materials.clear();
  for(const {source,original,retain}of record.retains)if(source.userData.retainBiomeGround===retain)source.userData.retainBiomeGround=original;
 };
 const added=e=>enter(e.child),removed=e=>leave(e.child);
 world.scene.addEventListener('childadded',added);world.scene.addEventListener('childremoved',removed);
 for(const group of world.chunks.values())enter(group);
 return {records,dispose(){if(closed)return;closed=true;world.scene.removeEventListener('childadded',added);world.scene.removeEventListener('childremoved',removed);for(const group of [...byGroup.keys()])leave(group);}};
}
