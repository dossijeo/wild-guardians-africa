// Retain the short-lived facts used by hit VFX while their simulation-time
// effects can still be visible. The game owns the events; this is a separate
// presentation window and never writes to the authoritative state.
export function createConfirmedVfxEventWindow({lifetime}){
 if(!Number.isFinite(lifetime)||lifetime<=0)throw TypeError('Invalid VFX event lifetime');
 const retained=new Map();
 function sync(elapsed,events=[],legacy=[]){
  if(!Number.isFinite(elapsed)||!Array.isArray(events)||!Array.isArray(legacy))throw TypeError('Invalid confirmed VFX events');
  for(const [id,event] of retained)if(elapsed-event.presentation.elapsed>=lifetime)retained.delete(id);
  for(const event of [...legacy,...events]){
   if(event?.type!=='AnimalLogicalHit'||typeof event.id!=='string'||!event.id||!Number.isFinite(event.presentation?.elapsed))continue;
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
  return [...values,...legacy.filter(event=>event?.type==='AnimalLogicalHit'&&(typeof event.id!=='string'||!event.id))];
 }
 return {sync,clear(){retained.clear();}};
}
