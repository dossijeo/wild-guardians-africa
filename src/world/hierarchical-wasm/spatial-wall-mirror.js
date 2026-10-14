import {spatialStructureBarriers,removeSpatialStructure} from './spatial-wall-bridge.js';

// Experimental state-to-topology seam. The game remains responsible for
// authorizing placement, damage and destruction; this only mirrors the
// resulting rigid footprints into the spatial navigator.
export function createSpatialWallMirror(core){
  const installed=new Map();
  let revision=0;
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
      const addBatch=additions.slice(addOffset,addOffset+256);
      addOffset+=addBatch.length;
      const parts=addBatch.map(([,wall])=>spatialStructureBarriers(wall));
      const ids=core.applyBarrierChanges(removeBatch.flatMap(([,record])=>record.ids),parts.flat());
      for(const [id] of removeBatch)installed.delete(id);
      let index=0;
      addBatch.forEach(([id,wall],item)=>{
        installed.set(id,{signature:signature(wall),ids:ids.slice(index,index+parts[item].length)});
        index+=parts[item].length;
      });
    }
    if(removals.length||additions.length)revision++;
    return {count:installed.size,added:additions.length};
  }
  function clear(){
    for(const [id,record] of installed){
      if(!removeSpatialStructure(core,record.ids))throw Error(`Could not remove spatial wall ${id}`);
    }
    installed.clear();
  }
  return {sync,clear,revision:()=>revision,barrierIds:id=>installed.get(id)?.ids.slice()??[]};
}
