import {captureSpatialPolygons} from './spatial-state.js';

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
  function prepareNativeAdoption(shield,{worldBoundary,ids},removing){
    const points=spatialShieldFootprint(shield),shape=signature(shield),previous=installed.get(shield.id);
    if(typeof shield.id!=='string'||!shield.id||!Array.isArray(ids)||ids.length!==1||
       !Number.isInteger(ids[0])||ids[0]<=0||ids[0]>0x7fffffff)
      throw Error('Invalid native shield receipt');
    const [polygonId]=ids,resources=core.captureNativeWorldResources(worldBoundary),{wasm}=core;
    if(resources.kind!==(removing?4:3)||resources.chunks.length||resources.removed.length||
       wasm.spatial_world_proposal_result_count()!==1||
       new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),1)[0]!==polygonId)
      throw Error('Native shield receipt names another polygon');
    const [polygon]=captureSpatialPolygons(wasm,polygonId);
    if(removing?polygon||previous?.polygonId!==polygonId||previous.signature!==shape:
       previous||!polygon||polygon.passMask!==1||polygon.points.length!==points.length||
       points.some((point,index)=>polygon.points[index].x!==Math.fround(point.x)||polygon.points[index].z!==Math.fround(point.z)))
      throw Error('Native shield topology does not match its spell');
    const prior=revision;
    return ()=>{
      if(revision!==prior||installed.get(shield.id)!==previous)throw Error('Native shield adoption is stale');
      if(removing)installed.delete(shield.id);
      else installed.set(shield.id,{signature:shape,polygonId});
      revision++;
      return true;
    };
  }
  function clear(){
    for(const [id,record] of installed){
      if(core.removePolygon(record.polygonId)!==1)
        throw Error(`Could not remove spatial shield ${id}`);
    }
    installed.clear();
  }
  return {sync,clear,revision:()=>revision,polygonId:id=>installed.get(id)?.polygonId??null,
    prepareNativeAdditionAdoption:(shield,receipt)=>prepareNativeAdoption(shield,receipt,false),
    prepareNativeRemovalAdoption:(shield,receipt)=>prepareNativeAdoption(shield,receipt,true)};
}
