import * as THREE from 'three';
import {nearbyPlantPlacement} from '../../src/world/nearby-plant-placement.js';
// Presentation-only plant region. Camera and original crop geometry stay fixed.
// Intersection of both supported QA aspects and orbit endpoints, computed once.
export function installPlantRegion(d){
 const views=[];
 for(const [aspect,distance,height,bottom] of [[1280/720,1,1,-.48],[390/844,1.65,1.45,-.65]])for(const degrees of [-10,0,10]){
  const a=degrees*Math.PI/180,c=new THREE.PerspectiveCamera(40,aspect,.1,80);
  c.position.set((4.8*Math.cos(a)+6.4*Math.sin(a))*distance,3.1*height,(6.4*Math.cos(a)-4.8*Math.sin(a))*distance);c.lookAt(0,1.15,0);c.updateMatrixWorld();views.push({c,bottom});
 }
 const v=new THREE.Vector3();
 const valid=(x,z)=>{
  if(Math.hypot(x,z)>d.plants.radius)return false;
  for(const {c,bottom} of views)for(const dx of [-.55,.55])for(const dz of [-.55,.55])for(const y of [.09,2.7]){
   v.set(x+dx,y,z+dz).project(c);if(Math.abs(v.x)>.92||v.y>.86||v.y<bottom)return false;
  }return true;
 };
 const plant=d.plants.plant.bind(d.plants);
 d.plants.plant=(x,z,options)=>valid(x,z)?plant(x,z,options):null;
 d.plants.plantNearby=(x,z)=>{
  if(!d.plants.accepting||d.plants.plants.length>=d.plants.capacity)return null;
  const p=nearbyPlantPlacement(x,z,{plants:d.plants.plants,spacing:d.plants.spacing,boundaryRadius:d.plants.radius,valid});return p?d.plants.plant(p.x,p.z):null;
 };
 return {valid};
}
