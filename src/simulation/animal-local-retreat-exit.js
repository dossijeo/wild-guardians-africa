// Last-resort physical exit for an exhausted animal whose assigned retreat
import {activeCrops} from './active-crops.js';
// corridor became disconnected. The candidate must stay outside the farm and
// every metre to it is validated by the native body-width swept test.
const RADII=[4,6,8,12];
const OFFSETS=[0];for(let i=1;i<16;i++)OFFSETS.push(i*Math.PI/16,-i*Math.PI/16);OFFSETS.push(Math.PI);
export function animalLocalRetreatExit(state,actor,nav,prior=null){
 if(actor.status!=='retreating'||!nav.walkable||!nav.segmentClear)return null;
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 const include=p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);};
 for(const p of activeCrops(state.plants))include(p);
 for(const o of state.structures)if(o.status==='intact')include(o);
 if(!Number.isFinite(minX))return null;
 const centerX=(minX+maxX)/2,centerZ=(minZ+maxZ)/2;
 const heading=Math.atan2(actor.x-centerX,actor.z-centerZ),clearance=(actor.radius??.28)+.5;
 for(const reach of RADII)for(const offset of OFFSETS){
  const angle=heading+offset,point={x:actor.x+Math.sin(angle)*reach,z:actor.z+Math.cos(angle)*reach};
  if(point.x>=minX-clearance&&point.x<=maxX+clearance&&point.z>=minZ-clearance&&point.z<=maxZ+clearance)continue;
  if(prior&&Math.hypot(point.x-prior.x,point.z-prior.z)<.25)continue;
  if(!nav.walkable(point.x,point.z,actor.radius??.28,null,false))continue;
  if(nav.segmentClear(actor,point,actor.radius??.28,null,false))return point;
 }
 return null;
}
