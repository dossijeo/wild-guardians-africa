import {beginTerrainCameraTravel,stepTerrainCameraTravel} from './terrain-camera.js';
// Freeze the farm envelope once per incursion. Growing crops do not require
// scanning the plantation again each frame while waiting for an arrival.
export function raidFarmBounds(state){
 const points=[...state.plants.filter(p=>p.alive),...state.structures.filter(s=>s.status==='intact')];
 if(!points.length)return null;
 let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.z);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.z);}
 return [minX-12,minZ-12,maxX+12,maxZ+12];
}
const active=a=>!['gone','retreating'].includes(a.status);
export class RaidCameraDirector {
 constructor(camera,controls,field){this.camera=camera;this.controls=controls;this.field=field;this.raidId=null;this.travel=null;}
 cancel(){this.travel=null;}
 beginManual(){this.cancel();this.manual=true;}
 endManual(){this.manual=false;}
 update(state,seconds){
  const raid=state.raid;
  if(!raid){this.raidId=null;this.travel=null;this.bounds=null;return;}
  if(this.raidId!==raid.id){this.raidId=raid.id;this.travel=null;this.bounds=raidFarmBounds(state);}
  if(this.manual||state.pauses.some(p=>['menu','hidden','context-lost','hiring','runtime-error'].includes(p)))return;
  if(!this.travel&&!raid.cameraFocusedAnimalId){
   const bounds=this.bounds,animal=raid.animals.find(a=>active(a)&&(['walking','attacking'].includes(a.status)||bounds&&a.x>=bounds[0]&&a.z>=bounds[1]&&a.x<=bounds[2]&&a.z<=bounds[3]));
   if(!animal)return;
   raid.cameraFocusedAnimalId=animal.id;
   this.travel={...beginTerrainCameraTravel(this.camera,this.controls,this.field),animalId:animal.id};
  }
  if(!this.travel)return;
  const animal=raid.animals.find(a=>a.id===this.travel.animalId&&active(a));
  if(!animal||stepTerrainCameraTravel(this.camera,this.controls,this.field,this.travel,animal,seconds))this.travel=null;
 }
}
