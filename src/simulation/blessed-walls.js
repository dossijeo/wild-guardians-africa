import {AWAKENINGS as A} from './awakening-config.js';
import {wallLayout} from '../world/wall-layout.js';
import {segmentDistance} from '../world/footprints.js';

const sources=new WeakMap();
const intact=wall=>wall.kind==='wall'&&wall.status==='intact'&&wall.hp>0;
function wallSources(state){
  let cached=sources.get(state);
  if(!cached||cached.structures!==state.structures||cached.total!==state.awakenings?.total){
    cached={structures:state.structures,total:state.awakenings?.total,
      walls:state.structures.filter(wall=>wall.blessing&&wall.kind==='wall')};
    sources.set(state,cached);
  }
  return cached.walls;
}
// Exactly the segment graph's contact rule, including crossings and T junctions.
// Centers being close does not constitute a connection. No transitive propagation.
export function wallsContiguous(a,b){
  if(a===b||!intact(a)||!intact(b))return false;
  const layout=wallLayout([a,b],{});
  const ends=layout.pieces.map(piece=>layout.endpoints(piece).map(([x,z])=>({x,z})));
  return segmentDistance(...ends[0],...ends[1])<.10;
}
export function wallDamageReduction(wall,state=null){
  if(!intact(wall)||state?.awakenings?.enabled===false)return 0;
  if(wall.blessing)return A.wallReduction;
  if(!state)return 0;
  for(const source of wallSources(state))
    if(source.blessing&&intact(source)&&wallsContiguous(source,wall))return A.neighborReduction;
  return 0;
}
