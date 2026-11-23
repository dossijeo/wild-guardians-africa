import {validateSpatialState} from './spatial-state.js';
import {spatialStructureBarriers,removeSpatialStructure} from './spatial-wall-bridge.js';
import {gateScale,nativeGateModelId} from '../gate-passages.js';
import {copyNativeBarrierAdditionAttestation} from '../native-barrier-addition.js';
import {sameNativeWorldBoundary} from '../native-world-boundary.js';

function boundsForNativeBarriers(barriers){
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(const barrier of barriers){
    const c=Math.cos(barrier.yaw),s=Math.sin(barrier.yaw);
    const dx=Math.abs(c)*barrier.halfX+Math.abs(s)*barrier.halfZ;
    const dz=Math.abs(s)*barrier.halfX+Math.abs(c)*barrier.halfZ;
    bounds[0]=Math.min(bounds[0],barrier.x-dx);
    bounds[1]=Math.min(bounds[1],barrier.z-dz);
    bounds[2]=Math.max(bounds[2],barrier.x+dx);
    bounds[3]=Math.max(bounds[3],barrier.z+dz);
  }
  return bounds;
}

// Experimental state-to-topology seam. The game remains responsible for
// authorizing placement, damage and destruction; this only mirrors the
// resulting rigid footprints into the spatial navigator.
// Persist proxy order under the existing wall owner, never infer ownership from
// matching bytes when an explicit checkpoint is available.
export function validateSpatialWallOwners(owners,spatialState){
  if(!Array.isArray(owners)||owners.length>100000||!Array.isArray(spatialState?.barriers))throw TypeError('Invalid native wall owners');
  const ids=new Set(spatialState.barriers.map(row=>row.id)),used=new Set(),entities=new Set();
  for(const row of owners){
    if(typeof row?.entityId!=='string'||!row.entityId||entities.has(row.entityId)||!Array.isArray(row.ids)||![1,3].includes(row.ids.length))throw TypeError('Invalid native wall owner');
    entities.add(row.entityId);
    for(const id of row.ids){if(!Number.isSafeInteger(id)||!ids.has(id)||used.has(id))throw TypeError('Invalid native wall proxy identity');used.add(id);}
  }
  if(used.size!==ids.size)throw Error('Native wall ownership is incomplete');
  return owners;
}

export function createSpatialWallMirror(core,{structures=null,bootstrap=null}={}){
  const installed=new Map();
  let revision=0;
  const changes=[];
  const signature=wall=>[wall.x,wall.z,wall.yaw??0,wall.baseScaleX??1,
    wall.material,Boolean(wall.gate)].join(':');
  function sync(structures){
    if(!Array.isArray(structures))throw TypeError('Expected game structures');
    const desired=new Map();
    for(const wall of structures){
      if(wall.kind!=='wall'||wall.status==='ruined')continue;
      if(wall.id==null||desired.has(wall.id))throw TypeError('Wall IDs must be unique');
      desired.set(wall.id,wall);
    }
    const removals=[...installed].filter(([id,previous])=>
      !desired.has(id)||previous.signature!==signature(desired.get(id)));
    const additions=[...desired].filter(([id,wall])=>
      !installed.has(id)||installed.get(id).signature!==signature(wall));
    const additionParts=additions.map(([,wall])=>spatialStructureBarriers(wall));
    const additionBounds=additionParts.map(boundsForNativeBarriers);
    const changedBounds=[...removals.map(([,record])=>record.bounds),
      ...additionBounds];
    // Gate conversion and chain construction change the local graph once.
    // Bounded transactions keep very large farms free of artificial limits.
    let removeOffset=0,addOffset=0;
    while(removeOffset<removals.length||addOffset<additions.length){
      const removeBatch=[];
      let removeCount=0;
      while(removeOffset<removals.length&&
        removeCount+removals[removeOffset][1].ids.length<=1024){
        const item=removals[removeOffset++];removeBatch.push(item);
        removeCount+=item[1].ids.length;
      }
      const firstAdd=addOffset;
      const addBatch=additions.slice(addOffset,addOffset+256);
      addOffset+=addBatch.length;
      const parts=additionParts.slice(firstAdd,addOffset);
      const ids=core.applyBarrierChanges(removeBatch.flatMap(([,record])=>record.ids),parts.flat());
      for(const [id] of removeBatch)installed.delete(id);
      let index=0;
      addBatch.forEach(([id,wall],item)=>{
        installed.set(id,{signature:signature(wall),bounds:additionBounds[firstAdd+item],
          ids:ids.slice(index,index+parts[item].length)});
        index+=parts[item].length;
      });
    }
    if(removals.length||additions.length){
      const bounds=[Infinity,Infinity,-Infinity,-Infinity];
      for(const box of changedBounds){
        bounds[0]=Math.min(bounds[0],box[0]);bounds[1]=Math.min(bounds[1],box[1]);
        bounds[2]=Math.max(bounds[2],box[2]);bounds[3]=Math.max(bounds[3],box[3]);
      }
      changes.push({from:revision++,bounds});
      if(changes.length>64)changes.shift();
    }
    return {count:installed.size,added:additions.length};
  }
  // Called synchronously after the existing native kind2 commit, before the
  // Game mirror is published. This adopts physical IDs; it never creates them.
  function prepareNativeAdditionAdoption(structures,{worldBoundary,ids,nativeBarrierAdditionBinding}={}){
    const binding=nativeBarrierAdditionBinding?copyNativeBarrierAdditionAttestation(nativeBarrierAdditionBinding):null,gate=binding?.reference.gate??null;
    if(gate&&(!sameNativeWorldBoundary(worldBoundary,binding.reference.worldBoundary)||!Array.isArray(ids)||ids.length!==binding.nativeIds.length||ids.some((id,index)=>id!==binding.nativeIds[index])))throw Error('Native gate adoption receipt differs from its acquired boundary');
    if(!Array.isArray(structures)||!structures.length||structures.length>256||
       structures.some(w=>!w||w.kind!=='wall'||w.status==='ruined'||typeof w.id!=='string'||!w.id||installed.has(w.id)||
         (gate?structures.length!==1||w.gate!==true||w.id!==gate.entityId:Boolean(w.gate)))||
       new Set(structures.map(w=>w.id)).size!==structures.length||!Array.isArray(ids)||ids.length!==(gate?3:structures.length)||
       ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length)throw TypeError('Invalid native wall additions');
    const resources=core.captureNativeWorldResources(worldBoundary);
    if(resources.kind!==2||resources.chunks.length||resources.removed.length)throw Error('Native wall adoption requires its empty terrain commit');
    const wasm=core.wasm,count=wasm.spatial_world_proposal_result_count();
    if(count!==ids.length)throw Error('Native wall result differs from its committed IDs');
    const actualIds=Array.from(new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),count));
    if(ids.some((id,i)=>id!==actualIds[i])||[...installed.values()].some(record=>record.ids.some(id=>ids.includes(id))))throw Error('Native wall result differs from its committed IDs');
    // Read only the existing barrier ABI, not a full world/prop snapshot.
    const wanted=new Set(ids),physical=new Map(),barrierCount=wasm.spatial_barrier_state_count();
    if(!Number.isSafeInteger(barrierCount)||barrierCount<ids.length)throw Error('Native wall registry unavailable');
    const pointer=wasm.spatial_barrier_state_ptr(),view=new DataView(wasm.memory.buffer,pointer,barrierCount*28);
    for(let i=0;i<barrierCount;i++){const at=i*28,id=view.getInt32(at,true);if(wanted.has(id))physical.set(id,{x:view.getFloat32(at+4,true),z:view.getFloat32(at+8,true),halfX:view.getFloat32(at+12,true),halfZ:view.getFloat32(at+16,true),yaw:view.getFloat32(at+20,true),passMask:view.getInt32(at+24,true)});}
    if(gate){
      const wall=structures[0],scale=gateScale(wall),numeric=Number(gate.entityId.slice('structure-'.length));
      if(wall.status!=='intact'||wall.hp!==wall.maxHp||nativeGateModelId(wall.material)!==gate.modelId||wall.x!==gate.x||wall.z!==gate.z||(wall.yaw??0)!==gate.yaw||scale*(wall.baseScaleX??1)!==gate.sx||scale!==gate.sz)throw Error('Native gate adoption differs from its quoted placement');
      if(wasm.nav_gate_mechanism_pose(numeric)!==1)throw Error('Native gate adoption lost its acquired mechanism');
      const pose=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_pose_ptr(),40));
      if(pose[0]!==numeric||pose[1]!==gate.modelId||pose[2]!==gate.mechanismId||pose[6]!==worldBoundary.effectiveTime||pose[7]!==gate.opening||!pose.slice(8,24).every((value,index)=>value===gate.rootMatrix[index])||!pose.slice(24,40).every((value,index)=>value===gate.leafMatrix[index]))throw Error('Native gate adoption pose differs from its prepared mechanism');
    }
    const records=[];
    for(let i=0;i<structures.length;i++){
      // Gate geometry is prepared by WASM. Reprojecting the legacy JS
      // footprint here can differ by one float32 ULP after world/local transforms.
      // Adopt the exact prepared triplet; solid walls retain their original check.
      const wall=structures[i],parts=gate?gate.proxies:spatialStructureBarriers(wall),partIds=gate?[...ids]:[ids[i]];
      const sameShape=(expected,actual)=>actual&&['x','z','halfX','halfZ','yaw'].every(key=>Number.isFinite(expected[key])&&Math.fround(expected[key])===actual[key])&&(expected.passMask??0)===actual.passMask;
      if(parts.length!==partIds.length||parts.some((part,index)=>{
        const actual=physical.get(partIds[index]);
        return !sameShape(part,actual);
      }))throw Error('Native wall footprint differs from its committed ID');
      records.push([wall.id,{signature:signature(wall),bounds:boundsForNativeBarriers(parts),ids:partIds}]);
    }
    const priorRevision=revision;let consumed=false;
    return ()=>{
    if(consumed||revision!==priorRevision)throw Error('Native wall mirror adoption is stale');consumed=true;
    // All checks precede the first mirror write; observers cannot see a prefix.
    for(const [id,record] of records)installed.set(id,record);
    const bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const [,record] of records){const box=record.bounds;bounds[0]=Math.min(bounds[0],box[0]);bounds[1]=Math.min(bounds[1],box[1]);bounds[2]=Math.max(bounds[2],box[2]);bounds[3]=Math.max(bounds[3],box[3]);}
    changes.push({from:revision++,bounds});if(changes.length>64)changes.shift();return true;
    };
  }
  function prepareNativeRemovalAdoption(structure,{worldBoundary,ids,nativeBarrierAdditionBinding}={}){
    const proof=copyNativeBarrierAdditionAttestation(nativeBarrierAdditionBinding),r=proof.reference.removal;
    if(!r||structure.id!==r.entityId||!sameNativeWorldBoundary(worldBoundary,proof.reference.worldBoundary)||JSON.stringify(ids)!==JSON.stringify(r.nativeIds))throw Error('Native wall removal receipt mismatch');
    const record=installed.get(structure.id),prior=revision;
    const wasm=core.wasm,resources=core.captureNativeWorldResources(worldBoundary),count=wasm.spatial_barrier_state_count();
    if(resources.kind!==2||resources.chunks.length||resources.removed.length||!Number.isSafeInteger(count)||count<0)throw Error('Native wall removal has no world receipt');
    if(wasm.spatial_world_proposal_result_count()!==3||Array.from(new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),3)).some((id,i)=>id!==ids[i]))throw Error('Native wall removal has another committed triplet');
    const view=new DataView(wasm.memory.buffer,wasm.spatial_barrier_state_ptr(),count*28);
    for(let i=0;i<count;i++)if(ids.includes(view.getInt32(i*28,true)))throw Error('Native removed proxy is still live');
    if(!record||record.signature!==signature(structure)||JSON.stringify(record.ids)!==JSON.stringify(ids)||wasm.nav_gate_mechanism_pose(Number(r.entityId.slice(10)))!==0)throw Error('Native wall removal has not retired its exact owner');
    let used=false;return ()=>{if(used||revision!==prior||installed.get(structure.id)!==record)throw Error('Native wall removal adoption is stale');used=true;installed.delete(structure.id);changes.push({from:revision++,bounds:record.bounds});if(changes.length>64)changes.shift();return true;};
  }
  const adoptNativeAdditions=(structures,receipt)=>prepareNativeAdditionAdoption(structures,receipt)();
  function routeUnaffectedSince(from,points,radius){
    if(!Number.isInteger(from)||from<0||from>revision||
      !Array.isArray(points)||points.length<2||!Number.isFinite(radius))return false;
    let cursor=from;
    for(const change of changes){
      if(change.from<cursor)continue;
      if(change.from!==cursor)return false;
      const [left,top,right,bottom]=change.bounds;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];
        if(![a?.x,a?.z,b?.x,b?.z].every(Number.isFinite))return false;
        if(Math.max(a.x,b.x)>=left-radius&&Math.min(a.x,b.x)<=right+radius&&
          Math.max(a.z,b.z)>=top-radius&&Math.min(a.z,b.z)<=bottom+radius)
          return false;
      }
      cursor++;
      if(cursor===revision)return true;
    }
    return cursor===revision;
  }
  function clear(){
    for(const [id,record] of installed){
      if(!removeSpatialStructure(core,record.ids))throw Error(`Could not remove spatial wall ${id}`);
    }
    installed.clear();
  }
  function captureOwners(){
    return [...installed].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([entityId,record])=>({entityId,ids:[...record.ids]}));
  }
  // Constructor only: no bodies, intent bindings, routes or published chunks
  // exist yet. Normal Repair keeps its acquired resources and never calls this.
  function restoreBootstrap(expected){
    if(![1,2].includes(expected?.version))throw TypeError('Invalid native wall bootstrap');
    validateSpatialState(expected.spatialState);
    const actual=core.snapshot(),actualOwners=captureOwners();
    validateSpatialWallOwners(actualOwners,actual);
    let owners=expected.wallOwners;
    if(expected.version===1){
      // Keep exact legacy reconstruction first. Only a complete bijection of
      // unique proxy shapes can recover a legacy allocation order difference.
      if(JSON.stringify(actual)===JSON.stringify(expected.spatialState))return;
      const shape=({id,...rest})=>JSON.stringify(rest),byShape=new Map();
      for(const row of expected.spatialState.barriers){const key=shape(row);if(byShape.has(key))throw Error('Ambiguous legacy native wall proxies');byShape.set(key,row.id);}
      const actualShapes=new Set(),mapping=new Map();
      for(const row of actual.barriers){const key=shape(row);if(actualShapes.has(key)||!byShape.has(key))throw Error('Legacy native wall reconstruction mismatch');actualShapes.add(key);mapping.set(row.id,byShape.get(key));}
      if(actualShapes.size!==byShape.size)throw Error('Legacy native wall reconstruction mismatch');
      owners=actualOwners.map(row=>({entityId:row.entityId,ids:row.ids.map(id=>mapping.get(id))}));
    }
    validateSpatialWallOwners(owners,expected.spatialState);
    if(owners.length!==installed.size)throw Error('Native wall owners differ from Game');
    const actualById=new Map(actual.barriers.map(row=>[row.id,row])),remapped=[];
    const nextRecords=[];
    for(const row of owners){
      const record=installed.get(row.entityId);
      if(!record||record.ids.length!==row.ids.length)throw Error('Native wall owner differs from Game');
      for(let i=0;i<row.ids.length;i++)remapped.push({...actualById.get(record.ids[i]),id:row.ids[i]});
      nextRecords.push([row.entityId,{...record,ids:[...row.ids]}]);
    }
    remapped.sort((a,b)=>a.id-b.id);
    const authorized={...actual,barriers:remapped,nextBarrierId:expected.spatialState.nextBarrierId};
    // Includes seed, settlements, polygons, suppressions, dimensions, masks and
    // every saved ID. No shape tolerance or weakened final verification.
    if(JSON.stringify(authorized)!==JSON.stringify(expected.spatialState))throw Error('Native wall bootstrap reconstruction mismatch');
    if(JSON.stringify(actual)!==JSON.stringify(authorized)){
      const {cx,cz}=core.currentChunk();core.restoreState(authorized,cx,cz);
      if(JSON.stringify(core.snapshot())!==JSON.stringify(expected.spatialState))throw Error('Native restored wall state mismatch');
    }
    for(const [id,record] of nextRecords)installed.set(id,record);
  }
  if(bootstrap!==null){sync(structures);restoreBootstrap(bootstrap);}

  return {sync,captureOwners,adoptNativeAdditions,prepareNativeAdditionAdoption,prepareNativeRemovalAdoption,clear,revision:()=>revision,routeUnaffectedSince,
    barrierIds:id=>installed.get(id)?.ids.slice()??[]};
}
