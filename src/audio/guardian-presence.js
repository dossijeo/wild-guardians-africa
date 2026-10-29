// One world Guardian has one presence voice. Its arrival and dissolution replace
// each other, leaving the second per-emitter slot for the spell release.
const presences=new WeakMap();
export const playGuardianPresence=(audio,id,options)=>playGuardianWorldCue(audio,id,options);
export async function playGuardianWorldCue(audio,id,options={}){
 if(!['spirit_appear','spirit_disappear','spirit_power_activate'].includes(id))throw Error('Invalid Guardian presence cue');
 let slots=presences.get(audio);if(!slots){slots=new Map();presences.set(audio,slots);}
 const key=id==='spirit_power_activate'?'launch':'presence',previous=slots.get(key);
 if(previous?.voice)audio.stopVoice(previous.voice);
 const ticket={voice:null};slots.set(key,ticket);
 const current=()=>slots.get(key)===ticket&&(!options.isCurrent||options.isCurrent());
 const source=await audio.sound(id,{...options,bus:'world',family:key==='presence'?'guardian-presence':'guardian-launch',emitter:'guardian-world',isCurrent:current});
 if(!source)return null;
 if(!current()){audio.stopVoice(source);return null;}
 ticket.voice=source;
 const ended=source.onended;source.onended=()=>{ended?.();if(ticket.voice===source)ticket.voice=null;};
 return source;
}
// Capture the owning simulation as well as the audio clock: a decoded cue must
// not arrive after a result, state replacement or presentation-clock reset.
export function playGuardianScenePresence(audio,owner,id,point,isOwnerCurrent){
 const state=owner.state,elapsed=state?.elapsed,requested=audio.context?.currentTime??0;
 return playGuardianPresence(audio,id,{
  gain:.45/(1+(Math.hypot(point.x-owner.controls.target.x,point.z-owner.controls.target.z)/24)**2),
  isCurrent:()=>!owner.disposed&&isOwnerCurrent()&&owner.state===state&&!state?.result&&!state?.pauses?.length&&state?.elapsed>=elapsed&&(audio.context?.currentTime??0)-requested<.4
 });
}
