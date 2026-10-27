// QA source transform only. No instrumentation in production bundles.
export function instrumentMainFrame(source) {
 const replace=(anchor,replacement)=>{if(source.split(anchor).length!==2)throw Error('Main attribution anchor changed: '+anchor);source=source.replace(anchor,replacement);};
 replace('function frame(now) {',`function frame(now) {
  const qaFrameStart=performance.now();let qaPhaseStart=qaFrameStart;
  const qaMark=label=>{const end=performance.now();globalThis.qaMainPhase?.({timestamp:now,label,ms:end-qaPhaseStart,at:end,lateness:qaFrameStart-now});qaPhaseStart=end;};`);
 for(const [anchor,label] of [
  ['microevents?.beforeSimulation();','before-simulation'],
  ['Game.advanceReal(state,dt,nav,{nightFastForward:!microevents?.holdsNightSpeed});','simulation'],
  ['juice?.process(state);','effects'],
  ['else world.render(dt);','render'],
  ['audio.updateMovement(state,{listener:world.controls.target,surfaceAt:world.movementSurfaceAt});','audio'],
  ['juice?.update(state);','interface']
 ])replace(anchor,anchor+`qaMark('${label}');`);
 replace('if(globalFrameSchedulerEnabled())globalFrameScheduler.endFrame();',`qaMark('tail');globalThis.qaMainFrame?.({timestamp:now,ms:performance.now()-qaFrameStart,lateness:qaFrameStart-now});
  if(globalFrameSchedulerEnabled())globalFrameScheduler.endFrame();`);
 return source;
}
