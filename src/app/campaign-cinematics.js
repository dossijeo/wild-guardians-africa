// A missing marker identifies a save made before campaign cinematics shipped.
// Such saves start from their current chapter instead of replaying old nights.
export function initializeCinematicProgress(state){
  state.cinematicSeenAct??=Math.min(10,Math.floor((state.completedNights??0)/10));
  return state.cinematicSeenAct;
}

export function dueCinematicAct(state){
  if(!state||state.result==='defeat'||state.postgame)return 0;
  const completed=Math.min(10,Math.floor((state.completedNights??0)/10));
  const seen=initializeCinematicProgress(state);
  if(completed<=seen)return 0;
  if(completed===10)return state.result==='victory'?10:0;
  return state.pauses?.includes('hiring')?seen+1:0;
}

export function finishCinematicAct(state,act){
  if(!Number.isSafeInteger(act)||act<1||act>10)throw new Error('Invalid cinematic act');
  state.cinematicSeenAct=Math.max(initializeCinematicProgress(state),act);
}
