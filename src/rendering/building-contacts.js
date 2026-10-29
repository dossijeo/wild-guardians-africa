import {centerFootprint,centerCulture} from '../world/centers.js';
import {footprintDistance} from '../world/footprints.js';

export function buildingContactKey(state){
 return JSON.stringify((state?.structures??[]).filter(s=>s.kind==='center'&&s.status!=='ruined'&&s.status!=='collapsing').map(s=>[s.id,s.x,s.z,s.yaw??0,centerCulture(s,state)]));
}
// Merge into the existing resident AO map, retaining natural prop occlusion.
// This approximates low-frequency sky occlusion around a solid footprint.
export function rasterBuildingContacts(data,state,{reach=1.2,strength=.38}={}){
 const {pixels,bounds:[x0,z0,width,height]}=data,size=Math.sqrt(pixels.length);
 if(!(width>0&&height>0&&Number.isInteger(size)))throw Error('Invalid contact atlas');
 for(const structure of state?.structures??[]){
  if(structure.kind!=='center'||['ruined','collapsing'].includes(structure.status))continue;
  const hull=centerFootprint(structure,state).footprint;
  const xs=hull.map(p=>p.x),zs=hull.map(p=>p.z);
  const minX=Math.max(0,Math.floor((Math.min(...xs)-reach-x0)/width*size)),maxX=Math.min(size-1,Math.ceil((Math.max(...xs)+reach-x0)/width*size));
  const minZ=Math.max(0,Math.floor((Math.min(...zs)-reach-z0)/height*size)),maxZ=Math.min(size-1,Math.ceil((Math.max(...zs)+reach-z0)/height*size));
  for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
   const distance=footprintDistance(hull,x0+(x+.5)*width/size,z0+(z+.5)*height/size);
   if(distance>=reach)continue;
   const t=distance/reach,falloff=1-t*t*(3-2*t),value=Math.round(255*(1-strength*falloff));
   const index=z*size+x;pixels[index]=Math.min(pixels[index],value);
  }
 }
 return data;
}
