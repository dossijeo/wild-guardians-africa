const eventTypes=new Set(['RouteAssigned','RouteInvalidated','RouteReplaced',
  'IntentChanged','RouteCompleted']);
const id=value=>Number.isSafeInteger(value)&&value>0;
function sameHandle(a,b){return a?.authorityEpoch===b?.authorityEpoch&&
  a?.session===b?.session&&a?.slot===b?.slot&&a?.generation===b?.generation;}
function validHandle(handle,epoch){return handle?.authorityEpoch===epoch&&
  id(handle.session)&&Number.isSafeInteger(handle.slot)&&handle.slot>=0&&
  id(handle.generation);}

// A permission mirror of the existing native intent log, not a navigation or
// movement model. No points, bodies, targets or collision predicates live here.
// Admission resolves a stable record once. Revocation updates that exact record
// even if preparation has not finished; drawing only reads its time limit.
export function createNativeRouteControl({authorityEpoch,initialSequence=0}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0)
    throw TypeError('Invalid native route control identity');
  const active=new Map();
  let sequence=initialSequence,effectiveTime=-Infinity,closed=false;
  const counters={accepted:0,revoked:0,oldEpoch:0,admissions:0};
  function accept(event){
    if(closed)throw Error('Native route control is closed');
    if(event?.authorityEpoch!==authorityEpoch){counters.oldEpoch++;return false;}
    if(event.protocolVersion!==2||!eventTypes.has(event.type)||!id(event.actorId)||
       event.sequence!==sequence+1||!Number.isFinite(event.effectiveTime)||
       event.effectiveTime<effectiveTime)
      throw Error('Invalid native route control order or time');
    const assigned=['RouteAssigned','RouteReplaced'].includes(event.type),
      revoked=event.revokedRouteHandle??null,handle=event.routeHandle??null;
    if(revoked&&!validHandle(revoked,authorityEpoch)||
       handle&&!validHandle(handle,authorityEpoch)||assigned&&!handle||
       !assigned&&event.type!=='IntentChanged'&&handle||
       ['RouteInvalidated','RouteCompleted','RouteReplaced'].includes(event.type)&&!revoked)
      throw Error('Invalid native route transition identity');
    const current=active.get(event.actorId);
    if(current&&revoked&&!sameHandle(current.handle,revoked))
      throw Error('Native route revocation does not match the active version');
    if(current&&assigned&&!revoked)
      throw Error('Native route assignment omitted the previous revocation');
    if(current&&!assigned&&!revoked)
      throw Error('Native intent transition omitted the active route revocation');
    if(current&&revoked&&current.lastDrawTime!==null&&
       event.effectiveTime<current.lastDrawTime){
      const error=Error('Native route revocation arrived after its presented time');
      error.code='native-route-revocation-late';throw error;
    }
    if(current&&revoked){
      current.safeUntil=Math.min(current.safeUntil,event.effectiveTime);
      active.delete(event.actorId);counters.revoked++;
    }
    if(assigned)active.set(event.actorId,{
      actorId:event.actorId,handle:Object.freeze({...handle}),
      assignmentSequence:event.sequence,startTime:event.effectiveTime,
      safeUntil:Infinity,lastDrawTime:null});
    sequence=event.sequence;effectiveTime=event.effectiveTime;counters.accepted++;
    return true;
  }
  return {
    accept,
    admit({actorId,routeHandle,assignmentSequence}={}){
      if(closed)throw Error('Native route control is closed');
      const record=active.get(actorId);
      if(!record||!sameHandle(record.handle,routeHandle)||
         record.assignmentSequence!==assignmentSequence){
        const error=Error('Prepared native route is obsolete or unauthorized');
        error.code='native-route-admission-obsolete';throw error;
      }
      counters.admissions++;return record;
    },
    status:()=>({authorityEpoch,sequence,effectiveTime:Number.isFinite(effectiveTime)?
      effectiveTime:null,active:active.size,closed,...counters}),
    dispose(){if(closed)return;closed=true;for(const record of active.values())
      record.safeUntil=record.lastDrawTime??record.startTime;active.clear();},
  };
}
