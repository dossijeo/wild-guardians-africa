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

// Fixed populations use an explicit revision when tree positions change.
export class NearTreeSelection {
 constructor(trees){this.trees=trees;this.indices=[];this.scans=0;this.inputs=null;}
 update(x,z,end,available,revision=0){
  const previous=this.inputs;
  if(previous&&previous.x===x&&previous.z===z&&previous.end===end&&previous.available===available&&previous.revision===revision)return false;
  this.inputs={x,z,end,available,revision};this.scans++;
  const oldLength=this.indices.length;let count=0,changed=!!previous&&previous.revision!==revision;
  if(available)for(let i=0;i<this.trees.length;i++){const t=this.trees[i];if(Math.hypot(t.x-x,t.z-z)>=end)continue;if(this.indices[count]!==i)changed=true;this.indices[count++]=i;}
  if(count!==oldLength)changed=true;this.indices.length=count;return changed;
 }
}
