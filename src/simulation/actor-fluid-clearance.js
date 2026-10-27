import {fluidAt} from '../world/fluid-placement.js';

// A sampled route prefix cannot prove that every later physical landing is
// dry. Check the requested footprint, without re-evaluating terrain slopes.
// Mangrove channels admit all actors; canyon water admits workers only.
export function actorFluidClear(nav,point,radius,worker=false){
 const field=nav.field;
 if(!field||field.wetland||worker&&field.canyon)return true;
 for(let sample=0;sample<5;sample++){
  const x=point.x+(sample===1?radius:sample===2?-radius:0);
  const z=point.z+(sample===3?radius:sample===4?-radius:0);
  if(fluidAt(field,x,z))return false;
 }
 return true;
}
