import {notice} from '../simulation/game.js';

export function saveGame(state,repository,{confirm=false,onError=()=>{}}={}){
 if(!state)return false;
 state.savedAt=Date.now();
 const done=()=>{if(confirm)notice(state,'Partida guardada.');return true;};
 const failed=error=>{onError('No se pudo guardar la partida: '+error.message);return false;};
 try {const result=repository.save(state);if(result?.then)return result.then(done,failed);}
 catch(error){onError('No se pudo guardar la partida: '+error.message);return false;}
 return done();
}
