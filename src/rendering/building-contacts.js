import {centerFootprint,centerCulture} from '../world/centers.js';
import {footprintDistance} from '../world/footprints.js';
import {wallCollisionPolygon,wallCollisionFrame} from '../world/wall-collision-frame.js';

const castsContact=s=>!['ruined','collapsing'].includes(s.status)&&(s.kind==='center'||s.kind==='wall'&&!s.gate);
const wallIntegrity=s=>Number.isFinite(s.hp)&&s.maxHp>0?Math.max(0,Math.min(1,s.hp/s.maxHp)):1;

export function buildingContactKey(state){
 return JSON.stringify((state?.structures??[]).filter(castsContact).map(s=>s.kind==='center'?[s.id,s.x,s.z,s.yaw??0,centerCulture(s,state)]:[s.id,s.x,s.z,s.yaw??0,s.baseScaleX??1,s.material,wallIntegrity(s)]));
}
// Merge into the existing resident AO map, retaining natural prop occlusion.
// This approximates low-frequency sky occlusion around a solid footprint.
export function rasterBuildingContacts(data,state,{reach=1.2,strength=.38}={}){
 const {pixels,bounds:[x0,z0,width,height]}=data,size=Math.sqrt(pixels.length);
 if(!(width>0&&height>0&&Number.isInteger(size)))throw Error('Invalid contact atlas');
 for(const structure of state?.structures??[]){
  if(!castsContact(structure))continue;
  const wall=structure.kind==='wall';
  const frame=wall?wallCollisionFrame(structure):null;
  const hull=wall?wallCollisionPolygon(structure,0):centerFootprint(structure,state).footprint;
  const localReach=wall?Math.min(reach,.55):reach,localStrength=wall?Math.min(strength,.24)*wallIntegrity(structure):strength;
  const xs=hull.map(p=>p.x),zs=hull.map(p=>p.z);
  const minX=Math.max(0,Math.floor((Math.min(...xs)-localReach-x0)/width*size)),maxX=Math.min(size-1,Math.ceil((Math.max(...xs)+localReach-x0)/width*size));
  const minZ=Math.max(0,Math.floor((Math.min(...zs)-localReach-z0)/height*size)),maxZ=Math.min(size-1,Math.ceil((Math.max(...zs)+localReach-z0)/height*size));
  for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
   const px=x0+(x+.5)*width/size,pz=z0+(z+.5)*height/size;
   // Exact distance to the oriented wall rectangle, avoiding four edge tests
   // and a point-in-polygon test for every atlas texel during an impact.
   const dx=frame?px-frame.x:0,dz=frame?pz-frame.z:0;
   const distance=frame?Math.hypot(Math.max(0,Math.abs(dx*frame.c-dz*frame.s)-frame.width),Math.max(0,Math.abs(dx*frame.s+dz*frame.c)-frame.depth)):footprintDistance(hull,px,pz);
   if(distance>=localReach)continue;
   const t=distance/localReach,falloff=1-t*t*(3-2*t),value=Math.round(255*(1-localStrength*falloff));
   const index=z*size+x;pixels[index]=Math.min(pixels[index],value);
  }
 }
 return data;
}
