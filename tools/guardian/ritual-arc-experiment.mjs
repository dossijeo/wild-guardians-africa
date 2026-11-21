// Command-time planning only. Preserve endpoints and normal short spirals.
export function ritualArcLift(origin,target,camera,blocked){
 const dx=target.x-origin.x,dz=target.z-origin.z;
 if(Math.hypot(dx,dz)<2)return 0;
 const eye=camera.position.toArray();
 for(const lift of [0,2,4,6,8,10,12]){
  let clear=true,previous=[origin.x,origin.y,origin.z];
  for(let i=1;i<=8;i++){
   const t=i/8,p=[origin.x+dx*t,origin.y+(target.y-origin.y)*t+Math.sin(Math.PI*t)*lift,origin.z+dz*t];
   // The final descent can be hidden by the object being blessed, but the
   // channelled arc must be visible before reaching that contact region.
   if(blocked(previous,p,.25)||(i>=2&&i<=6&&blocked(eye,p,0))){clear=false;break;}
   previous=p;
  }
  if(clear)return lift;
 }
 // No verified route: retain existing presentation, never ignore depth tests.
 return 0;
}
