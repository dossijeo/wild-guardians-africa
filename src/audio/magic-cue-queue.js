export const liveCropCue=(event,state)=>event.type!=='SpellActivated'||!['growth','multiply'].includes(event.kind)||!event.targetId||!state||!!state.plants?.some(p=>p.id===event.targetId&&p.alive);
// No wall-clock timers: pause/resume and slow frames follow simulation time.
export class MagicCueQueue {
 constructor(){this.pending=new Map();this.state=null;this.elapsed=null;}
 defer(event,state){
  const at=event.presentation?.cueAt;
  if(!state||!Number.isFinite(at)||(!state.pauses?.length&&at<=state.elapsed))return false;
  if(this.pending.size>=32)this.pending.delete(this.pending.keys().next().value);
  this.pending.set(event.id,{event,state,at});return true;
 }
 take(state){
  if(this.state!==state||state?.result||this.elapsed!==null&&state?.elapsed<this.elapsed)this.pending.clear();
  this.state=state;this.elapsed=state?.elapsed??null;
  if(!state||state.pauses?.length)return [];
  const ready=[];
  for(const [id,cue] of this.pending){
   if(!liveCropCue(cue.event,state)||cue.state!==state||state.elapsed-cue.at>.5||(cue.event.type==='GuardianMagicHit'&&!state.raid?.animals.some(a=>a.id===cue.event.targetId&&a.status!=='gone'))){this.pending.delete(id);continue;}
   if(state.elapsed>=cue.at){ready.push(cue.event);this.pending.delete(id);}
  }
  return ready.sort((a,b)=>a.presentation.cueAt-b.presentation.cueAt);
 }
 clear(){this.pending.clear();this.state=null;this.elapsed=null;}
}
