import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';

// Fit an approaching group in the existing orbit orientation. Leave space for
// the right HUD and the lower tutorial; this does not change actor positions.
export function raidGroupFrame(animals,field,camera,travel){
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,count=0;
 for(const a of animals){if(['gone','retreating'].includes(a.status))continue;const r=a.radius??1;minX=Math.min(minX,a.x-r);maxX=Math.max(maxX,a.x+r);minZ=Math.min(minZ,a.z-r);maxZ=Math.max(maxZ,a.z+r);count++;}
 if(count<2)return null;
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2,y=field.surface(x,z)+.18;
 const st=Math.sin(travel.theta),ct=Math.cos(travel.theta),sp=Math.sin(travel.phi),cp=Math.cos(travel.phi);
 const tanV=Math.tan(camera.fov*Math.PI/360)/camera.zoom,tanH=tanV*camera.aspect;
 let distance=18;
 for(const a of animals){
  if(['gone','retreating'].includes(a.status))continue;
  const r=a.radius??1,ground=field.surface(a.x,a.z),height=ANIMAL_ACTIONS.animals[a.species]?.presentation.bindHeight??3;
  for(let corner=0;corner<8;corner++){
   const dx=a.x-x+(corner&1?r:-r),dz=a.z-z+(corner&2?r:-r),dy=ground-y+(corner&4?height:0);
   const right=ct*dx-st*dz,up=-cp*(st*dx+ct*dz)+sp*dy,towards=sp*(st*dx+ct*dz)+cp*dy;
   distance=Math.max(distance,(right+.60*towards*tanH)/(.75*tanH),(-right+.90*towards*tanH)/(.75*tanH),towards+up/(.72*tanV),towards-up/(.55*tanV));
  }
 }
 // Keep the widest required frame during this single arrival trip. Never
 // pulse the zoom as individual actors change their paths or gait.
 distance=Math.max(distance,travel.groupDistance??0);
 return {x:x+ct*.15*distance*tanH,z:z-st*.15*distance*tanH,distance};
}
