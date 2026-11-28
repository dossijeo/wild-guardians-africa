import {centerCulture,centerFootprint} from '../centers.js';
import {addSpatialCenter,removeSpatialCenter} from './spatial-center-bridge.js';
import {captureSpatialPolygons} from './spatial-state.js';

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
  function prepareRuinAdoption(center,state,id){
    const source=installed.get(center.id);
    const current=()=>!!source&&installed.get(center.id)===source&&source.polygonId===id&&
      state.structures.includes(center)&&center.status==='collapsing'&&source.signature===signature(center,state);
    if(!current())throw Error('Center ruin lost its installed footprint');
    return {valid:current,adopt(){
      if(!current())throw Error('Center ruin adoption changed');
      installed.delete(center.id);
      revision++;
    }};
  }
  function preparePlacementAdoption(center,state,polygonId){
    const stamp=signature(center,state),points=centerFootprint(center,state).footprint;
    const [polygon]=captureSpatialPolygons(core.wasm,polygonId,{includeWorkCenter:true});
    if(installed.has(center.id)||polygon?.workCenter!==Number(center.id.slice(10))||polygon.passMask!==0||
       points.length!==polygon.points.length||points.some(({x,z},i)=>Math.fround(x)!==polygon.points[i].x||Math.fround(z)!==polygon.points[i].z))
      throw Error('Placed center lost its native footprint');
    return ()=>{
      if(installed.has(center.id)||!state.structures.includes(center)||signature(center,state)!==stamp)
        throw Error('Placed center adoption changed');
      installed.set(center.id,{signature:stamp,polygonId});revision++;
    };
  }
  function workCenterOwners(){
    return new Map([...installed].flatMap(([id,{polygonId}])=>{
      const owner=Number(/^structure-([1-9][0-9]*)$/.exec(id)?.[1]??0);
      return owner?[[polygonId,owner]]:[];
    }));
  }
  return {sync,clear,prepareRuinAdoption,preparePlacementAdoption,workCenterOwners,revision:()=>revision,polygonId:id=>installed.get(id)?.polygonId??null};
}
