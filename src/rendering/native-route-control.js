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
export function createNativeRouteControl({authorityEpoch,initialSequence=0,initialTime=null,routes=[]}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0||
     initialTime!==null&&(!Number.isFinite(initialTime)||initialTime<0)||!Array.isArray(routes))
    throw TypeError('Invalid native route control identity');
  const active=new Map();
  const assignments=new Set();
  for(const route of routes){
    if(!id(route?.actorId)||active.has(route.actorId)||!validHandle(route.routeHandle,authorityEpoch)||
       !id(route.assignmentSequence)||route.assignmentSequence>initialSequence||
       assignments.has(route.assignmentSequence)||!Number.isFinite(route.startTime)||
       route.startTime<0||initialTime===null||route.startTime>initialTime)
      throw TypeError('Invalid native route control baseline');
    assignments.add(route.assignmentSequence);
    active.set(route.actorId,{actorId:route.actorId,handle:Object.freeze({...route.routeHandle}),
      assignmentSequence:route.assignmentSequence,startTime:route.startTime,
      safeUntil:Infinity,lastDrawTime:null});
  }
  let sequence=initialSequence,effectiveTime=initialTime??-Infinity,closed=false,clock=null;
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
        ['RouteInvalidated','RouteCompleted','RouteReplaced'].includes(event.type)&&!revoked||
        clock&&handle&&handle.session!==clock.nativeSession)
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
    acceptClock(message,{baseline=false}={}){
      if(closed)throw Error('Native route control is closed');
      const policy=!clock||message?.rate!==clock.rate||message?.paused!==clock.paused;
      if(message?.protocolVersion!==2||message.clockVersion!==1||message.authorityEpoch!==authorityEpoch||
         !id(message.nativeSession)||!id(message.clockSequence)||!Number.isSafeInteger(message.intentSequence)||message.intentSequence!==sequence||
         !Number.isFinite(message.committedThrough)||message.committedThrough<effectiveTime||
         !Number.isFinite(message.rate)||message.rate<=0||message.rate>1000000||typeof message.paused!=='boolean'||
         typeof message.reanchor!=='boolean'||!Number.isFinite(message.anchorAbsoluteMs)||message.anchorAbsoluteMs<0||
         !Number.isFinite(message.anchorLogicalTime)||message.anchorLogicalTime<0||message.anchorLogicalTime>message.committedThrough||
         baseline&&clock||!baseline&&message.reanchor!==policy||
         clock&&(message.nativeSession!==clock.nativeSession||message.clockSequence!==clock.clockSequence+1||message.committedThrough<clock.committedThrough)||
         (baseline||policy)&&message.anchorLogicalTime!==message.committedThrough||
         clock&&!policy&&!baseline&&(message.anchorLogicalTime!==clock.anchorLogicalTime||message.anchorAbsoluteMs!==clock.anchorAbsoluteMs)||
         clock&&policy&&message.anchorAbsoluteMs<clock.anchorAbsoluteMs||
         message.paused&&message.anchorLogicalTime!==message.committedThrough)
        throw Error('Invalid native causal clock boundary');
      for(const record of active.values()){
        if(record.handle.session!==message.nativeSession)throw Error('Invalid native causal clock session');
        if(record.lastDrawTime!==null&&record.lastDrawTime>message.committedThrough)
          throw Error('Native causal clock arrived after presented time');
      }
      clock=Object.freeze({...message});effectiveTime=message.committedThrough;return true;
    },
    clockLease(visualEpoch){
      if(!clock)return null;
      if(!Number.isFinite(visualEpoch)||visualEpoch<0||clock.anchorLogicalTime<visualEpoch)throw Error('Native causal clock epoch mismatch');
      const span=clock.committedThrough-clock.anchorLogicalTime;
      return {version:1,epoch:visualEpoch,elapsed:clock.anchorLogicalTime,anchorAbsoluteMs:clock.anchorAbsoluteMs,
        safeUntil:clock.committedThrough,paused:clock.paused,segments:!clock.paused&&span>0?
          [{start:clock.anchorLogicalTime,end:clock.committedThrough,rate:clock.rate,realDuration:span/clock.rate}]:[]};
    },
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
      effectiveTime:null,active:active.size,closed,...counters,...(clock?{clock}:{} )}),
    dispose(){if(closed)return;closed=true;for(const record of active.values())
      record.safeUntil=record.lastDrawTime??record.startTime;active.clear();},
  };
}
