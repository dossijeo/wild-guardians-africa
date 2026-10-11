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
