import {pause,resume} from '../simulation/game.js';

// Worker commands are queued even if the latest publication has not yet
// reflected an earlier pause; skipping them from a stale view loses ordering.
export function dispatchSimulationPause(state,runtime,paused,reason,{tutorial=null}={}){
 if(typeof paused!=='boolean'||typeof reason!=='string'||!reason)throw TypeError('Invalid simulation pause');
 if(!runtime)return (paused?pause:resume)(state,reason);
 if(!paused&&reason==='menu'&&tutorial?.worker===true&&tutorial.started===true&&typeof tutorial.resumeMenu==='function')return tutorial.resumeMenu();
 return runtime.submit({kind:paused?'pause':'resume',reason}).then(result=>{if(result.rejection)throw Error(result.rejection);return result;});
}
