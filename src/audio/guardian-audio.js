export const GUARDIAN_SOUND_IDS=Object.freeze(['spirit_appear','spirit_disappear']);

// Actual rendered portrait lifecycle, separate from tutorial/domain events.
// Closing normally preserves the complete approved disappearance tail.
export class GuardianAudio {
  constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.phase='closed';this.ticket=0;this.voice=null;this.seed=false;}
  release(){this.ticket++;if(this.voice)this.stopVoice(this.voice);this.voice=null;}
  cue(id){
    this.release();const ticket=this.ticket,requested=this.clock();
    const isCurrent=()=>ticket===this.ticket&&this.clock()-requested<=.5&&(id==='spirit_disappear'?['outro','closed'].includes(this.phase):['intro','changing','reading','rest'].includes(this.phase));
    let pending;try{pending=this.play(id,{bus:'ui',family:'spirit-presence',emitter:'guardian-avatar',gain:1,isCurrent});}catch{return;}
    Promise.resolve(pending).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}this.voice=source;const ended=source.onended;source.onended=()=>{ended?.();if(this.voice===source)this.voice=null;};}).catch(()=>{});
  }
  observe(phase){
    if(['hidden','disposed'].includes(phase)){this.dispose();return;}
    if(!['closed','intro','changing','reading','rest','farewell','outro'].includes(phase))return;
    const previous=this.phase;this.phase=phase;
    if(this.seed){this.seed=false;return;}
    if(previous===phase)return;
    if(phase==='outro')this.cue('spirit_disappear');
    else if(['closed','farewell','outro'].includes(previous)&&['intro','changing','reading','rest'].includes(phase))this.cue('spirit_appear');
  }
  suspend(){this.release();this.seed=true;}
  dispose(){this.release();this.phase='closed';this.seed=false;}
}
