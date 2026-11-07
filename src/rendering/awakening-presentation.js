// Presentation-only state: the authoritative blessing is committed immediately.
// Reloading a save cannot retain a hidden or unfinished transaction.
export const RITUAL={pulse:2.05,duration:2.8};
// Used only to size a transient ritual. A historical event source must never
// become a live target or be inserted into the authoritative state.
export function ritualVisualTarget(event,liveTarget){
 if(liveTarget)return liveTarget;
 const source=event?.presentation?.source;
 return source?.id===event?.targetId&&source.kind==='plant'&&typeof source.species==='string'&&Number.isFinite(source.growth)?source:null;
}
const pending=new WeakMap();
export function beginAwakening(target,at){if(target&&!pending.has(target))pending.set(target,at+RITUAL.pulse);}
export function restartAwakening(target,at){if(target)pending.set(target,at+RITUAL.pulse);}
export function cancelAwakening(target){if(target&&!target.blessing)pending.delete(target);}
export function revealAwakening(target,at){if(target&&pending.has(target))pending.set(target,Math.min(at,pending.get(target)));}
export function awakeningVisibleAt(target){return pending.get(target)??target?.blessing?.at??0;}
export function awakeningVisible(target,clock){return !!target?.blessing&&clock>=awakeningVisibleAt(target);}
