import * as THREE from 'three';
// Presentation-only plant region. Camera and original crop geometry stay fixed.
// Intersection of both supported QA aspects and orbit endpoints, computed once.
export function createLoadingPlantRegion(radius){
 const views=[];
 for(const [aspect,distance,height,bottom] of [[1280/720,1,1,-.48],[390/844,1.65,1.45,-.65]])for(const degrees of [-10,0,10]){
  const a=degrees*Math.PI/180,c=new THREE.PerspectiveCamera(40,aspect,.1,80);
  c.position.set((4.8*Math.cos(a)+6.4*Math.sin(a))*distance,3.1*height,(6.4*Math.cos(a)-4.8*Math.sin(a))*distance);c.lookAt(0,1.15,0);c.updateMatrixWorld();views.push({c,bottom});
 }
 const v=new THREE.Vector3();
 const valid=(x,z)=>{
  if(Math.hypot(x,z)>radius)return false;
  for(const {c,bottom} of views)for(const dx of [-.55,.55])for(const dz of [-.55,.55])for(const y of [.09,2.7]){
   v.set(x+dx,y,z+dz).project(c);if(Math.abs(v.x)>.92||v.y>.86||v.y<bottom)return false;
  }return true;
 };
 return valid;
}
