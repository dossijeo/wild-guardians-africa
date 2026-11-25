import {captureSpatialPolygons} from './spatial-state.js';

const SIDES=64;
const polygonShape=polygon=>JSON.stringify([polygon.passMask,polygon.points]);

export function validateSpatialShieldOwners(owners,spatialState){
  if(!Array.isArray(owners)||owners.length>100000||!Array.isArray(spatialState?.polygons))throw TypeError('Invalid native shield owners');
  const ids=new Set(spatialState.polygons.filter(row=>row.passMask===1).map(row=>row.id)),used=new Set(),spells=new Set();
  for(const row of owners){
    if(typeof row?.spellId!=='string'||!row.spellId||spells.has(row.spellId)||
       !Number.isInteger(row.polygonId)||!ids.has(row.polygonId)||used.has(row.polygonId))
      throw TypeError('Invalid native shield polygon owner');
    spells.add(row.spellId);used.add(row.polygonId);
  }
  return owners;
}

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
  function captureOwners(){
    return [...installed].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([spellId,record])=>({spellId,polygonId:record.polygonId}));
  }
  function prepareBootstrap(actual,expected){
    const saved=expected.spatialState,actualOwners=captureOwners();
    validateSpatialShieldOwners(actualOwners,actual);
    if(saved.nextPolygonId<actual.nextPolygonId)throw Error('Native shield allocator moved backwards');
    const provisionalIds=new Set(actualOwners.map(row=>row.polygonId));
    const untouched=actual.polygons.filter(row=>!provisionalIds.has(row.id)),untouchedIds=new Set(untouched.map(row=>row.id));
    const bySavedId=new Map(saved.polygons.map(row=>[row.id,row]));
    if(untouched.some(row=>JSON.stringify(row)!==JSON.stringify(bySavedId.get(row.id))))throw Error('Non-shield polygon differs from Game');
    const byActualId=new Map(actual.polygons.map(row=>[row.id,row]));
    let owners=expected.shieldOwners;
    if(expected.version<3){
      if(JSON.stringify(actual.polygons)===JSON.stringify(saved.polygons))owners=actualOwners;
      else{
        const available=new Map();
        for(const row of saved.polygons){
          if(untouchedIds.has(row.id))continue;
          const shape=polygonShape(row);
          if(available.has(shape))throw Error('Ambiguous legacy native shield polygons');
          available.set(shape,row.id);
        }
        owners=actualOwners.map(row=>{
          const shape=polygonShape(byActualId.get(row.polygonId)),polygonId=available.get(shape);
          available.delete(shape);
          return {spellId:row.spellId,polygonId};
        });
        if(available.size)throw Error('Legacy native shield reconstruction mismatch');
      }
    }
    validateSpatialShieldOwners(owners,saved);
    if(owners.length!==installed.size)throw Error('Native shield owners differ from Game');
    const records=[],polygons=[...untouched];
    for(const {spellId,polygonId} of owners){
      const record=installed.get(spellId);
      if(!record||untouchedIds.has(polygonId))throw Error('Native shield owner differs from Game');
      const canonical=byActualId.get(record.polygonId);
      if(polygonShape(canonical)!==polygonShape(bySavedId.get(polygonId)))throw Error('Native shield polygon differs from Game');
      polygons.push({...canonical,id:polygonId});records.push([spellId,{...record,polygonId}]);
    }
    polygons.sort((a,b)=>a.id-b.id);
    return {polygons,adopt(){for(const [id,record] of records)installed.set(id,record);}};
  }
  return {sync,clear,revision:()=>revision,polygonId:id=>installed.get(id)?.polygonId??null,
    captureOwners,prepareBootstrap,
    prepareNativeAdditionAdoption:(shield,receipt)=>prepareNativeAdoption(shield,receipt,false),
    prepareNativeRemovalAdoption:(shield,receipt)=>prepareNativeAdoption(shield,receipt,true)};
}
