// Explicit QA operation only. A checkpoint behind either confirmed consumer is
// rejected: there is no delta replay or arbitrary Worker-failure recovery yet.
export async function recoverWorkVfxForQa({client,runtime,manager,state,isCurrent=()=>true}){
 if(!client||typeof client.captureWorkCheckpointForQa!=='function'||!runtime||typeof runtime.status!=='function'||!manager||typeof manager.importWorkCheckpoint!=='function'||!state)throw TypeError('Invalid work VFX recovery');
 const before=runtime.status();if(!before.running)throw Error('Simulation Worker unavailable');const checkpoint=await client.captureWorkCheckpointForQa(),after=runtime.status();
 if(!after.running||!isCurrent()||!Number.isSafeInteger(checkpoint?.sequence)||checkpoint.sequence!==before.confirmedSequence||checkpoint.sequence!==after.confirmedSequence||checkpoint.elapsed!==state.elapsed)throw Error('Stale work VFX checkpoint');manager.importWorkCheckpoint(checkpoint,state);return {sequence:checkpoint.sequence,effects:checkpoint.effects.length};
}
