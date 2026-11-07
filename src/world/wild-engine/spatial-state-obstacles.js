import {centerFootprint} from '../centers.js';

// Common projection of confirmed structures and village buildings. Native
// navigation retains its own revision cache; visual clients can use this
// projection without querying the navigation authority.
export function spatialStateObstacles(state){
 return [
  ...state.structures.filter(item=>item.status!=='ruined').map(item=>
   item.kind==='center'?centerFootprint(item,state):{...item,radius:.7}),
  ...state.villages.flatMap(village=>(village.buildings??[])
   .filter(item=>item.kind!=='Zona común').map(item=>({...item,radius:item.radius??2.8})))
 ];
}
