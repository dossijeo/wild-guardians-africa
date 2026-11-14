// Retain the short-lived facts used by hit and repair VFX while their simulation-time
// effects can still be visible. The game owns the events; this is a separate
// presentation window and never writes to the authoritative state.
export function createConfirmedVfxEventWindow({lifetime}){
 if(!Number.isFinite(lifetime)||lifetime<=0)throw TypeError('Invalid VFX event lifetime');
 const retained=new Map();
 const supported=event=>event?.type==='AnimalLogicalHit'||event?.type==='RepairApplied';
 function sync(elapsed,events=[],legacy=[]){
  if(!Number.isFinite(elapsed)||!Array.isArray(events)||!Array.isArray(legacy))throw TypeError('Invalid confirmed VFX events');
  for(const [id,event] of retained)if(elapsed-event.presentation.elapsed>=lifetime)retained.delete(id);
  for(const event of [...legacy,...events]){
   if(!supported(event)||typeof event.id!=='string'||!event.id||!Number.isFinite(event.presentation?.elapsed))continue;
   const age=elapsed-event.presentation.elapsed;
   if(age<0||age>=lifetime||retained.has(event.id))continue;
   retained.set(event.id,structuredClone(event));
  }
  const values=[...retained.values()],number=event=>{const match=/^event-(0|[1-9]\d*)$/.exec(event.id),value=match?Number(match[1]):NaN;return Number.isSafeInteger(value)?value:null;};
  // Authority IDs carry their global order, including when an already-trimmed
  // ring was seen before the complete publication over the independent port.
  if(values.every(event=>number(event)!==null))values.sort((a,b)=>number(a)-number(b));
  // Old fixtures/saves can contain unnumbered events; preserve the existing
  // ring fallback for those rather than inventing identities for them.
  return [...values,...legacy.filter(event=>supported(event)&&(typeof event.id!=='string'||!event.id))];
 }
 function exportCheckpoint(elapsed){sync(elapsed);return {version:1,elapsed,events:structuredClone([...retained.values()])};}
 function restoreCheckpoint(checkpoint,elapsed){if(!checkpoint||checkpoint.version!==1||checkpoint.elapsed!==elapsed||!Number.isFinite(elapsed)||!Array.isArray(checkpoint.events))throw TypeError('Invalid VFX event checkpoint');const next=new Map();for(const event of checkpoint.events){if(!supported(event)||typeof event.id!=='string'||!event.id||!Number.isFinite(event.presentation?.elapsed)||elapsed-event.presentation.elapsed<0||elapsed-event.presentation.elapsed>=lifetime||next.has(event.id))throw TypeError('Invalid VFX event checkpoint');next.set(event.id,structuredClone(event));}retained.clear();for(const [id,event] of next)retained.set(id,event);return true;}
 return {sync,exportCheckpoint,restoreCheckpoint,clear(){retained.clear();}};
}
