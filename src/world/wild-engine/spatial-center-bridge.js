import {centerFootprint} from '../centers.js';

export function addSpatialCenter(core,center,state){
  if(center?.kind!=='center'||center.status==='ruined')
    throw TypeError('Expected an intact work center');
  const owner=Number(/^structure-([1-9][0-9]*)$/.exec(center.id)?.[1]??0);
  return core.addPolygon(centerFootprint(center,state).footprint,0,owner);
}

export function removeSpatialCenter(core,id){return core.removePolygon(id);}
