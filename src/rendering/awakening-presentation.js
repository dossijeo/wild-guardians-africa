// Presentation-only state: the authoritative blessing is committed immediately.
// Reloading a save cannot retain a hidden or unfinished transaction.
export const RITUAL={pulse:2.05,duration:2.8};
const pending=new WeakMap();
export function beginAwakening(target,at){if(target&&!pending.has(target))pending.set(target,at+RITUAL.pulse);}
export function revealAwakening(target,at){if(target&&pending.has(target))pending.set(target,Math.min(at,pending.get(target)));}
export function awakeningVisibleAt(target){return pending.get(target)??target?.blessing?.at??0;}
export function awakeningVisible(target,clock){return !!target?.blessing&&clock>=awakeningVisibleAt(target);}
