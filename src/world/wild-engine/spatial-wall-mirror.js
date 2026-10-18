import {spatialStructureBarriers,removeSpatialStructure} from './spatial-wall-bridge.js';

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
  return {sync,clear,revision:()=>revision,routeUnaffectedSince,
    barrierIds:id=>installed.get(id)?.ids.slice()??[]};
}
