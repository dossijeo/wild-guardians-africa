import {notice} from '../simulation/game.js';

export function saveGame(state,repository,{confirm=false,onError=()=>{},onConfirm}={}){
 if(!state)return false;
 state.savedAt=Date.now();
 const done=()=>{if(confirm){if(onConfirm)onConfirm();else notice(state,'Partida guardada.');}return true;};
 const failed=error=>{onError('No se pudo guardar la partida: '+error.message);return false;};
 try {const result=repository.save(state);if(result?.then)return result.then(done,failed);}
 catch(error){onError('No se pudo guardar la partida: '+error.message);return false;}
 return done();
}

// Unlike local saves, a Worker checkpoint may be temporarily unavailable while
// an active physics state cannot yet be restored. Never report it as saved.
export async function saveWorkerGame(coordinator,{confirm=false,onError=()=>{},onConfirm=()=>{}}={}){
 try{
  const result=await coordinator.request();
  if(!result?.saved){onError('No se pudo guardar la partida: espera a que termine la caída física.');return false;}
  if(confirm)onConfirm();return true;
 }catch(error){onError('No se pudo guardar la partida: '+error.message);return false;}
}
