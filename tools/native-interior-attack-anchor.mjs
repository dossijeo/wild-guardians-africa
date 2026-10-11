// An anchor is only a seed for the existing positive enclosure checks.
// It does not certify an enclosed region or turn a failed route into a proof.
import {containsPoint} from '../src/world/footprints.js';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
export function nativeInteriorAttackAnchor(state,view,radius,outline){
 const polygon=outline?.map(([x,z])=>({x,z}));
 const interior=p=>!polygon||containsPoint(polygon,p.x,p.z);
 const crops=state.plants.filter(p=>p.alive);
 for(const crop of crops){
  if(interior(crop)&&view.walkable(crop.x,crop.z,radius,null,false))return {x:crop.x,z:crop.z,targetId:crop.id,kind:'crop-pivot'};
 }
 // Contact fallback needs an explicit contour to exclude exterior positions.
 if(!polygon)return null;
 for(const crop of crops)for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,point={x:crop.x+Math.sin(angle)*(.6+radius),z:crop.z+Math.cos(angle)*(.6+radius)};
  if(interior(point)&&view.walkable(point.x,point.z,radius,null,false)&&agriculturalRayClear(state,view,point,crop))return {...point,targetId:crop.id,kind:'crop-contact'};
 }
 return null;
}
