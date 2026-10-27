// Crate histories are retained for saves and accounting, but delivered crates
// must not be revisited by the simulation or renderer on every tick/frame.
const indexes=new WeakMap();

export function activeCrates(crates){
  let index=indexes.get(crates);
  if(!index||crates.length<index.length){
    index={length:crates.length,live:crates.filter(crate=>!crate.delivered),dirty:false};
    indexes.set(crates,index);
  }else if(crates.length>index.length){
    for(let i=index.length;i<crates.length;i++)if(!crates[i].delivered)index.live.push(crates[i]);
    index.length=crates.length;
  }
  if(index.dirty){index.live=index.live.filter(crate=>!crate.delivered);index.dirty=false;}
  return index.live;
}

export function crateBecameInactive(crates){
  const index=indexes.get(crates);if(index)index.dirty=true;
}

export function invalidateActiveCrates(crates){indexes.delete(crates);}
