import {beginTerrainCameraTravel,stepTerrainCameraTravel} from './terrain-camera.js';
import {raidFarmBounds} from '../world/farm-envelope.js';
import {raidGroupFrame} from './raid-group-framing.js';
export {raidFarmBounds} from '../world/farm-envelope.js';
const active=a=>!['gone','retreating'].includes(a.status);
const inside=(animal,bounds)=>!!bounds&&animal.x>=bounds[0]&&animal.z>=bounds[1]&&animal.x<=bounds[2]&&animal.z<=bounds[3];
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
   const bounds=this.bounds,animal=raid.animals.find(a=>active(a)&&(['entering','walking','attacking'].includes(a.status)||inside(a,bounds)));
   if(!animal)return;
   raid.cameraFocusedAnimalId=animal.id;
   this.travel={...beginTerrainCameraTravel(this.camera,this.controls,this.field),animalId:animal.id};
   this.travel.endDistance=Math.min(this.travel.distance,18);
  }
  if(!this.travel)return;
  const animal=raid.animals.find(a=>a.id===this.travel.animalId&&active(a));
  if(!animal){this.travel=null;return;}
  let destination=animal;
  if(!this.travel.arrival){
   const group=raidGroupFrame(raid.animals,this.field,this.camera,this.travel);
   if(group){destination=group;this.travel.groupDistance=group.distance;this.travel.endDistance=group.distance;}
  }
  // Keep the initial smooth trip, then track the same approaching animal.
  // Freeze the destination on first entry: never chase it around the crops.
  if(!this.travel.arrival&&(!this.bounds||inside(animal,this.bounds)))this.travel.arrival={x:destination.x,z:destination.z};
  const complete=stepTerrainCameraTravel(this.camera,this.controls,this.field,this.travel,this.travel.arrival??destination,seconds);
  if(complete&&this.travel.arrival)this.travel=null;
 }
}
