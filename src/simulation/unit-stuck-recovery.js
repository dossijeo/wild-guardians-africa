// Bounded safety valve for exceptional motion stalls. It never changes the
// static collision rules or asks navigation to search beyond its normal path.
const REPLAN_SECONDS=1.5;
const MOBILE_PASS_SECONDS=3.5;
const RELOCATE_SECONDS=6;
export const RETREAT_DESPAWN_SECONDS=10;

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const record=(state,actor,kind,cause,duration,emit)=>emit(state,'UnitRecovery',{
  unitId:actor.id,unitKind:state.raid?.animals.includes(actor)?'animal':'worker',kind,cause,
  duration,x:actor.x,z:actor.z,day:state.day,time:state.time
});

export function mobilePassActive(state,actor){
  return !!(actor.stuckRecovery?.mobilePassUntil>state.elapsed);
}

export function clearBlockedStaticLeg(state,actor,nav,worker,emit){
  const next=actor.path?.[0];if(!next||!nav.segmentClear||nav.segmentClear(actor,next,actor.radius??.28,null,worker))return false;
  actor.path=null;
  const recovery=actor.stuckRecovery??={destinationId:actor.destinationId,stalledFor:0,phase:0,mobilePassUntil:0,mobilePassMetres:0};
  if(recovery.phase<1){recovery.phase=1;record(state,actor,'route-replan','blocked-static-leg',recovery.stalledFor,emit);}
  return true;
}

function nearbyValidPoint(actor,nav,worker){
  const radius=actor.radius??.28;
  if(nav.walkable?.(actor.x,actor.z,radius,null,worker)!==false)return null;
  for(const distance of [.35,.7,1.05])for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,point={x:actor.x+Math.cos(angle)*distance,z:actor.z+Math.sin(angle)*distance};
    // A valid endpoint alone is insufficient: the entire local connector
    // must remain in the actor's current physical region.
    if(nav.walkable?.(point.x,point.z,radius,null,worker)&&nav.segmentClear?.(actor,point,radius,null,worker))return point;
  }
  return null;
}

export function observeUnitProgress(state,actor,before,destination,dt,nav,worker,emit){
  if(dt<=0||actor.gateWaiting||actor.status==='waiting')return;
  const moved=distance(before,actor),recovery=actor.stuckRecovery;
  if(moved>.015){
    if(recovery){
      recovery.stalledFor=0;recovery.mobilePassMetres+=moved;
      // Keep the phase through the entire short pass. Ending it after the
      // first few centimetres can trap the actor inside the other body.
      if(state.elapsed>=recovery.mobilePassUntil)delete actor.stuckRecovery;
    }
    return;
  }
  const current=recovery??(actor.stuckRecovery={destinationId:destination.id,stalledFor:0,phase:0,mobilePassUntil:0,mobilePassMetres:0});
  if(current.destinationId!==destination.id){current.destinationId=destination.id;current.stalledFor=0;current.phase=0;current.mobilePassUntil=0;current.mobilePassMetres=0;}
  current.stalledFor+=dt;
  if(current.phase<1&&current.stalledFor>=REPLAN_SECONDS){
    actor.path=null;current.phase=1;record(state,actor,'route-replan','no-progress',current.stalledFor,emit);
  }
  if(current.phase<2&&current.stalledFor>=MOBILE_PASS_SECONDS){
    // Only mobile-body clearance is bypassed; terrain, walls and props are
    // still checked by the normal route-clearance path every movement step.
    if(actor.path?.length&&nav.segmentClear?.(actor,actor.path[0],actor.radius??.28,null,worker)){
      current.mobilePassUntil=state.elapsed+2;current.mobilePassMetres=0;current.phase=2;
      record(state,actor,'mobile-pass','dynamic-obstruction',current.stalledFor,emit);
    }
  }
  if(current.phase<3&&current.stalledFor>=RELOCATE_SECONDS){
    current.phase=3;
    const point=nearbyValidPoint(actor,nav,worker);
    if(point){actor.x=point.x;actor.z=point.z;actor.path=null;record(state,actor,'local-relocation','invalid-position',current.stalledFor,emit);}
  }
}
