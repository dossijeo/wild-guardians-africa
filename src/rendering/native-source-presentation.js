// Raycaster uses the live scene. Reuse the same reversible participant to
// query the acquired source, then restore the candidate even if picking fails.
// This synchronous view neither grants a native permission nor invents a clock.
export function attachNativeSourcePresentation(part,isActivated){
 let pickingSource=false;
 part.withSourcePresentation=operation=>{
  if(typeof operation!=='function'||pickingSource||!part.valid())throw Error('Native source presentation unavailable');
  const restoreCandidate=isActivated();pickingSource=true;
  try{if(restoreCandidate)part.rollback();const result=operation();if(result&&typeof result.then==='function')throw Error('Native source presentation must be synchronous');return result;}
  finally{try{if(restoreCandidate&&!isActivated())part.activate();}finally{pickingSource=false;}}
 };
 return part;
}
