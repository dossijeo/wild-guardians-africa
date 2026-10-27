import {centerFootprint} from '../centers.js';

// Place authored village units on the native wet banks. The visual buildings
// and the native collision graph consume this one layout; no JS terrain recipe
// is consulted while locating the canyon settlement.
export function spatialCanyonLayout(payload,field,z,{canyonOpenRight=false}={}){
  const rows=[z,z],buildings=[];
  for(const [i,unit] of payload.units.entries()){
    const side=canyonOpenRight?1:i%2?-1:1,index=canyonOpenRight?i%2:side===1?0:1;
    const width=(unit.max[0]-unit.min[0])*16;
    const depth=(unit.max[2]-unit.min[2])*16;
    const yaw=width>depth?Math.PI/2:0;
    const hx=Math.min(width,depth)/2,hz=Math.max(width,depth)/2;
    const bz=rows[index]+hz;rows[index]=bz+hz+3;
    let edge=0;
    for(let dz=-hz-1;dz<=hz+1;dz+=.5)
      edge=Math.max(edge,side*(field.riverEdge(bz+dz,side)-field.riverX(bz))+.9);
    const x=field.riverX(bz)+side*(edge+hx+1.25+(canyonOpenRight&&index?25:0));
    const c=Math.cos(yaw),n=Math.sin(yaw);
    const cx=(unit.min[0]+unit.max[0])*8,cz=(unit.min[2]+unit.max[2])*8;
    const hull=unit.hull??[[unit.min[0],unit.min[2]],[unit.max[0],unit.min[2]],
      [unit.max[0],unit.max[2]],[unit.min[0],unit.max[2]]];
    const footprint=hull.map(([px,pz])=>{
      const dx=px*16-cx,dz=pz*16-cz;
      return {x:x+dx*c+dz*n,z:bz-dx*n+dz*c};
    });
    buildings.push({key:unit.key,kind:unit.kind,x,z:bz,radius:Math.hypot(hx,hz),
      unit:unit.key,yaw,footprint});
  }
  const center={kind:'center',x:field.riverX(Math.max(...rows)+10)+13,
    z:Math.max(...rows)+10,
    culture:payload.id==='saheliano'?'saheliana':payload.id};
  const local=centerFootprint({...center,x:0,z:0}).footprint;
  // The native canyon keeps its riverbed unlevelled slightly beyond the wet
  // edge. Leave room for the full center footprint on the dry, levelled bank.
  center.x=Math.max(...local.map(point=>field.riverEdge(center.z+point.z,1)+3-point.x));
  return {x:field.riverX(z),z,buildings,center};
}
