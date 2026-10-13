const SPATIAL_ID=/^spatial:([0-5]):(-?\d+):(-?\d+)$/;

// New spatial-world saves use the C++ prop identity. Legacy JS generator IDs
// describe a different procedural world and must never be silently replayed.
export function createSpatialPropMirror(core){
  const suppressed=new Set();
  function sync(ids=[]){
    if(!Array.isArray(ids))throw TypeError('Expected suppressed prop IDs');
    const parsed=ids.map(id=>{
      const match=typeof id==='string'&&SPATIAL_ID.exec(id);
      if(!match)throw TypeError(`Unsupported spatial prop ID: ${id}`);
      const [group,gx,gz]=match.slice(1).map(Number);
      if(![group,gx,gz].every(Number.isSafeInteger))throw RangeError('Spatial prop ID is out of range');
      return {id,group,gx,gz};
    });
    const desired=new Set(parsed.map(p=>p.id));
    for(const id of suppressed)if(!desired.has(id))
      throw Error('A spatial prop suppression cannot be undone within a session');
    const added=[];
    for(const prop of parsed){
      if(suppressed.has(prop.id))continue;
      if(core.removeProp(prop)!==1)throw Error(`Could not suppress spatial prop ${prop.id}`);
      suppressed.add(prop.id);added.push(prop.id);
    }
    return {count:suppressed.size,added};
  }
  return {sync,suppressed};
}
