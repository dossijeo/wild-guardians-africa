export const ANIMAL_SOUND_ROUTES=Object.freeze(Object.fromEntries(['lion','hyena','buffalo','rhino','warthog'].map(species=>[species,Object.freeze({neutral:species+'_neutral',aggressive:species+'_aggressive',attack:species+(['lion','hyena'].includes(species)?'_attack':'_charge'),retreat:species+'_retreat'})])));
export const ANIMAL_SOUND_IDS=Object.freeze(Object.values(ANIMAL_SOUND_ROUTES).flatMap(routes=>Object.values(routes)));
export const ANIMAL_NEUTRAL_INTERVAL=12;
const phase=actor=>actor.status==='attacking'?'attack':actor.status==='retreating'?'retreat':['entering','walking'].includes(actor.status)?'approach':null;

// Observe native action facts. Audio never selects a target, rolls gameplay RNG,
// consumes a hit, or replays action history from a restored snapshot.
export class AnimalAudio {
  constructor(play,stopVoice,clock,setGain=()=>{}){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.setGain=setGain;this.entries=new Map();this.stateRef=null;this.elapsed=null;}
  release(entry){entry.ticket++;if(entry.voice)this.stopVoice(entry.voice);entry.voice=null;}
  cue(kind,actor,entry,state,listener){
    this.release(entry);const id=ANIMAL_SOUND_ROUTES[actor.species]?.[kind];if(!id)return;
    const ticket=entry.ticket,requested=this.clock(),currentPhase=phase(actor),attackId=actor.attackId;
    const isCurrent=()=>this.entries.get(actor.id)===entry&&entry.ticket===ticket&&this.stateRef===state&&!state.result&&!state.pauses?.length&&state.raid?.animals.includes(actor)&&phase(actor)===currentPhase&&(kind!=='attack'||actor.attackId===attackId)&&this.clock()-requested<=.25;
    entry.baseGain=kind==='neutral'?.25:.5;entry.lastGain=null;
    const distance=listener?Math.hypot(actor.x-listener.x,actor.z-listener.z):0;
    entry.nextNeutral=state.elapsed+ANIMAL_NEUTRAL_INTERVAL;let pending;
    try{pending=this.play(id,{bus:'world',family:'animal-'+kind,emitter:actor.id,gain:(kind==='neutral'?.25:.5)/(1+(distance/24)**2),isCurrent});}catch{return;}
    Promise.resolve(pending).then(source=>{
      if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}entry.voice=source;const ended=source.onended;source.onended=()=>{ended?.();if(entry.voice===source)entry.voice=null;};
    }).catch(()=>{});
  }
  update(state,{listener}={}){
    if(this.stateRef&&this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
    if(state.pauses?.length||state.result){this.dispose();return;}
    const dt=this.elapsed===null?0:state.elapsed-this.elapsed,continuous=dt>0&&dt<=.25,seen=new Set();this.stateRef=state;
    for(const actor of state.raid?.animals??[]){
      if(!ANIMAL_SOUND_ROUTES[actor.species]||!phase(actor))continue;seen.add(actor.id);
      const currentPhase=phase(actor),previous=this.entries.get(actor.id),entry=previous??{ticket:0,voice:null,nextNeutral:state.elapsed+ANIMAL_NEUTRAL_INTERVAL};this.entries.set(actor.id,entry);
      if(!continuous){if(dt!==0||!previous)this.release(entry);if(dt!==0)entry.nextNeutral=state.elapsed+ANIMAL_NEUTRAL_INTERVAL;}
      else if(currentPhase==='attack'&&(previous?.phase!=='attack'||entry.attackId!==actor.attackId))this.cue('attack',actor,entry,state,listener);
      else if(currentPhase==='retreat'&&previous?.phase!=='retreat')this.cue('retreat',actor,entry,state,listener);
      else if(!previous&&currentPhase==='approach')this.cue('aggressive',actor,entry,state,listener);
      else if(previous?.phase!==currentPhase)this.release(entry);
      else if(currentPhase==='approach'&&state.elapsed>=entry.nextNeutral)this.cue('neutral',actor,entry,state,listener);
      Object.assign(entry,{phase:currentPhase,attackId:actor.attackId});
      // A cue started while the camera was far away must become audible when
      // the player returns, without restarting the original attack sound.
      if(entry.voice){const distance=listener?Math.hypot(actor.x-listener.x,actor.z-listener.z):0,gain=entry.baseGain/(1+(distance/24)**2);if(entry.lastGain===null||Math.abs(gain-entry.lastGain)>.0001){this.setGain(entry.voice,gain);entry.lastGain=gain;}}
    }
    for(const [id,entry] of this.entries)if(!seen.has(id)){this.release(entry);this.entries.delete(id);}
    this.elapsed=state.elapsed;
  }
  dispose(){for(const entry of this.entries.values())this.release(entry);this.entries.clear();this.stateRef=null;this.elapsed=null;}
}
