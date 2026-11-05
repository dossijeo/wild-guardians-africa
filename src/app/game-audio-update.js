// Audio consumes confirmed state and events on the main thread. It does not
// own simulation or visual objects and is shared by both presentation paths.
export function updateGameAudio({audio,state,world,nav,emptyEvents}){
 const listener=world.controls.target,direct=!!(world.workerRuntime?.confirmedEventDelivery&&world.confirmedEventsSeeded);
 audio.process(direct?emptyEvents:state.events,{state,listener});
 if(world.workerRuntime?.confirmedEventDelivery)world.confirmedEventsSeeded=true;
 audio.updateMusic(state);audio.updateUnlocks(state);
 const field=nav?.field,waterAt=typeof field?.waterInfo==='function'?(x,z)=>({...field.waterInfo(x,z),active:!!(field.wetland||field.riverActive)}):undefined;
 audio.updateAmbient(state,{listener,waterRevision:nav?.version??0,waterAt});
 audio.updateFarmActors(state,{listener});audio.updateAnimals(state,{listener});audio.updateMovement(state,{listener,surfaceAt:world.movementSurfaceAt});
}
