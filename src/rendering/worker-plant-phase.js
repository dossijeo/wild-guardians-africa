import {PROFILES} from '../simulation/workforce.js';

// The initial task contains two visually distinct phases. Never certify or
// publish Plant across the hand-off to Water, even though its task ID persists.
export function isWorkerPlantPhase(worker,task){
 const profile=PROFILES.find(item=>item.id===worker?.profile);
 return worker?.status==='acting'&&task?.kind==='initial'&&!!profile&&Number.isFinite(worker.actionRemaining)&&worker.actionRemaining>0&&Math.max(0,7.2-worker.actionRemaining*profile.speed)<3.8;
}
export function isWorkerWaterPhase(worker,task){
 if(worker?.status!=='acting')return false;
 if(task?.kind==='water')return true;
 if(!Number.isFinite(worker.actionRemaining)||worker.actionRemaining<=0)return false;
 const profile=PROFILES.find(item=>item.id===worker.profile);
 return task?.kind==='initial'&&!!profile&&Math.max(0,7.2-worker.actionRemaining*profile.speed)>=3.8;
}
