import {addSpatialStructuresBatch,removeSpatialStructure} from './spatial-wall-bridge.js';

// Experimental state-to-topology seam. The game remains responsible for
// authorizing placement, damage and destruction; this only mirrors the
// resulting rigid footprints into the spatial navigator.
export function createSpatialWallMirror(core){
  const installed=new Map();
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
    for(const [id,previous] of installed){
      if(desired.has(id)&&previous.signature===signature(desired.get(id)))continue;
      if(!removeSpatialStructure(core,previous.ids))
        throw Error(`Could not remove spatial wall ${id}`);
      installed.delete(id);
    }
    const additions=[...desired].filter(([id])=>!installed.has(id));
    // A chain commit (including an automatic-gate conversion) becomes one
    // graph refresh, rather than rebuilding sectors for every new module.
    for(let offset=0;offset<additions.length;offset+=256){
      const batch=additions.slice(offset,offset+256);
      const groups=addSpatialStructuresBatch(core,batch.map(([,wall])=>wall));
      batch.forEach(([id,wall],index)=>installed.set(id,{signature:signature(wall),ids:groups[index]}));
    }
    return {count:installed.size,added:additions.length};
  }
  function clear(){
    for(const [id,record] of installed){
      if(!removeSpatialStructure(core,record.ids))throw Error(`Could not remove spatial wall ${id}`);
    }
    installed.clear();
  }
  return {sync,clear,barrierIds:id=>installed.get(id)?.ids.slice()??[]};
}
