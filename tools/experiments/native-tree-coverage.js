// Experimental bridge to native color LOD batches. Packed CPU matrices alone
// are not proof that GPU textures/programs have finished preparing.
export class NativeTreeCoverage {
 constructor(slot=0){this.slot=slot;this.batches=new Map();this.counts=new Map();this.scans=0;this.revision=0;}
 remove(ids){for(const id of ids){const count=this.counts.get(id)-1;if(count)this.counts.set(id,count);else this.counts.delete(id);}}
 update(chunks){
  const live=new Set();let changed=false;
  for(const group of chunks.values())for(const batch of group.userData.lodBatches??[]){
   if(batch.slot!==this.slot)continue;live.add(batch);
   const stamp=(group.visible?'1':'0')+'|'+batch.meshes.map(m=>[m.count,m.visible,m.material.visible,m.instanceMatrix.version].join(':')).join('|');
   const old=this.batches.get(batch);if(old?.stamp===stamp)continue;
   if(old)this.remove(old.ids);const ids=new Set();this.scans++;
   if(group.visible)for(const [level,mesh] of batch.meshes.entries()){
    if(!mesh.visible||!mesh.material.visible)continue;
    for(let i=0;i<mesh.count;i++){const source=batch.orders[level]?.[i],tree=batch.instances[source];if(tree)ids.add(tree.id);}
   }
   for(const id of ids)this.counts.set(id,(this.counts.get(id)??0)+1);
   this.batches.set(batch,{stamp,ids});changed=true;
  }
  for(const [batch,record] of this.batches)if(!live.has(batch)){this.remove(record.ids);this.batches.delete(batch);changed=true;}
  if(changed)this.revision++;return changed;
 }
 has(id,suppressed){return !suppressed?.has(id)&&this.counts.has(id);}
 clear(){if(this.batches.size||this.counts.size)this.revision++;this.batches.clear();this.counts.clear();}
}
