// Bootstrap may use the loaded save until the first validated Worker view.
// Afterwards losing that view is a presentation failure, never permission to
// silently resume from the old save.
export function confirmedUiState(world,state){
 if(!world?.workerGpuOnly)return state;
 if(world.hudOnlyConfirmed&&(!world.confirmedHud||!world.actorAudio))throw Error('Confirmed Worker UI view unavailable');
 return world.actorAudio??state;
}
