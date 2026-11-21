// QA observation at authoritative simulation tick boundaries. Samples describe
// the past; they are neither interpolation instructions nor a physics horizon.
export function captureHyenaTickSamples(game){
 const initial=(game.raid?.animals??[]).filter(actor=>actor.species==='hyena'),entries=initial.map(actor=>({actor,actorId:actor.id,samples:[]}));let complete=true,finished=false;
 function sample(){
  if(finished)throw Error('Hyena tick capture finished');const current=(game.raid?.animals??[]).filter(actor=>actor.species==='hyena');if(current.length!==initial.length||current.some((actor,i)=>actor!==initial[i]))complete=false;
  for(const entry of entries){const actor=entry.actor,phase=actor.motionPhase??null,fall=actor.fallRemaining??null,sample={at:game.elapsed,status:actor.status,motionPhase:phase,hasPath:!!actor.path?.length,recovery:!!actor.recovery,fallRemaining:fall,magicImpact:!!actor.magicImpact};if(!Number.isFinite(sample.at)||typeof sample.status!=='string'||phase!==null&&!Number.isFinite(phase)||fall!==null&&!Number.isFinite(fall)||entry.samples.length&&sample.at<=entry.samples.at(-1).at){complete=false;continue;}entry.samples.push(sample);}
 }
 function invalidate(){complete=false;}
 sample();return {sample,invalidate,finish(){if(finished)throw Error('Hyena tick capture finished');finished=true;const current=(game.raid?.animals??[]).filter(actor=>actor.species==='hyena');if(current.length!==initial.length||current.some((actor,i)=>actor!==initial[i]))complete=false;for(const entry of entries){if(entry.actor.id!==entry.actorId)complete=false;const last=entry.samples.at(-1),actor=entry.actor;if(!last||last.at!==game.elapsed||last.status!==actor.status||last.motionPhase!==(actor.motionPhase??null)||last.hasPath!==!!actor.path?.length||last.recovery!==!!actor.recovery||last.fallRemaining!==(actor.fallRemaining??null)||last.magicImpact!==!!actor.magicImpact)complete=false;}return {complete,actors:entries.map(({actorId,samples})=>({actorId,samples}))};}};
}
