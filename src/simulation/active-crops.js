// Crop histories are append-only in gameplay; dead crops never revive.
// Keep the save array intact. Restored/replaced arrays have independent indexes.
// Editors changing membership in place must explicitly invalidate their index.
const indexes=new WeakMap();
export function activeCrops(plants){
  let index=indexes.get(plants);
  if(!index||plants.length<index.length){
    index={length:plants.length,live:plants.filter(p=>p.alive),dirty:false};
    indexes.set(plants,index);
  }else if(plants.length>index.length){
    for(let i=index.length;i<plants.length;i++)if(plants[i].alive)index.live.push(plants[i]);
    index.length=plants.length;
  }
  if(index.dirty){index.live=index.live.filter(p=>p.alive);index.dirty=false;}
  return index.live;
}
export function cropBecameInactive(plants){
  const index=indexes.get(plants);if(index)index.dirty=true;
}
export function invalidateActiveCrops(plants){indexes.delete(plants);}
