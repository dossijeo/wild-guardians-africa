// Read-only inputs for dueCinematicAct. Missing progress is interpreted exactly
// as initializeCinematicProgress interprets saves predating cinematics, but
// this projection never mutates the authoritative state.
export function projectConfirmedCinematic(state){
 if(!state||!Number.isSafeInteger(state.completedNights??0)||(state.completedNights??0)<0||state.cinematicSeenAct!=null&&(!Number.isSafeInteger(state.cinematicSeenAct)||state.cinematicSeenAct<0||state.cinematicSeenAct>10)||state.pauses!==undefined&&!Array.isArray(state.pauses))throw TypeError('Invalid cinematic state');
 const completedNights=state.completedNights??0;
 return {version:1,completedNights,cinematicSeenAct:state.cinematicSeenAct??Math.min(10,Math.floor(completedNights/10)),result:state.result??null,postgame:!!state.postgame,pauses:state.pauses?.includes('hiring')?['hiring']:[]};
}

export function validateConfirmedCinematicProjection(view){
 if(!view||typeof view!=='object'||Array.isArray(view)||Object.keys(view).sort().join(',')!=='cinematicSeenAct,completedNights,pauses,postgame,result,version'||view.version!==1||!Number.isSafeInteger(view.completedNights)||view.completedNights<0||!Number.isSafeInteger(view.cinematicSeenAct)||view.cinematicSeenAct<0||view.cinematicSeenAct>10||typeof view.postgame!=='boolean'||!Array.isArray(view.pauses)||view.pauses.length>1||view.pauses.some(value=>value!=='hiring')||view.result!==null&&typeof view.result!=='string')throw TypeError('Invalid cinematic projection');
 return view;
}
