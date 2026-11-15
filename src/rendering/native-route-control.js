import {copyNativeTaskRequestReference,nativeTaskRequestMatchesStart} from '../world/native-task-request-reference.js';
import {copyNativeTaskStartReference} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation,nativeTaskStartAttestationCovers} from '../world/native-task-start-attestation.js';
import {copyNativeResumeAttestation,nativeResumeAttestationCovers} from '../world/native-resume-attestation.js';
import {copyNativeResumeReference,sameNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,sameNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';

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
export function createNativeRouteControl({authorityEpoch,initialSequence=0,initialTime=null,routes=[],pendingTaskRequests=[]}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0||
     initialTime!==null&&(!Number.isFinite(initialTime)||initialTime<0)||!Array.isArray(routes)||!Array.isArray(pendingTaskRequests))
    throw TypeError('Invalid native route control identity');
  const active=new Map(),actors=new Map();
  const actorContext=actorId=>{let value=actors.get(actorId);if(!value){value={closed:false,latestSequence:0,state:null,current:null,revoked:null,proof:null,resumeProof:null,startProof:null,pendingTaskRequest:null};actors.set(actorId,value);}return value;};
  const matches=(record,reference)=>!!record&&record.actorId===reference.actorId&&record.assignmentSequence===reference.assignmentSequence&&sameHandle(record.handle,reference.routeHandle);
  const assignments=new Set();
  for(const route of routes){
    if(!id(route?.actorId)||active.has(route.actorId)||!validHandle(route.routeHandle,authorityEpoch)||
       !id(route.assignmentSequence)||route.assignmentSequence>initialSequence||
       assignments.has(route.assignmentSequence)||!Number.isFinite(route.startTime)||
       route.startTime<0||initialTime===null||route.startTime>initialTime)
      throw TypeError('Invalid native route control baseline');
    assignments.add(route.assignmentSequence);
    const actor=actorContext(route.actorId),record={actorId:route.actorId,handle:Object.freeze({...route.routeHandle}),
      assignmentSequence:route.assignmentSequence,startTime:route.startTime,
      safeUntil:Infinity,lastDrawTime:null,actor};active.set(route.actorId,record);
    actor.current=record;actor.state=1;actor.latestSequence=route.assignmentSequence;
  }
  for(const input of pendingTaskRequests){const request=copyNativeTaskRequestReference(input);
    if(actors.has(request.actorId)||request.requestHandle.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending request baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingTaskRequest=request;
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
    const taskRequest=event.state===6&&event.taskRequest?copyNativeTaskRequestReference(event.taskRequest):null;
    if(taskRequest&&(taskRequest.actorId!==event.actorId||taskRequest.taskId!==event.taskId||taskRequest.targetId!==event.targetId||taskRequest.requestSequence!==event.sequence||taskRequest.requestedAt!==event.effectiveTime||taskRequest.requestHandle.authorityEpoch!==authorityEpoch||clock&&taskRequest.requestHandle.session!==clock.nativeSession))throw Error('Native request event identity mismatch');
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
    const actor=assigned||event.type==='IntentChanged'&&event.state===6?actorContext(event.actorId):actors.get(event.actorId);
    const sourceSuspension=assigned&&actor?.proof&&suspendedCurrent(actor.proof,actor.revoked,actor)?{reference:actor.proof,sequence:actor.latestSequence}:null;
    if(current&&revoked){
      current.revokedSequence=event.sequence;current.revokedState=Number.isInteger(event.state)?event.state:null;
      if(actor){actor.revoked=current;actor.current=null;actor.proof=null;}
      current.safeUntil=Math.min(current.safeUntil,event.effectiveTime);
      active.delete(event.actorId);counters.revoked++;
    }
    const sourceTaskRequest=assigned?actor?.pendingTaskRequest??null:null;
    if(assigned){const record={actorId:event.actorId,handle:Object.freeze({...handle}),
      assignmentSequence:event.sequence,startTime:event.effectiveTime,
      safeUntil:Infinity,lastDrawTime:null,actor,sourceSuspension,sourceTaskRequest};active.set(event.actorId,record);actor.current=record;actor.proof=null;}
    if(actor){actor.startProof=null;actor.pendingTaskRequest=taskRequest;actor.resumeProof=null;actor.latestSequence=event.sequence;actor.state=assigned?1:Number.isInteger(event.state)?event.state:null;
      if(!actor.current&&actor.state!==4&&actor.state!==6){actor.closed=true;actors.delete(event.actorId);}}
    sequence=event.sequence;effectiveTime=event.effectiveTime;counters.accepted++;
    return true;
  }
  function suspendedCurrent(reference,record,actor){
    return !closed&&!!clock&&!actor.closed&&actors.get(reference.nativeRoute.actorId)===actor&&
      actor.current===null&&actor.state===4&&actor.revoked===record&&record.revokedState===4&&
      actor.latestSequence===record.revokedSequence&&record.safeUntil===reference.suspendedAt&&
      sameNativeSuspendedBodyReference(actor.proof,reference);
  }
  function resumeSourceMatches(reference,proof){
    const source=reference.sourceResumeHandle,old=proof?.nativeRoute;
    return !!old&&old.actorId===reference.actorId&&old.assignmentSequence===reference.sourceAssignmentSequence&&proof.bodyId===reference.bodyId&&proof.suspendedAt===reference.suspendedAt&&proof.resumeGeneration===source.generation&&old.routeHandle.authorityEpoch===source.authorityEpoch&&old.routeHandle.session===source.session&&old.routeHandle.slot===source.slot;
  }
  function resumeCurrent(reference,actor){
    const record=actor?.current,proof=actor?.resumeProof;
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&nativeResumeAttestationCovers(proof,reference);
  }
  function startCurrent(reference,actor){
    const record=actor?.current,proof=actor?.startProof;
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&proof?.assignmentSequence===record.assignmentSequence&&record.startTime===proof.reference.worldBoundary.effectiveTime&&nativeTaskStartAttestationCovers(proof,reference);
  }
  return {
    accept,
    installStartedRoutes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native started route boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeTaskStartAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,world=r.worldBoundary;
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==world.effectiveTime||!bootstrap&&!nativeTaskRequestMatchesStart(record.sourceTaskRequest,r))throw Error('Native start attestation differs from issued route or request');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.startProof=value;return staged.length;
    },
    admitStart(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskStartReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>startCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===6&&actor.latestSequence===reference.requestSequence&&nativeTaskRequestMatchesStart(actor.pendingTaskRequest,reference)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native start is obsolete or lacks direct request/assignment proof');error.code='native-start-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.startProof.reference.endTime:null;}});
    },
    installResumedRoutes(boundary,values=[]){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Invalid native resumed route attestation boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeResumeAttestation(input),reference=value.reference,actor=actors.get(reference.actorId),record=actor?.current,source=record?.sourceSuspension;
        if(!sameNativeWorldBoundary(reference.worldBoundary,boundary)||ids.has(reference.actorId)||bodies.has(reference.bodyId)||!actor||actor.closed||actor.state!==1||active.get(reference.actorId)!==record||!record||actor.latestSequence!==record.assignmentSequence||value.assignmentSequence!==record.assignmentSequence||record.assignmentSequence<=reference.sourceControlSequence||!source||source.sequence>reference.sourceControlSequence||!resumeSourceMatches(reference,source.reference)||!sameHandle(record.handle,reference.expectedRouteHandle)||record.startTime!==boundary.effectiveTime)throw Error('Native resume attestation does not match its issued assignment and source body');
        ids.add(reference.actorId);bodies.add(reference.bodyId);staged.push({actor,proof:value});}
      for(const {actor,proof} of staged)actor.resumeProof=proof;return staged.length;
    },
    admitResume(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeResumeReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      // Data may finish preparing after other actors advance. This is never a
      // draw grant: only the actual, exact direct assignment can make current().
      const current=()=>resumeCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime&&!!actor.proof&&suspendedCurrent(actor.proof,actor.revoked,actor)&&resumeSourceMatches(reference,actor.proof);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native resume is obsolete or lacks direct assignment attestation');error.code='native-resume-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.resumeProof.reference.endTime:null;}});
    },
    // Called only with facts delivered on the direct authority connection at
    // physical release. Resource/preparation metadata cannot install a proof.
    installSuspendedBodies(boundary,values=[]){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Invalid native suspension attestation boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const value of values){const reference=copyNativeSuspendedBodyReference(value),actor=actors.get(reference.nativeRoute.actorId),record=actor?.revoked;
        if(!sameNativeWorldBoundary(reference.worldBoundary,boundary)||ids.has(reference.nativeRoute.actorId)||bodies.has(reference.bodyId)||!actor||actor.closed||actor.current||actor.state!==4||actor.latestSequence!==record?.revokedSequence||record.revokedState!==4||!matches(record,reference.nativeRoute)||record.safeUntil!==reference.suspendedAt)throw Error('Native suspension attestation does not match its exact revocation');
        ids.add(reference.nativeRoute.actorId);bodies.add(reference.bodyId);staged.push({actor,reference});}
      for(const {actor,reference} of staged)actor.proof=reference;
      return staged.length;
    },
    admitSuspended(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeSuspendedBodyReference(value),actor=actors.get(reference.nativeRoute.actorId),record=actor?.current??actor?.revoked,boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.nativeRoute.actorId)===actor&&actor.current===record&&active.get(reference.nativeRoute.actorId)===record&&actor.state===1&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&clock.committedThrough===reference.suspendedAt&&record.startTime<=reference.suspendedAt;
      const current=()=>!!actor&&!!record&&suspendedCurrent(reference,record,actor);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!matches(record,reference.nativeRoute)||!current()&&!pending()){
        const error=Error('Native suspended body is obsolete or lacks direct authority proof');error.code='native-suspended-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()});
    },
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
      for(const actor of actors.values())if(actor.pendingTaskRequest&&actor.pendingTaskRequest.requestHandle.session!==message.nativeSession)throw Error('Invalid native pending request session');
      for(const record of active.values()){
        if(record.handle.session!==message.nativeSession)throw Error('Invalid native causal clock session');
        if(record.lastDrawTime!==null&&record.lastDrawTime>message.committedThrough)
          throw Error('Native causal clock arrived after presented time');
      }
      clock=Object.freeze({...message});effectiveTime=message.committedThrough;return true;
    },
    clockLease(visualEpoch,resourceCeiling=Infinity){
      if(!clock)return null;
      const through=Math.min(clock.committedThrough,resourceCeiling),elapsed=Math.min(clock.anchorLogicalTime,through);
      if(!Number.isFinite(visualEpoch)||visualEpoch<0||elapsed<visualEpoch||!Number.isFinite(through))throw Error('Native causal clock epoch or resource ceiling mismatch');
      const span=through-elapsed;
      return {version:1,epoch:visualEpoch,elapsed,anchorAbsoluteMs:clock.anchorAbsoluteMs,
        safeUntil:through,paused:clock.paused,segments:!clock.paused&&span>0?
          [{start:elapsed,end:through,rate:clock.rate,realDuration:span/clock.rate}]:[]};
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
      record.safeUntil=record.lastDrawTime??record.startTime;active.clear();for(const actor of actors.values())actor.closed=true;actors.clear();},
  };
}
