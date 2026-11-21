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
export function createSpatialWallMirror(core){
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
  return {sync,adoptNativeAdditions,prepareNativeAdditionAdoption,clear,revision:()=>revision,routeUnaffectedSince,
    barrierIds:id=>installed.get(id)?.ids.slice()??[]};
}
