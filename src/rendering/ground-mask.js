// Extracted from Bioma Lab V4.1.10.3.
import {noise} from '../world/terrain.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function groundWear417(field,b,x,z,meso){
 const s=field.c.settlementSite;if(!s)return 0;const dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz);
 if(d>s.haloRadius+4)return 0;
 const angle=s.yaw||0,cs=Math.cos(angle),sn=Math.sin(angle);
 const xx=dx*cs+dz*sn,zz=-dx*sn+dz*cs;
 const core=1-smooth(s.clearRadius*.48,s.clearRadius+2.3+(meso-.5)*3,d);
 // Short worn corridors, aligned to the existing cleared X/Z approaches.
 // Only a material mask: no road meshes, no clearing additional vegetation.
 const warp=(noise(x*.055,z*.055,field.seed^97137)-.5)*1.05;
 const line=Math.min(Math.abs(dx+warp),Math.abs(dz-warp));
 const path=(1-smooth(1.05,3.1,line))*(1-smooth(s.softRadius-2,s.haloRadius+1,d));
 const yard=.81+.19*meso;
 return clamp(Math.max(core*yard,path*.74),0,1);
}
function groundSample417(field,b,x,z){
 const s=field.seed;
 const vegetation=noise(x*.045,z*.045,s^(3*7781)); // same field as group 2 scatter
 const meso=clamp(noise(x*.030,z*.030,s^97103)*.64+noise(x*.115,z*.115,s^97109)*.36,0,1);
 let moisture=0,cover=0;
 if(!field.canyon&&!field.desert){
  moisture=field.moisture(x,z);
  if(field.wetland){
   // Moss, NOT lawn. Most mud keeps its original wet/PBR material.
   cover=smooth(.45,.80,field.wetlandCluster(x,z)*.62+meso*.38)*.42;
  }else{
   const patch=vegetation*.57+meso*.28+moisture*.15;
   cover=field.c.biome==='grand_river'?.22+.78*smooth(.26,.70,patch):
         field.c.biome==='volcanoes'?.14*smooth(.60,.82,patch):smooth(.28,.72,patch)*.96;
  }
 }
 const wear=groundWear417(field,b,x,z,meso);
 return [clamp(cover,0,1),meso,clamp(moisture,0,1),wear];
}
function buildGroundMask417(config,b,field,bo){
 const n=35,step=1.5,bytes=new Uint8Array(n*n*4);
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=bo.minX+(ix-1)*step,z=bo.minZ+(iz-1)*step,c=groundSample417(field,b,x,z),at=(iz*n+ix)*4;
  for(let k=0;k<4;k++)bytes[at+k]=Math.round(c[k]*255);
 }
 return bytes;
}
export {groundWear417,groundSample417,buildGroundMask417};
