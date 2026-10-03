import {notice} from '../simulation/game.js';

export function saveGame(state,repository,{confirm=false,onError=()=>{}}={}){
 if(!state)return false;
 state.savedAt=Date.now();
 try {repository.save(state);}
 catch(error){onError('No se pudo guardar la partida: '+error.message);return false;}
 if(confirm)notice(state,'Partida guardada.');
 return true;
}
