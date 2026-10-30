import {Vector3} from 'three';
// Bounded command-time route search; no frame-time collision or allocation work.
export function planRitualArc(origin,target,camera,blocked){
 const dx=target.x-origin.x,dz=target.z-origin.z,length=Math.hypot(dx,dz);
 if(length<2)return null;
 camera.updateWorldMatrix(true,false);
 const eye=camera.position.toArray(),v=new Vector3(),candidates=[];
 for(const side of [0,-2,2,-4,4,-6,6,-8,8,-10,10])for(const lift of [0,2,4,6])candidates.push({x:(-dz/length*side)||0,y:lift,z:dx/length*side,cost:Math.abs(side)+lift*1.3});
 candidates.sort((a,b)=>a.cost-b.cost);
 for(const arc of candidates){
  let clear=true,previous=[origin.x,origin.y,origin.z];
  for(let i=1;i<=12;i++){
   const t=i/12,w=Math.sin(Math.PI*t),p=[origin.x+dx*t+arc.x*w,origin.y+(target.y-origin.y)*t+arc.y*w,origin.z+dz*t+arc.z*w];
   v.set(...p).applyMatrix4(camera.matrixWorldInverse);
   if(-v.z<camera.near||-v.z>camera.far){clear=false;break;}
   v.applyMatrix4(camera.projectionMatrix);
   if(Math.abs(v.x)>.88||Math.abs(v.y)>.88||blocked(previous,p,.5)||(i>=3&&i<=6&&blocked(eye,p,0))){clear=false;break;}
   previous=p;
  }
  if(clear)return arc;
 }
 return null;
}
