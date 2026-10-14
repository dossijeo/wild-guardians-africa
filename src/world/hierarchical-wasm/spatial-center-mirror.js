import {centerCulture} from '../centers.js';
import {addSpatialCenter,removeSpatialCenter} from './spatial-center-bridge.js';

// A work center changes navigation only when its footprint appears, moves or
// disappears. Damage and repair on an intact center keep its polygon resident.
export function createSpatialCenterMirror(core){
  const installed=new Map();
  let revision=0;
  const signature=(center,state)=>[center.x,center.z,center.yaw??0,
    centerCulture(center,state)].join(':');
  function sync(state){
    if(!Array.isArray(state?.structures))throw TypeError('Expected game structures');
    const desired=new Map();
    for(const center of state.structures){
      if(center.kind!=='center'||center.status==='ruined')continue;
      if(center.id==null||desired.has(center.id))throw TypeError('Work center IDs must be unique');
      desired.set(center.id,center);
    }
    let removed=0;
    for(const [id,previous] of installed){
      if(desired.has(id)&&previous.signature===signature(desired.get(id),state))continue;
      if(removeSpatialCenter(core,previous.polygonId)!==1)
        throw Error(`Could not remove spatial work center ${id}`);
      installed.delete(id);
      removed++;
    }
    let added=0;
    for(const [id,center] of desired){
      if(installed.has(id))continue;
      installed.set(id,{signature:signature(center,state),polygonId:addSpatialCenter(core,center,state)});
      added++;
    }
    if(removed||added)revision++;
    return {count:installed.size,added};
  }
  function clear(){
    for(const [id,record] of installed){
      if(removeSpatialCenter(core,record.polygonId)!==1)
        throw Error(`Could not remove spatial work center ${id}`);
    }
    installed.clear();
  }
  return {sync,clear,revision:()=>revision,polygonId:id=>installed.get(id)?.polygonId??null};
}
