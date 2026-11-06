// Audio consumes confirmed state and events on the main thread. It does not
// own simulation or visual objects and is shared by both presentation paths.
export function updateGameAudio({audio,state,world,nav,emptyEvents,actorState=state}){
 const listener=world.controls.target,direct=!!(world.workerRuntime?.confirmedEventDelivery&&world.confirmedEventsSeeded);
 audio.process(direct?emptyEvents:actorState.events,{state:actorState,listener});
 if(world.workerRuntime?.confirmedEventDelivery)world.confirmedEventsSeeded=true;
 audio.updateMusic(actorState);audio.updateUnlocks(actorState);
 const field=nav?.field,waterAt=typeof field?.waterInfo==='function'?(x,z)=>({...field.waterInfo(x,z),active:!!(field.wetland||field.riverActive)}):undefined;
 audio.updateAmbient(actorState,{listener,waterRevision:nav?.version??0,waterAt});
 audio.updateFarmActors(actorState,{listener});audio.updateAnimals(actorState,{listener});audio.updateMovement(actorState,{listener,surfaceAt:world.movementSurfaceAt});
}
