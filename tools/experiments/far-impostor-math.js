// Experimental math shared by the isolated atlas/3D prototype, not gameplay.
const TAU=Math.PI*2;
export function atlasViews(camera,base,yaw,views=8){
 const angle=((Math.atan2(camera.x-base.x,camera.z-base.z)-yaw)%TAU+TAU)%TAU,index=angle/TAU*views,first=Math.floor(index)%views;
 return {first,second:(first+1)%views,blend:index-Math.floor(index),nearest:Math.round(index)%views};
}
export function lodMix(distance,start,end,ready=1){
 if(!(end>start))throw new Error('Transition end must exceed start');
 const t=Math.max(0,Math.min(1,(distance-start)/(end-start)));
 return 1-Math.max(0,Math.min(1,ready))*(1-t*t*(3-2*t));
}
export function modelOrigin(base,localBase,yaw,scale){
 const c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:base.x-(localBase[0]*c+localBase[2]*s)*scale,y:base.y-localBase[1]*scale,z:base.z-(-localBase[0]*s+localBase[2]*c)*scale};
}
export function billboardRight(camera,base){
 const dx=camera.x-base.x,dz=camera.z-base.z,length=Math.hypot(dx,dz);
 return length?{x:dz/length,y:0,z:-dx/length}:{x:1,y:0,z:0};
}
