// Presentation clock only; never touches simulation/RNG or saved state.
export const OVERLAY_EFFECTS={raid:{duration:.6,priority:4},dawn:{duration:1,priority:3},critical:{duration:.25,priority:5},growth:{duration:.3,priority:2},multiply:{duration:.3,priority:2},shield:{duration:.3,priority:2},nightfall:{duration:.8,priority:1},victory:{duration:1.5,priority:6},defeat:{duration:1.1,priority:6}};
export class OverlayPolicy{
 constructor(){this.active=null;this.pending=null;this.lastCritical=-Infinity;}
 request(id,now){const spec=OVERLAY_EFFECTS[id];if(!spec)return false;if(id==='critical'){if(now-this.lastCritical<1000)return false;this.lastCritical=now;}if(this.active&&(this.active.id===id||OVERLAY_EFFECTS[this.active.id].priority>=spec.priority))return false;if(this.pending&&OVERLAY_EFFECTS[this.pending.id].priority>spec.priority)return false;this.pending={id,deadline:now+5000};return true;}
 update(now,{blocked=false,reduced=false}={}){
  if(this.active&&now>=this.active.end)this.active=null;
  if(this.pending&&now>this.pending.deadline)this.pending=null;
  if(blocked){this.active=null;return null;}
  if(this.pending){const {id}=this.pending;this.active={id,start:now,end:now+Math.max(reduced?1100:0,OVERLAY_EFFECTS[id].duration*1000)};this.pending=null;}
  return this.active;
 }
 dispose(){this.active=null;this.pending=null;}
}
