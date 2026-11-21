import {RaidCameraDirector} from '../rendering/raid-camera.js';

// The director operates on a private raid view. Only the authority persists
// its focus, so replacing the confirmed presentation snapshot cannot lose it.
export function createWorkerRaidCamera({camera,controls,field,guard,runtime,onError=()=>{},isCurrent=()=>true}={}){
 if(typeof field!=='function'||typeof runtime!=='function'||typeof onError!=='function'||typeof isCurrent!=='function'||!guard?.run)throw TypeError('Invalid worker raid camera');
 const director=new RaidCameraDirector(camera,controls,null);let pending=null,closed=false,failedFocus=null;
 const candidates=raid=>JSON.stringify(raid.animals.map(animal=>[animal.id,animal.status]));
 return {
  cancel:()=>director.cancel(),beginManual:()=>director.beginManual(),endManual:()=>director.endManual(),
  update(state,dt){
   if(closed||!state)return;
   const surface=field(),authority=runtime();if(!surface||!authority)return;
   if(!state.raid){failedFocus=null;director.update(state,dt);return;}
   if(pending&&pending.raidId!==state.raid.id)pending=null;
   if(failedFocus){if(failedFocus.raidId===state.raid.id&&failedFocus.candidates===candidates(state.raid))return;failedFocus=null;}
   const prior={raidId:director.raidId,bounds:director.bounds,travel:director.travel?structuredClone(director.travel):null};
   const raid={...state.raid,...(pending?.raidId===state.raid.id?{cameraFocusedAnimalId:pending.animalId}:{})};director.field=surface;let completed=false;
   guard.run(()=>{director.update({...state,raid},dt);completed=true;});
   if(!completed){Object.assign(director,prior);return;}
   if(!state.raid.cameraFocusedAnimalId&&raid.cameraFocusedAnimalId&&!pending){
    const raidId=raid.id,animalId=raid.cameraFocusedAnimalId;
    const request=pending={raidId,animalId,candidates:candidates(state.raid)};
    Promise.resolve().then(()=>authority.submit({kind:'raidCameraFocus',raidId,animalId})).then(result=>{
     if(closed||!isCurrent()||pending!==request)return;
     pending=null;if(!result?.value){director.cancel();failedFocus={raidId,candidates:request.candidates};}
    },error=>{if(closed||!isCurrent()||pending!==request)return;pending=null;director.cancel();failedFocus={raidId,candidates:request.candidates};onError(error);});
   }
  },
  dispose(){closed=true;pending=null;director.cancel();},
 };
}
