// Exercises the real owners' shutdown, retaining references only for assertions.
export function installDisposalReview({panel,world,audio,dispose,status,errors}){
 const button=document.createElement('button');button.id='disposeSceneReview';button.textContent='Cerrar escena activa (QA)';panel.append(button);
 button.onclick=async()=>{
  const summons=world.guardianSummons,physics=world.beastPhysics;
  const objects=summons.slots.flatMap(s=>[s.group,s.aura,s.beam,s.impact,s.core,s.vortex]);
  const snapshot=()=>({disposed:!!world.disposed,slots:summons.slots.length,pending:summons.pending.length,visible:objects.filter(o=>o.visible).length,attached:objects.filter(o=>o.parent).length,physicalActors:physics.entries.size,bakedActors:physics.baked?.entries.size??0,solverPresent:!!physics.solver,mixers:world.mixers.size,audioVoices:audio.voices.size});
  const report={scope:'Actual WorldScene, spatial session and audio disposal. QA queued casts bypass cooldown. No replacement scene or heap-leak claim.',before:snapshot()};
  for(const control of panel.querySelectorAll('button,select,input'))control.disabled=true;
  try{dispose();report.immediate=snapshot();await new Promise(resolve=>setTimeout(resolve,1200));report.after=snapshot();report.errors=[...errors];
   const a=report.after;report.pass=report.before.slots===1&&report.before.pending>0&&a.disposed&&!a.slots&&!a.pending&&!a.visible&&!a.attached&&!a.physicalActors&&!a.bakedActors&&!a.solverPresent&&!a.mixers&&!a.audioVoices&&!errors.length;
  }catch(error){report.error=String(error?.stack??error);report.pass=false;}
  status.textContent=JSON.stringify(report,null,2);
 };
}
