// Same arc-length sampling and arithmetic as the original Bastion lab.
// Monotonic distances let one cursor visit each source edge only once.
import {WALL_UNIT,resample as nativeResample} from './wall-layout-native.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function resampleWallStroke(points){
 if(points.length<2)return [];
 const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+dist(points[i-1],points[i]));
 const length=distances.at(-1);if(length<.15)return [];
 if(!Number.isFinite(length))return nativeResample(points);
 const count=Math.min(350,Math.max(1,Math.ceil(length/WALL_UNIT))),step=length/count;
 let cursor=1;
 const at=t=>{
  while(cursor<distances.length-1&&distances[cursor]<t)cursor++;
  const f=clamp((t-distances[cursor-1])/(distances[cursor]-distances[cursor-1]||1),0,1);
  return [points[cursor-1][0]*(1-f)+points[cursor][0]*f,points[cursor-1][1]*(1-f)+points[cursor][1]*f];
 };
 const slots=[];let a=at(0);
 for(let i=0;i<count;i++){
  const b=at((i+1)*step),chord=dist(a,b);
  if(!(chord<.06))slots.push({x:(a[0]+b[0])*.5,z:(a[1]+b[1])*.5,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:chord/WALL_UNIT});
  a=b;
 }
 return slots;
}


// Original farthest-point rule and strict tie handling, without recursively
// slicing arrays. Endpoints remain references to the same original samples.
export function simplifyWallStroke(points,epsilon=.12){
 if(points.length<3)return points;
 const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;
 const pending=[0,points.length-1];
 while(pending.length){
  const end=pending.pop(),start=pending.pop(),a=points[start],b=points[end];let distance=0,index=0;
  const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  for(let i=start+1;i<end;i++){
   const p=points[i],t=length?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length,0,1):0;
   const d=Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dz));
   if(d>distance){distance=d;index=i;}
  }
  if(distance>epsilon){keep[index]=1;pending.push(index,end,start,index);}
 }
 return points.filter((_,i)=>keep[i]);
}
