import {raidFarmBounds} from '../world/farm-envelope.js';
export const RAID_ARRIVAL_SOUND_IDS=Object.freeze(['game_enemy_detected']);
const present=(raid,bounds)=>bounds&&raid?.animals.some(a=>!['gone','retreating'].includes(a.status)&&a.x>=bounds[0]&&a.z>=bounds[1]&&a.x<=bounds[2]&&a.z<=bounds[3]);

// Actual farm entry, distinct from the global spawn alert. Snapshot/paused
// scenes seed silently, and one group-level cue covers simultaneous arrivals.
export class RaidArrivalAudio {
 constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.dispose();}
 release(){this.ticket=(this.ticket??0)+1;if(this.voice)this.stopVoice(this.voice);this.voice=null;}
 update(state){
  if(state.result||state.pauses?.length){this.dispose();return;}
  const raid=state.raid;
  if(!raid){this.dispose();this.stateRef=state;this.elapsed=state.elapsed;return;}
  const replaced=this.stateRef!==state||this.raid!==raid||this.elapsed!==null&&state.elapsed<this.elapsed;
  if(replaced){this.release();this.stateRef=state;this.raid=raid;this.bounds=raidFarmBounds(state);this.notified=!!present(raid,this.bounds);this.elapsed=state.elapsed;return;}
  const progressed=state.elapsed>this.elapsed;this.elapsed=state.elapsed;
  if(this.notified||!progressed||!present(raid,this.bounds))return;
  this.notified=true;this.release();const ticket=this.ticket,requested=this.clock();
  const isCurrent=()=>this.ticket===ticket&&this.stateRef===state&&this.raid===state.raid&&!state.result&&!state.pauses?.length&&present(state.raid,this.bounds)&&this.clock()-requested<=.5;
  let pending;try{pending=this.play('game_enemy_detected',{bus:'ui',family:'raid-arrival',emitter:'ui:raid-arrival',gain:1,isCurrent});}catch{return;}
  Promise.resolve(pending).then(source=>{if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}this.voice=source;const ended=source.onended;source.onended=()=>{ended?.();if(this.voice===source)this.voice=null;};}).catch(()=>{});
 }
 dispose(){this.release();this.stateRef=null;this.raid=null;this.bounds=null;this.elapsed=null;this.notified=false;}
}
