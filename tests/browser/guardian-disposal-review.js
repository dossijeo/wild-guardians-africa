import {playGuardianWorldCue} from '../../src/audio/guardian-presence.js';
// Exercises the real owners' shutdown, retaining references only for assertions.
export function installDisposalReview({panel,world,audio,dispose,status,errors}){
 const label=document.createElement('label'),withVoice=document.createElement('input');withVoice.type='checkbox';withVoice.id='disposeWithVoice';label.append(withVoice,' Cerrar con voz del Guardian activa');panel.append(label);
 const button=document.createElement('button');button.id='disposeSceneReview';button.textContent='Cerrar escena activa (QA)';panel.append(button);
 button.onclick=async()=>{
  if(withVoice.checked){try{await audio.unlock();const voice=await playGuardianWorldCue(audio,'spirit_appear',{gain:.2});if(!voice||!audio.voices.has(voice))throw Error('No active Guardian voice; disposal test not executed');}catch(error){status.textContent=JSON.stringify({pass:false,error:String(error)},null,2);return;}}
  const summons=world.guardianSummons,physics=world.beastPhysics;
  const objects=summons.slots.flatMap(s=>[s.group,s.aura,s.beam,s.impact,s.core,s.vortex]);
  const snapshot=()=>({disposed:!!world.disposed,slots:summons.slots.length,pending:summons.pending.length,visible:objects.filter(o=>o.visible).length,attached:objects.filter(o=>o.parent).length,physicalActors:physics.entries.size,bakedActors:physics.baked?.entries.size??0,solverPresent:!!physics.solver,mixers:world.mixers.size,audioVoices:audio.voices.size,audioContextState:audio.context?.state??null});
  const report={scope:'Actual WorldScene, spatial session and audio disposal. QA queued casts bypass cooldown. No replacement scene or heap-leak claim.',requiresActiveVoice:withVoice.checked,before:snapshot()};
  for(const control of panel.querySelectorAll('button,select,input'))control.disabled=true;
  try{dispose();report.immediate=snapshot();await new Promise(resolve=>setTimeout(resolve,1200));report.after=snapshot();report.errors=[...errors];
   const a=report.after;report.pass=(!report.requiresActiveVoice||(report.before.audioVoices>0&&a.audioContextState==='closed'))&&report.before.slots===1&&report.before.pending>0&&a.disposed&&!a.slots&&!a.pending&&!a.visible&&!a.attached&&!a.physicalActors&&!a.bakedActors&&!a.solverPresent&&!a.mixers&&!a.audioVoices&&!errors.length;
  }catch(error){report.error=String(error?.stack??error);report.pass=false;}
  status.textContent=JSON.stringify(report,null,2);
 };
}
