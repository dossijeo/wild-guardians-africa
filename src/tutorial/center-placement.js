// First lesson only; the suggested point never determines placement validity.
export const FIRST_CENTER_RADIUS=32;
export function firstCenterRadius(state){
 const village=state.villages[0],entry=village?.entry??village,site=village?.center;
 // Canyon/river layouts may place their nearest legal plateau beyond 32 m.
 // Cover that neighborhood, without restricting the player to the authored point.
 return Math.max(FIRST_CENTER_RADIUS,entry&&site?Math.hypot(site.x-entry.x,site.z-entry.z)+8:0);
}
export function firstCenterWithinVillage(state,point){
 if(state.day!==1||state.tutorial?.basicSkipped||state.tutorial?.step!=='center'||state.structures.some(s=>s.kind==='center'&&s.status!=='ruined'))return true;
 const village=state.villages[0],entry=village?.entry??village;
 return !!entry&&Math.hypot(point.x-entry.x,point.z-entry.z)<=firstCenterRadius(state);
}
