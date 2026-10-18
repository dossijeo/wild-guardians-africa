const SIDES=64;

// A circumscribed regular polygon contains the game's circular shield. Its
// maximum overhang is under 2.4 mm at the current 1.95 m spell radius, so it
// cannot permit a physically blocked animal route. Workers pass through it.
export function spatialShieldFootprint(shield){
  if(shield?.kind!=='shield'||!Number.isFinite(shield.x)||
     !Number.isFinite(shield.z)||!Number.isFinite(shield.radius)||shield.radius<=0)
    throw TypeError('Expected a valid shield');
  const circumradius=shield.radius/Math.cos(Math.PI/SIDES);
  return Array.from({length:SIDES},(_,i)=>({
    x:shield.x+Math.cos(i*2*Math.PI/SIDES)*circumradius,
    z:shield.z+Math.sin(i*2*Math.PI/SIDES)*circumradius}));
}

export function createSpatialShieldMirror(core){
  const installed=new Map();
  let revision=0;
  const signature=shield=>[shield.x,shield.z,shield.radius].join(':');
  function sync(spells){
    if(!Array.isArray(spells))throw TypeError('Expected game spells');
    const desired=new Map();
    for(const shield of spells){
      if(shield.kind!=='shield'||shield.remaining<=0)continue;
      if(shield.id==null||desired.has(shield.id))throw TypeError('Shield IDs must be unique');
      desired.set(shield.id,shield);
    }
    let removed=0;
    for(const [id,previous] of installed){
      if(desired.has(id)&&previous.signature===signature(desired.get(id)))continue;
      if(core.removePolygon(previous.polygonId)!==1)
        throw Error(`Could not remove spatial shield ${id}`);
      installed.delete(id);
      removed++;
    }
    let added=0;
    for(const [id,shield] of desired){
      if(installed.has(id))continue;
      installed.set(id,{signature:signature(shield),
        polygonId:core.addPolygon(spatialShieldFootprint(shield),1)});
      added++;
    }
    if(removed||added)revision++;
    return {count:installed.size,added};
  }
  function clear(){
    for(const [id,record] of installed){
      if(core.removePolygon(record.polygonId)!==1)
        throw Error(`Could not remove spatial shield ${id}`);
    }
    installed.clear();
  }
  return {sync,clear,revision:()=>revision,polygonId:id=>installed.get(id)?.polygonId??null};
}
