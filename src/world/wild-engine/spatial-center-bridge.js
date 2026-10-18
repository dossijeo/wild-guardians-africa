import {centerFootprint} from '../centers.js';

export function addSpatialCenter(core,center,state){
  if(center?.kind!=='center'||center.status==='ruined')
    throw TypeError('Expected an intact work center');
  return core.addPolygon(centerFootprint(center,state).footprint,0);
}

export function removeSpatialCenter(core,id){return core.removePolygon(id);}
