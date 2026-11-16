import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
import {copyNativeHomeRouteReference,copyNativeHomeRouteAttestation,nativeHomeRouteAttestationCovers,sameNativeHomeRouteReference} from '../world/native-home-route.js';
import {sameNativeTaskSettlementReference} from '../world/native-task-settlement.js';
import {copyNativeHomeRequestReference,sameNativeHomeRequestReference,nativeHomeRequestContinuesIdle,nativeHomeRequestContinuesInitialIdle} from '../world/native-home-request-reference.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from '../world/native-initial-idle-request-reference.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyAttestation,nativeInitialIdleBodyAttestationCovers} from '../world/native-initial-idle-body.js';
import {copyNativeTaskRequestReference,nativeTaskRequestMatchesStart} from '../world/native-task-request-reference.js';
import {copyNativeTaskStartReference} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation,nativeTaskStartAttestationCovers} from '../world/native-task-start-attestation.js';
import {copyNativeResumeAttestation,nativeResumeAttestationCovers} from '../world/native-resume-attestation.js';
import {copyNativeResumeReference,sameNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,sameNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyNativeTaskActionReference,nativeTaskActionActor} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionRestoreReference,sameNativeTaskActionRestoreReference} from '../world/native-task-action-restore-reference.js';
import {copyNativeTaskActionAttestation,nativeTaskActionAttestationCovers} from '../world/native-task-action-attestation.js';
import {sameNativeTaskActionReference} from '../world/native-task-action-presentation.js';
import {copyNativeTaskConsequenceReference,copyNativeTaskConsequenceAttestation,nativeTaskConsequenceAttestationCovers} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementAttestation,nativeTaskSettlementAttestationCovers} from '../world/native-task-settlement.js';

const eventTypes=new Set(['RouteAssigned','RouteInvalidated','RouteReplaced',
  'IntentChanged','RouteCompleted']);
const id=value=>Number.isSafeInteger(value)&&value>0;
function sameHandle(a,b){return a?.authorityEpoch===b?.authorityEpoch&&
  a?.session===b?.session&&a?.slot===b?.slot&&a?.generation===b?.generation;}
function validHandle(handle,epoch){return handle?.authorityEpoch===epoch&&
  id(handle.session)&&Number.isSafeInteger(handle.slot)&&handle.slot>=0&&
  id(handle.generation);}

// A permission mirror of the existing native intent log, not a navigation or
// movement model. It owns no independent body motion or collision simulation.
// Admission resolves a stable record once. Revocation updates that exact record
// even if preparation has not finished; drawing only reads its time limit.
export function createNativeRouteControl({authorityEpoch,initialSequence=0,initialTime=null,routes=[],pendingTaskRequests=[],pendingActionRequests=[],pendingHomeRequests=[],pendingInitialIdleRequests=[]}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0||
     initialTime!==null&&(!Number.isFinite(initialTime)||initialTime<0)||!Array.isArray(routes)||!Array.isArray(pendingTaskRequests)||!Array.isArray(pendingActionRequests)||!Array.isArray(pendingHomeRequests)||!Array.isArray(pendingInitialIdleRequests))
    throw TypeError('Invalid native route control identity');
  const active=new Map(),actors=new Map();
  const actorContext=actorId=>{let value=actors.get(actorId);if(!value){value={closed:false,latestSequence:0,state:null,taskId:null,targetId:null,current:null,revoked:null,proof:null,resumeProof:null,startProof:null,consequenceProof:null,homeProof:null,settlementProof:null,settlementRecord:null,settlementSource:null,initialIdleBodyProof:null,initialIdleBodyRecord:null,initialIdleBodySource:null,pendingTaskRequest:null,pendingActionRequest:null,pendingHomeRequest:null,pendingInitialIdleRequest:null,actionSourceRequest:null,actionProof:null,actionRecord:null};actors.set(actorId,value);}return value;};
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
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingTaskRequest=request;actor.taskId=request.taskId;actor.targetId=request.targetId;assignments.add(request.requestSequence);
  }
  for(const input of pendingActionRequests){const request=copyNativeTaskActionRestoreReference(input);
    if(actors.has(request.actorId)||request.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending action baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingActionRequest=request;actor.taskId=request.taskId;actor.targetId=request.targetId;assignments.add(request.requestSequence);
  }
  for(const input of pendingHomeRequests){const request=copyNativeHomeRequestReference(input);
    if(actors.has(request.actorId)||request.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending Home baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingHomeRequest=request;assignments.add(request.requestSequence);
  }
  for(const input of pendingInitialIdleRequests){const request=copyNativeInitialIdleRequestReference(input);
    if(actors.has(request.actorId)||assignments.has(request.requestSequence)||request.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending initial Idle baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingInitialIdleRequest=request;assignments.add(request.requestSequence);
  }
  let sequence=initialSequence,effectiveTime=initialTime??-Infinity,closed=false,clock=null;
  const counters={accepted:0,revoked:0,oldEpoch:0,admissions:0};
  const homeRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&sameNativeHomeRequestReference(actor.pendingHomeRequest,request);
  const initialIdleRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingInitialIdleRequest===request;
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
    const actionRequest=event.state===6&&event.actionRequest?copyNativeTaskActionRestoreReference(event.actionRequest):null;
    const homeRequest=event.state===6&&event.homeRequest?copyNativeHomeRequestReference(event.homeRequest):null;
    const initialIdleRequest=event.state===6&&event.initialIdleRequest?copyNativeInitialIdleRequestReference(event.initialIdleRequest):null;
    if(event.initialIdleRequest&&!initialIdleRequest||initialIdleRequest&&(event.type!=='IntentChanged'||handle||revoked||taskRequest||actionRequest||homeRequest||initialIdleRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||initialIdleRequest.requestSequence!==event.sequence||initialIdleRequest.requestedAt!==event.effectiveTime||initialIdleRequest.authorityEpoch!==authorityEpoch||clock&&initialIdleRequest.nativeSession!==clock.nativeSession))throw Error('Native initial Idle request event identity mismatch');
    if(event.homeRequest&&!homeRequest||homeRequest&&(taskRequest||actionRequest||homeRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||homeRequest.requestSequence!==event.sequence||homeRequest.requestedAt!==event.effectiveTime||homeRequest.authorityEpoch!==authorityEpoch||clock&&homeRequest.nativeSession!==clock.nativeSession))throw Error('Native Home request event identity mismatch');
    if(event.actionRequest&&!actionRequest||taskRequest&&actionRequest||actionRequest&&(actionRequest.actorId!==event.actorId||actionRequest.taskId!==event.taskId||actionRequest.targetId!==event.targetId||actionRequest.requestSequence!==event.sequence||actionRequest.requestedAt!==event.effectiveTime||actionRequest.authorityEpoch!==authorityEpoch||clock&&actionRequest.nativeSession!==clock.nativeSession))throw Error('Native action request event identity mismatch');
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
    if(initialIdleRequest&&(current||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingInitialIdleRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.proof||actor.startProof||actor.actionProof||actor.consequenceProof||actor.settlementProof||actor.settlementSource||actor.homeProof||actor.initialIdleBodyProof||actor.initialIdleBodySource))throw Error('Native initial Idle request cannot replace an existing owner');
    if(homeRequest&&actor?.pendingInitialIdleRequest&&!nativeHomeRequestContinuesInitialIdle(homeRequest,actor.pendingInitialIdleRequest))throw Error('Native Home request differs from its pending initial Idle body');
    const initialBodyRequest=actor?.initialIdleBodySource?.request;
    if(homeRequest&&initialBodyRequest&&!nativeHomeRequestContinuesInitialIdle(homeRequest,initialBodyRequest))throw Error('Native Home request differs from its held initial Idle body');
    const keepInitialBody=!!initialBodyRequest&&!current&&event.type==='IntentChanged'&&event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state);
    if(actor?.pendingInitialIdleRequest&&event.state===7&&(event.type!=='IntentChanged'||current||handle||revoked||event.taskId||event.targetId||event.taskRequest||event.actionRequest||event.homeRequest||event.initialIdleRequest))throw Error('Native initial Idle body acquisition conflicts with its pending source');
    const completedInitialBody=actor?.pendingInitialIdleRequest&&!current&&event.type==='IntentChanged'&&event.state===7&&!handle&&!revoked&&!event.taskId&&!event.targetId?{request:actor.pendingInitialIdleRequest,bodySequence:event.sequence,at:event.effectiveTime}:null;
    if(actor?.initialIdleBodyRecord?.lastDrawTime!==null&&actor?.initialIdleBodyRecord?.lastDrawTime!==undefined&&event.effectiveTime<actor.initialIdleBodyRecord.lastDrawTime){const error=Error('Native initial Idle body revocation arrived after its presented time');error.code='native-initial-idle-body-revocation-late';throw error;}
    const retiringCarry=current&&actor?.consequenceProof&&consequenceCurrent(actor.consequenceProof.reference,actor)?actor.consequenceProof:null;
    if(homeRequest&&actor?.settlementProof&&!nativeHomeRequestContinuesIdle(homeRequest,actor.settlementProof))throw Error('Native Home request differs from its held Idle body');
    const keepSettlement=!!actor&&!actor.settlementProof?.reference.home&&!current&&event.type==='IntentChanged'&&event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state)&&!!(actor.settlementProof||actor.settlementSource);
    if(actor?.settlementRecord?.lastDrawTime!==null&&actor?.settlementRecord?.lastDrawTime!==undefined&&event.effectiveTime<actor.settlementRecord.lastDrawTime){const error=Error('Native settlement revocation arrived after its presented time');error.code='native-settlement-revocation-late';throw error;}
    if(actor?.actionRecord&&actor.actionRecord.lastDrawTime!==null&&event.effectiveTime<actor.actionRecord.lastDrawTime){const error=Error('Native action revocation arrived after its presented time');error.code='native-action-revocation-late';throw error;}
    const sourceSuspension=assigned&&actor?.proof&&suspendedCurrent(actor.proof,actor.revoked,actor)?{reference:actor.proof,sequence:actor.latestSequence}:null;
    if(current&&revoked){
      current.revokedSequence=event.sequence;current.revokedState=Number.isInteger(event.state)?event.state:null;
      if(actor){actor.revoked=current;actor.current=null;actor.proof=null;}
      current.safeUntil=Math.min(current.safeUntil,event.effectiveTime);
      active.delete(event.actorId);counters.revoked++;
    }
    const sourceHome=assigned&&actor?.settlementProof?.reference.home&&settlementCurrent(actor.settlementProof.reference,actor)?actor.settlementProof:null,sourceTaskRequest=assigned?actor?.pendingTaskRequest??null:null,sourceAction=assigned&&actor?.actionProof&&actionCurrent(actor.actionProof.reference,actor)?actor.actionProof:null;
    if(assigned){const record={actorId:event.actorId,handle:Object.freeze({...handle}),
      assignmentSequence:event.sequence,startTime:event.effectiveTime,
      safeUntil:Infinity,lastDrawTime:null,actor,sourceSuspension,sourceTaskRequest,sourceAction,sourceHome,sourceHomeRequest:actor?.pendingHomeRequest??null,sourceInitialIdleBody:actor?.initialIdleBodySource?.request??null};active.set(event.actorId,record);actor.current=record;actor.proof=null;}
    if(actor){
      if(!keepInitialBody){if(actor.initialIdleBodyRecord)actor.initialIdleBodyRecord.safeUntil=Math.min(actor.initialIdleBodyRecord.safeUntil,event.effectiveTime);actor.initialIdleBodyProof=null;actor.initialIdleBodyRecord=null;actor.initialIdleBodySource=completedInitialBody;}
      if(!keepSettlement){if(actor.settlementRecord)actor.settlementRecord.safeUntil=Math.min(actor.settlementRecord.safeUntil,event.effectiveTime);actor.settlementProof=null;actor.settlementRecord=null;actor.settlementSource=event.type==='RouteCompleted'&&event.state===7&&retiringCarry?{proof:retiringCarry,record:current}:null;}
      if(actor.actionRecord)actor.actionRecord.safeUntil=Math.min(actor.actionRecord.safeUntil,event.effectiveTime);actor.actionSourceRequest=event.state===2?actor.pendingActionRequest:null;actor.pendingActionRequest=actionRequest;actor.actionProof=null;actor.actionRecord=null;actor.startProof=null;actor.consequenceProof=null;actor.homeProof=null;actor.pendingTaskRequest=taskRequest;actor.resumeProof=null;actor.latestSequence=event.sequence;actor.state=assigned?1:Number.isInteger(event.state)?event.state:null;
      if(!actor.current&&actor.state!==2&&actor.state!==4&&actor.state!==6&&actor.state!==7){actor.closed=true;actors.delete(event.actorId);}}
    if(actor){actor.pendingHomeRequest=homeRequest;actor.pendingInitialIdleRequest=initialIdleRequest;actor.taskId=event.taskId??null;actor.targetId=event.targetId??null;}
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
  function actionCurrent(reference,actor){
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(nativeTaskActionActor(reference.request))===actor&&actor.state===2&&actor.current===null&&actor.actionRecord?.actionSequence===actor.latestSequence&&actor.actionProof?.actionSequence===actor.latestSequence&&nativeTaskActionAttestationCovers(actor.actionProof,reference);
  }
  function sameActionProof(a,b){return !!a&&!!b&&a.actionSequence===b.actionSequence&&sameNativeTaskActionReference(a.reference,b.reference)&&sameNativeTaskActionReference(a.preparedReference,b.preparedReference);}
  function consequenceCurrent(reference,actor){
    const record=actor?.current,proof=actor?.consequenceProof;
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&nativeTaskConsequenceAttestationCovers(proof,reference);
  }
  function sameSettlementProof(a,b){return !!a&&!!b&&a.settlementSequence===b.settlementSequence&&sameNativeTaskSettlementReference(a.reference,b.reference)&&sameNativeTaskSettlementReference(a.preparedReference,b.preparedReference);}
  function homeRecordCurrent(reference,actor){const record=actor?.current,proof=actor?.homeProof;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence;}
  function sameCarryProof(a,b){try{return JSON.stringify(copyNativeTaskConsequenceAttestation(a))===JSON.stringify(copyNativeTaskConsequenceAttestation(b));}catch{return false;}}
  // accept/install establish the immutable source match once; replay reads
  // the same installed proof and live request sequence without pose rescans.
  function settlementState(actor,proof){return actor.state===7&&actor.latestSequence===proof.settlementSequence||!proof.reference.home&&actor.state===6&&actor.latestSequence>proof.settlementSequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence&&(actor.settlementProof===proof||nativeHomeRequestContinuesIdle(actor.pendingHomeRequest,proof)));}
  function settlementRecordCurrent(reference,actor){const proof=actor?.settlementProof,record=actor?.settlementRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&record.settlementSequence===proof.settlementSequence&&settlementState(actor,proof);}
  function settlementCurrent(reference,actor){return settlementRecordCurrent(reference,actor)&&nativeTaskSettlementAttestationCovers(actor.settlementProof,reference);}
  function initialBodyState(actor,proof){return actor.state===7&&actor.latestSequence===proof.bodySequence||actor.state===6&&actor.latestSequence>proof.bodySequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence);}
  function initialBodyRecordCurrent(reference,actor){const proof=actor?.initialIdleBodyProof,record=actor?.initialIdleBodyRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&record.bodySequence===proof.bodySequence&&proof.bodySequence<=clock.intentSequence&&initialBodyState(actor,proof);}
  // Immutable proof associations are checked once per installation. Every replay still
  // checks the live owner, sequence, state and route; revocation clears the proof.
  function proofLeaseCurrent(reference,actor,field,covers,recordCurrent){let observedProof=null,matchesProof=false;return ()=>{const proof=actor?.[field]??null;if(proof!==observedProof){observedProof=proof;matchesProof=!!proof&&covers(proof,reference);}return matchesProof&&recordCurrent(reference,actor);};}
  return {
    // Metadata only. It cannot authorize drawing, movement or installation of
    // an executable binding and expires with the existing actor/control record.
    pendingInitialIdleRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingInitialIdleRequest;return request&&initialIdleRequestCurrent(request,actor)?request:null;},
    accept,
    installInitialIdleBodies(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native initial Idle body requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeInitialIdleBodyAttestation(input),r=value.reference,actor=actors.get(r.actorId),source=actor?.initialIdleBodySource;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.bodySequence>sequence||value.bodySequence>clock.intentSequence||r.sourceControlSequence!==value.bodySequence-1||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.current||actor.actionProof||actor.settlementProof||actor.initialIdleBodyProof||!source||source.bodySequence!==value.bodySequence||source.at!==boundary.effectiveTime||!sameNativeInitialIdleRequestReference(source.request,r.sourceRequest)||!initialBodyState(actor,value))throw Error('Native initial Idle body differs from its issued request or current owner');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged){const r=value.reference;actor.initialIdleBodyProof=value;actor.initialIdleBodyRecord={actorId:r.actorId,bodyId:r.bodyId,bodySequence:value.bodySequence,startTime:r.worldBoundary.effectiveTime,safeUntil:Infinity,lastDrawTime:null};}return staged.length;
    },
    admitInitialIdleBody(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeInitialIdleBodyReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=actor?.pendingInitialIdleRequest,
        sourceMatches=!!source&&sameNativeInitialIdleRequestReference(reference.sourceRequest,source),
        current=proofLeaseCurrent(reference,actor,'initialIdleBodyProof',nativeInitialIdleBodyAttestationCovers,initialBodyRecordCurrent),
        pending=()=>sourceMatches&&actor.pendingInitialIdleRequest===source&&initialIdleRequestCurrent(source,actor)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native initial Idle body is obsolete or lacks its direct pending source');error.code='native-initial-idle-body-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get initialIdleBodyRecord(){return current()?actor.initialIdleBodyRecord:null;},get executionEpoch(){return current()?actor.initialIdleBodyProof.reference.worldBoundary.effectiveTime:null;}});
    },
    installSettlements(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native settlement boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeTaskSettlementAttestation(input),r=value.reference,world=r.worldBoundary,actor=actors.get(r.actorId),source=actor?.settlementSource,old=source?.record;
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||value.settlementSequence>sequence||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||ids.has(r.actorId)||bodies.has(r.bodyId)||actor?.closed||actor?.current||actor?.actionProof||actor?.proof||
          (bootstrap?actor&&!settlementState(actor,value):!sameNativeWorldBoundary(world,boundary)||!actor||!settlementState(actor,value)||actor.revoked!==old||old.revokedState!==7||old.revokedSequence!==value.settlementSequence||old.safeUntil!==world.effectiveTime||!sameHandle(old.handle,r.sourceCarry.reference.expectedRouteHandle)||old.assignmentSequence!==r.sourceCarry.assignmentSequence||!sameCarryProof(source.proof,r.sourceCarry)))throw Error('Native settlement differs from its issued body or source Carry');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push(value);
      }
      for(const value of staged){const r=value.reference,actor=actorContext(r.actorId);if(actor.state===null){actor.state=7;actor.latestSequence=value.settlementSequence;}actor.settlementProof=value;actor.settlementRecord={actorId:r.actorId,bodyId:r.bodyId,settlementSequence:value.settlementSequence,startTime:r.worldBoundary.effectiveTime,safeUntil:Infinity,lastDrawTime:null};}return staged.length;
    },
    admitSettlement(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskSettlementReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),current=proofLeaseCurrent(reference,actor,'settlementProof',nativeTaskSettlementAttestationCovers,settlementRecordCurrent),pending=()=>consequenceCurrent(reference.sourceCarry.reference,actor)&&sameCarryProof(actor.consequenceProof,reference.sourceCarry)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native settlement is obsolete or lacks direct Carry/body proof');error.code='native-settlement-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get settlementRecord(){return current()?actor.settlementRecord:null;},get executionEpoch(){return current()?actor.settlementProof.reference.worldBoundary.effectiveTime:null;}});
    },
    admitHomeArrival(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeHomeArrivalReference(value),boundary=copyNativeWorldBoundary(preparingWorldBoundary),actor=actors.get(reference.actorId),record=actor?.current,source=actor?.homeProof,w=reference.worldBoundary,home=reference.sourceHome;
      const sameSource=!!source&&source.assignmentSequence===home.assignmentSequence&&sameNativeHomeRouteReference(source.reference,home.reference)&&sameNativeHomeRouteReference(source.preparedReference,home.preparedReference)&&JSON.stringify(source.gateIds)===JSON.stringify(home.gateIds);
      const prepared=()=>sameSource&&!closed&&!!clock&&sameNativeWorldBoundary(boundary,w)&&w.authorityEpoch===authorityEpoch&&w.nativeSession===clock.nativeSession&&w.effectiveTime<=clock.committedThrough&&reference.sourceControlSequence<=sequence&&actor.homeProof===source&&actor.current===record&&homeRecordCurrent(home.reference,actor);
      if(!prepared()){const error=Error('Native Home absence lacks its exact current source and prepared boundary');error.code='native-home-arrival-admission-obsolete';throw error;}
      // The existing revoked record is updated by the direct ordered log. This
      // lease validates a single retirement at release, never movement/draw time.
      const validateCommitted=value=>{
        const proof=copyNativeHomeArrivalAttestation(value),r=proof.reference,at=r.worldBoundary.effectiveTime;
        if(closed||!clock||!sameNativeHomeArrivalReference(proof.preparedReference,reference)||proof.retiredSequence!==sequence||clock.intentSequence!==sequence||clock.committedThrough!==at||r.worldBoundary.nativeSession!==clock.nativeSession||actors.has(reference.actorId)||active.has(reference.actorId)||!actor.closed||actor.current!==null||actor.latestSequence!==proof.retiredSequence||actor.state!==5||actor.revoked!==record||record.revokedSequence!==proof.retiredSequence||record.revokedState!==5||record.safeUntil!==at||record.assignmentSequence!==home.assignmentSequence||!sameHandle(record.handle,home.reference.expectedRouteHandle))throw Error('Native Home absence lacks its issued retirement');return proof;
      };
      counters.admissions++;return Object.freeze({reference,isPrepared:prepared,validateCommitted});
    },
    installHomes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native Home boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeHomeRouteAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,w=r.worldBoundary;
        if(w.authorityEpoch!==authorityEpoch||w.nativeSession!==clock.nativeSession||w.effectiveTime>clock.committedThrough||boundary&&(w.ticket>boundary.ticket||w.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(w,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==w.effectiveTime||!bootstrap&&!(r.sourceRequest?sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest):sameSettlementProof(record.sourceHome,r.sourceSettlement)))throw Error('Native Home differs from its issued route or stationary body');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.homeProof=value;return staged.length;
    },
    admitHome(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeHomeRouteReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),current=proofLeaseCurrent(reference,actor,'homeProof',nativeHomeRouteAttestationCovers,homeRecordCurrent),pending=()=>(reference.sourceRequest?homeRequestCurrent(reference.sourceRequest,actor):settlementCurrent(reference.sourceSettlement.reference,actor)&&sameSettlementProof(actor.settlementProof,reference.sourceSettlement))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native Home is obsolete or lacks direct stationary/assignment proof');error.code='native-home-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.homeProof.reference.endTime:null;}});
    },
    installConsequences(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native consequence boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeTaskConsequenceAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,world=r.worldBoundary;
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==world.effectiveTime||!bootstrap&&!sameActionProof(record.sourceAction,r.sourceAction))throw Error('Native consequence differs from its issued route or action');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.consequenceProof=value;return staged.length;
    },
    admitConsequence(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskConsequenceReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>consequenceCurrent(reference,actor),pending=()=>actionCurrent(reference.sourceAction.reference,actor)&&sameActionProof(actor.actionProof,reference.sourceAction)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime&&clock.committedThrough>=reference.sourceAction.reference.endTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native consequence is obsolete or lacks direct action/assignment proof');error.code='native-consequence-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.consequenceProof.reference.endTime:null;}});
    },
    installActions(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native action boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const proof=copyNativeTaskActionAttestation(input),r=proof.reference,q=r.request,actorId=nativeTaskActionActor(q),actor=actors.get(actorId),world=r.worldBoundary,revoked=actor?.revoked;
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||proof.actionSequence>sequence||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(actorId)||bodies.has(q.bodyId)||
          (bootstrap?!!actor:!actor||actor.closed||actor.current!==null||actor.state!==2||actor.latestSequence!==proof.actionSequence||!!actor.actionRecord||(q.sourceRequest?!sameNativeTaskActionRestoreReference(actor.actionSourceRequest,q.sourceRequest):!revoked||revoked.revokedState!==2||revoked.revokedSequence!==proof.actionSequence||revoked.safeUntil!==world.effectiveTime||!matches(revoked,q.nativeRoute))))throw Error('Native action attestation differs from its issued transition');
        ids.add(actorId);bodies.add(q.bodyId);staged.push({actorId,actor,proof});
      }
      for(const item of staged){const actor=item.actor??actorContext(item.actorId);actor.state=2;actor.latestSequence=item.proof.actionSequence;actor.actionProof=item.proof;actor.actionRecord={actorId:item.actorId,actor,reference:item.proof.reference,actionSequence:item.proof.actionSequence,startTime:item.proof.reference.startTime,safeUntil:Infinity,lastDrawTime:null};}return staged.length;
    },
    admitAction(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskActionReference(value),q=reference.request,actorId=nativeTaskActionActor(q),actor=actors.get(actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>actionCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(actorId)===actor&&(q.sourceRequest?actor.state===6&&actor.latestSequence===q.sourceRequest.requestSequence&&sameNativeTaskActionRestoreReference(actor.pendingActionRequest,q.sourceRequest):actor.state===1&&actor.latestSequence===actor.current?.assignmentSequence&&matches(actor.current,q.nativeRoute))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.startTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native action is obsolete or lacks direct authority proof');error.code='native-action-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get actionRecord(){return current()?actor.actionRecord:null;},get executionEpoch(){return current()?actor.actionProof.reference.startTime:null;},get executionEnd(){return current()?actor.actionProof.reference.endTime:null;}});
    },
    startGateExecutionEpoch(gate){for(const actor of actors.values()){for(const [proof,current] of [[actor.startProof,startCurrent],[actor.consequenceProof,consequenceCurrent],[actor.homeProof,homeRecordCurrent]])if(proof&&current(proof.reference,actor)&&proof.gateIds.includes(gate.gateId)&&sameNativeWorldBoundary(proof.preparedReference.worldBoundary,gate.worldBoundary))return actor.current.startTime;}return null;},
    installStartedRoutes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native started route boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeTaskStartAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,world=r.worldBoundary;
        if(record?.sourceInitialIdleBody&&r.bodyId!==record.sourceInitialIdleBody.bodyId)throw Error('Native start differs from its held initial Idle body');
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==world.effectiveTime||!bootstrap&&!nativeTaskRequestMatchesStart(record.sourceTaskRequest,r))throw Error('Native start attestation differs from issued route or request');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.startProof=value;return staged.length;
    },
    admitStart(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskStartReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>startCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===6&&actor.latestSequence===reference.requestSequence&&nativeTaskRequestMatchesStart(actor.pendingTaskRequest,reference)&&(!actor.initialIdleBodySource||reference.bodyId===actor.initialIdleBodySource.request.bodyId)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
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
       for(const actor of actors.values()){
         if(actor.pendingTaskRequest&&actor.pendingTaskRequest.requestHandle.session!==message.nativeSession)throw Error('Invalid native pending request session');
         if(actor.pendingHomeRequest&&actor.pendingHomeRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending Home session');
         if(actor.pendingInitialIdleRequest&&actor.pendingInitialIdleRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending initial Idle session');
       }
      for(const record of active.values()){
        if(record.handle.session!==message.nativeSession)throw Error('Invalid native causal clock session');
        if(record.lastDrawTime!==null&&record.lastDrawTime>message.committedThrough)
          throw Error('Native causal clock arrived after presented time');
      }
      for(const actor of actors.values()){
        if(actor.actionRecord&&(actor.actionProof.reference.worldBoundary.nativeSession!==message.nativeSession||actor.actionRecord.lastDrawTime!==null&&actor.actionRecord.lastDrawTime>message.committedThrough))throw Error('Invalid native action clock boundary');
        if(actor.settlementRecord&&(actor.settlementProof.reference.worldBoundary.nativeSession!==message.nativeSession||actor.settlementRecord.lastDrawTime!==null&&actor.settlementRecord.lastDrawTime>message.committedThrough))throw Error('Invalid native settlement clock boundary');
        if(actor.initialIdleBodyRecord&&(actor.initialIdleBodyProof.reference.worldBoundary.nativeSession!==message.nativeSession||actor.initialIdleBodyRecord.lastDrawTime!==null&&actor.initialIdleBodyRecord.lastDrawTime>message.committedThrough))throw Error('Invalid native initial Idle body clock boundary');
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
      record.safeUntil=record.lastDrawTime??record.startTime;active.clear();for(const actor of actors.values()){if(actor.actionRecord)actor.actionRecord.safeUntil=actor.actionRecord.lastDrawTime??actor.actionRecord.startTime;if(actor.settlementRecord)actor.settlementRecord.safeUntil=actor.settlementRecord.lastDrawTime??actor.settlementRecord.startTime;if(actor.initialIdleBodyRecord)actor.initialIdleBodyRecord.safeUntil=actor.initialIdleBodyRecord.lastDrawTime??actor.initialIdleBodyRecord.startTime;actor.closed=true;}actors.clear();},
  };
}
