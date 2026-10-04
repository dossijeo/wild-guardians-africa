import {BALANCE} from '../simulation/balance.js';
import {spellUnlocked} from '../simulation/rules.js';
export const UNLOCK_SOUND_IDS=Object.freeze(['ui_unlock']);
const unlocked=state=>new Set(BALANCE.spells.filter(spell=>spellUnlocked(state,spell.id)).map(spell=>spell.id));

// Permanent calendar milestones are observed even across a dropped frame.
// Snapshot loads seed silently; hiring/menu pauses defer a new live milestone.
export class UnlockAudio {
  constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.stateRef=null;this.known=new Set();this.pending=new Set();this.ticket=0;this.voice=null;this.elapsed=null;this.day=null;this.paused=false;}
  release(){this.ticket++;if(this.voice)this.stopVoice(this.voice);this.voice=null;}
  update(state){
    const current=unlocked(state);
    if(this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed||this.day!==null&&state.day<this.day){this.dispose();this.stateRef=state;this.known=current;}
    else {for(const id of current)if(!this.known.has(id))this.pending.add(id);this.known=current;}
    this.elapsed=state.elapsed;this.day=state.day;
    if(state.result){this.release();this.pending.clear();return;}
    if(state.pauses.length){if(!this.paused)this.release();this.paused=true;return;}this.paused=false;
    if(!this.pending.size)return;
    const ids=[...this.pending];this.pending.clear();this.release();const ticket=this.ticket,requested=this.clock();
    const isCurrent=()=>ticket===this.ticket&&this.stateRef===state&&!state.result&&!state.pauses.length&&this.clock()-requested<=.5&&ids.every(id=>spellUnlocked(state,id));
    let request;try{request=this.play('ui_unlock',{bus:'ui',family:'ui_unlock',emitter:'ui:unlock',gain:1,isCurrent});}catch{return;}
    Promise.resolve(request).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}this.voice=source;const ended=source.onended;source.onended=()=>{ended?.();if(this.voice===source)this.voice=null;};}).catch(()=>{});
  }
  dispose(){this.release();this.stateRef=null;this.known.clear();this.pending.clear();this.elapsed=null;this.day=null;this.paused=false;}
}
