import {initializeCinematicProgress} from '../app/campaign-cinematics.js';
import {resumeLoadedWorld} from '../app/resume-loaded-world.js';

// Visibility can still change while the Worker starts. Use a visible baseline
// and let the existing ordered startup command reconcile the latest value.
export function normalizeWorkerStartupState(state){
 initializeCinematicProgress(state);
 resumeLoadedWorld(state,{hidden:false});
 return state;
}
