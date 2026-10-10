import {spellUnlocked} from '../simulation/rules.js';
export const POWER_READY_SOUND_IDS=Object.freeze(['spirit_power_charge']);
// Agricultural powers have no cooldown, including when loading legacy fields.
const kinds=['shield'];
// Observe a real simulated cooldown edge, never initial availability/history.
export class PowerReadyAudio {
 constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.ticket=0;this.dispose();}
 release(){this.ticket++;if(this.voice)this.stopVoice(this.voice);this.voice=null;}
 update(state){
  const replaced=this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed||this.day!==null&&state.day<this.day;
  const progressed=!replaced&&state.elapsed>this.elapsed;
  const ready=progressed?kinds.filter(id=>this.previous[id]>0&&state.cooldowns?.[id]===0&&spellUnlocked(state,id)):[];
  if(replaced)this.release();
  this.stateRef=state;this.elapsed=state.elapsed;this.day=state.day;this.previous={...state.cooldowns};
  if(state.result||state.pauses?.length){this.release();return;}
  if(!ready.length)return;
  this.release();const ticket=this.ticket,requested=this.clock();
  const isCurrent=()=>ticket===this.ticket&&this.stateRef===state&&!state.result&&!state.pauses?.length&&this.clock()-requested<=.5&&ready.some(id=>state.cooldowns?.[id]===0&&spellUnlocked(state,id));
  let pending;try{pending=this.play('spirit_power_charge',{bus:'ui',family:'magic-ready',emitter:'ui:magic-ready',gain:.6,isCurrent});}catch{return;}
  Promise.resolve(pending).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}this.voice=source;const ended=source.onended;source.onended=()=>{ended?.();if(this.voice===source)this.voice=null;};}).catch(()=>{});
 }
 dispose(){this.release();this.stateRef=null;this.elapsed=null;this.day=null;this.previous={};}
}
