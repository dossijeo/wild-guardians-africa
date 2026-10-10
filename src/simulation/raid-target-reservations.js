// Connected groups remain valuation zones. Ownership belongs to one target,
// or one physically separated approach for a large work center.
const active=a=>!['gone','retreating','waiting'].includes(a.status);
const indices=new WeakMap();
function targetIndex(state){
 const old=indices.get(state);
 if(old&&old.plants===state.plants&&old.plantLength===state.plants.length&&old.structures===state.structures&&old.structureLength===state.structures.length)return old.byId;
 const byId=new Map([...state.plants,...state.structures].map(t=>[t.id,t]));
 indices.set(state,{plants:state.plants,plantLength:state.plants.length,structures:state.structures,structureLength:state.structures.length,byId});return byId;
}
export function targetReservationKey(target,animal){
 return target.kind==='center'?`center:${target.id}:${animal.id}`:'alive' in target?`crop:${target.id}`:`structure:${target.id}`;
}
export function targetReserved(state,animal,target){
 if(target.kind==='center')return false;
 return state.raid.animals.some(a=>a!==animal&&active(a)&&a.targetId===target.id);
}
export function reservedApproachClear(state,animal,point){
 return state.raid.animals.every(a=>a===animal||!active(a)||!a.approach||Math.hypot(point.x-a.approach.x,point.z-a.approach.z)>=(animal.radius??.28)+(a.radius??.28)+.1);
}
export function reconcileTargetReservations(state,release){
 const raid=state.raid,claimed=new Set(),owners={},approaches=[],byId=targetIndex(state);
 for(const a of raid.animals){
  if(!active(a)||!a.targetId)continue;
  const target=byId.get(a.targetId);
  if(!target||('alive' in target?!target.alive:target.status!=='intact'||target.hp<=0)){release(state,a);continue;}
  const key=targetReservationKey(target,a);
  if(claimed.has(key)||a.approach&&approaches.some(other=>Math.hypot(a.approach.x-other.approach.x,a.approach.z-other.approach.z)<(a.radius??.28)+(other.radius??.28)+.1)){
   release(state,a);a.status='walking';a.attackRemaining=0;a.attackId=null;a.hitApplied=false;continue;
  }
  claimed.add(key);a.reservation=key;owners[key]=a.id;if(a.approach)approaches.push(a);
 }
 const before=Object.entries(raid.reservations).sort().map(e=>e.join(':')).join('|'),after=Object.entries(owners).sort().map(e=>e.join(':')).join('|');
 raid.reservations=owners;raid.targetReservationVersion=2;
 if(before!==after)raid.waitRevision=((raid.waitRevision??0)+1)>>>0;
}
