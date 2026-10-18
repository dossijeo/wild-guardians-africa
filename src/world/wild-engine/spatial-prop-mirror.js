const SPATIAL_ID=/^spatial:([0-5]):(-?\d+):(-?\d+)$/;

// New spatial-world saves use the C++ prop identity. Legacy JS generator IDs
// describe a different procedural world and must never be silently replayed.
export function createSpatialPropMirror(core,initialIds=[]){
  const suppressed=new Set();
  let revision=0;
  function parse(ids){
    if(!Array.isArray(ids))throw TypeError('Expected suppressed prop IDs');
    return ids.map(id=>{
      const match=typeof id==='string'&&SPATIAL_ID.exec(id);
      if(!match)throw TypeError(`Unsupported spatial prop ID: ${id}`);
      const [group,gx,gz]=match.slice(1).map(Number);
      if(![group,gx,gz].every(Number.isSafeInteger)||
         [gx,gz].some(value=>value<-2147483648||value>2147483647))
        throw RangeError('Spatial prop ID is out of range');
      return {id,group,gx,gz};
    });
  }
  const initial=parse(initialIds);
  if(initial.length){
    core.restoreRemovedProps(initial);
    for(const prop of initial)suppressed.add(prop.id);
    revision++;
  }
  function sync(ids=[]){
    const parsed=parse(ids);
    const desired=new Set(parsed.map(p=>p.id));
    for(const id of suppressed)if(!desired.has(id))
      throw Error('A spatial prop suppression cannot be undone within a session');
    const added=[];
    for(const prop of parsed){
      if(suppressed.has(prop.id))continue;
      if(core.removeProp(prop)!==1)throw Error(`Could not suppress spatial prop ${prop.id}`);
      suppressed.add(prop.id);added.push(prop.id);
    }
    if(added.length)revision++;
    return {count:suppressed.size,added};
  }
  return {sync,suppressed,revision:()=>revision};
}
