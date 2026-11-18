import {copyNativeIdleStrollReference,copyNativeIdleStrollAttestation,nativeIdleStrollContinuesNext,nativeIdleStrollArrivalSourceMatches,nativeIdleStrollAttestationCovers,sameNativeIdleStrollAttestation} from '../world/native-idle-stroll.js';
import {copyNativeIdleStrollRequestReference,sameNativeIdleStrollRequestReference} from '../world/native-idle-stroll-request-reference.js';
import {copyNativeFarmArrivalRouteReference,copyNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteAttestation,nativeFarmArrivalRouteAttestationCovers} from '../world/native-farm-arrival-route.js';
import {copyNativeFarmArrivalRequestReference,sameNativeFarmArrivalRequestReference} from '../world/native-farm-arrival-request-reference.js';
import {nativeIdleCycleBodyState} from '../world/native-idle-cycle-body-source.js';
import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
import {copyNativeHomeRouteReference,copyNativeHomeRouteAttestation,nativeHomeRouteAttestationCovers,sameNativeHomeRouteReference} from '../world/native-home-route.js';
import {sameNativeTaskSettlementReference} from '../world/native-task-settlement.js';
import {copyNativeHomeRequestReference,sameNativeHomeRequestReference,nativeHomeRequestContinuesIdle,nativeHomeRequestContinuesInitialIdle,nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesHeldWorker} from '../world/native-home-request-reference.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from '../world/native-initial-idle-request-reference.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyAttestation,nativeInitialIdleBodyAttestationCovers} from '../world/native-initial-idle-body.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleAttestation,copyNativeIdleCycleNextRequest,sameNativeIdleCycleAttestation,nativeIdleCycleAttestationCovers} from '../world/native-idle-cycle.js';
import {copyNativeTaskRequestReference,nativeTaskRequestMatchesStart} from '../world/native-task-request-reference.js';
import {copyNativeTaskStartReference} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation,nativeTaskStartAttestationCovers} from '../world/native-task-start-attestation.js';
import {copyNativeResumeAttestation,nativeResumeAttestationCovers} from '../world/native-resume-attestation.js';
import {copyNativeResumeReference,sameNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,sameNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec,NATIVE_STOP_POSE_FIELDS} from '../world/native-worker-route-stop-codec.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyNativeTaskActionReference,nativeTaskActionActor} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionRestoreReference,sameNativeTaskActionRestoreReference} from '../world/native-task-action-restore-reference.js';
import {copyNativeTaskActionAttestation,nativeTaskActionAttestationCovers} from '../world/native-task-action-attestation.js';
import {sameNativeTaskActionReference} from '../world/native-task-action-presentation.js';
import {copyNativeTaskConsequenceReference,copyNativeTaskConsequenceAttestation,nativeTaskConsequenceAttestationCovers} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementAttestation,nativeTaskSettlementAttestationCovers} from '../world/native-task-settlement.js';

const strollStopFamily=Object.freeze({codec:nativeIdleStrollStopCodec,admitted:'strollAdmitted',issued:'issuedStroll',proof:'strollProof',name:'stroll',errorCode:'native-stroll-stop-admission-obsolete'});
const farmStopFamily=Object.freeze({codec:nativeFarmArrivalStopCodec,admitted:'farmArrivalAdmitted',issued:'issuedFarmArrival',proof:'farmArrivalProof',name:'farm arrival',errorCode:'native-farm-arrival-stop-admission-obsolete'});

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
export function createNativeRouteControl({authorityEpoch,initialSequence=0,initialTime=null,routes=[],pendingTaskRequests=[],pendingActionRequests=[],pendingHomeRequests=[],pendingInitialIdleRequests=[],pendingIdleStrollRequests=[],pendingFarmArrivalRequests=[],nativeIdleCycles=[],pendingIdleCycleRequests=[]}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0||
     initialTime!==null&&(!Number.isFinite(initialTime)||initialTime<0)||!Array.isArray(routes)||!Array.isArray(pendingTaskRequests)||!Array.isArray(pendingActionRequests)||!Array.isArray(pendingHomeRequests)||!Array.isArray(pendingInitialIdleRequests)||!Array.isArray(pendingIdleStrollRequests)||!Array.isArray(pendingFarmArrivalRequests)||!Array.isArray(nativeIdleCycles)||!Array.isArray(pendingIdleCycleRequests))
    throw TypeError('Invalid native route control identity');
  const active=new Map(),actors=new Map();
  const actorContext=(actorId,register=true)=>{let value=actors.get(actorId);if(!value){value={closed:false,latestSequence:0,state:null,taskId:null,targetId:null,current:null,revoked:null,proof:null,resumeProof:null,startProof:null,consequenceProof:null,homeProof:null,strollProof:null,farmArrivalProof:null,settlementProof:null,settlementRecord:null,settlementSource:null,initialIdleBodyProof:null,initialIdleBodyRecord:null,initialIdleBodySource:null,idleCycleProof:null,idleCycleRecord:null,idleCycleSource:null,pendingIdleCycleRequest:null,pendingIdleStrollRequest:null,pendingFarmArrivalRequest:null,pendingTaskRequest:null,pendingActionRequest:null,pendingHomeRequest:null,pendingInitialIdleRequest:null,actionSourceRequest:null,actionProof:null,actionRecord:null};if(register)actors.set(actorId,value);}return value;};
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
  const strollBodies=new Set();
  for(const input of pendingIdleStrollRequests){const request=copyNativeIdleStrollRequestReference(input);
    if(actors.has(request.actorId)||strollBodies.has(request.bodyId)||assignments.has(request.requestSequence)||request.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending restored stroll baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingIdleStrollRequest=request;assignments.add(request.requestSequence);strollBodies.add(request.bodyId);
  }
  // Pending arrivals are metadata in the same actor slot, never route records.
  for(const input of pendingFarmArrivalRequests){const request=copyNativeFarmArrivalRequestReference(input);
    if(actors.has(request.actorId)||strollBodies.has(request.bodyId)||[...actors.values()].some(actor=>[actor.pendingHomeRequest,actor.pendingInitialIdleRequest].some(q=>q?.bodyId===request.bodyId))||assignments.has(request.requestSequence)||request.authorityEpoch!==authorityEpoch||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending farm arrival baseline');
    const actor=actorContext(request.actorId);actor.state=6;actor.latestSequence=request.requestSequence;actor.pendingFarmArrivalRequest=request;assignments.add(request.requestSequence);strollBodies.add(request.bodyId);
  }
  const cycleBodies=new Set(strollBodies);
  for(const input of nativeIdleCycles){const binding=copyNativeIdleCycleAttestation(input),r=binding.reference;
    if(actors.has(r.actorId)||cycleBodies.has(r.bodyId)||assignments.has(binding.cycleSequence)||r.worldBoundary.authorityEpoch!==authorityEpoch||binding.cycleSequence>initialSequence||r.sourceControlSequence!==binding.cycleSequence-1||initialTime===null||r.worldBoundary.effectiveTime>initialTime)throw TypeError('Invalid native Idle cycle baseline');
    const actor=actorContext(r.actorId);actor.state=7;actor.latestSequence=binding.cycleSequence;actor.idleCycleSource={binding,fromBaseline:true,phaseUntil:Infinity};cycleBodies.add(r.bodyId);assignments.add(binding.cycleSequence);
  }
  for(const input of pendingIdleCycleRequests){const request=copyNativeIdleCycleNextRequest(input),actor=actors.get(request.sourceCycle.reference.actorId);
    if(!actor||actor.pendingIdleCycleRequest||!sameNativeIdleCycleAttestation(actor.idleCycleSource?.binding,request.sourceCycle)||assignments.has(request.requestSequence)||request.requestSequence>initialSequence||initialTime===null||request.requestedAt>initialTime)throw TypeError('Invalid native pending Idle cycle baseline');
    actor.pendingIdleCycleRequest=request;actor.latestSequence=request.requestSequence;assignments.add(request.requestSequence);
  }
  let sequence=initialSequence,effectiveTime=initialTime??-Infinity,closed=false,clock=null;
  const counters={accepted:0,revoked:0,oldEpoch:0,admissions:0};
  const homeRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&sameNativeHomeRequestReference(actor.pendingHomeRequest,request);
  const initialIdleRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingInitialIdleRequest===request;
  const idleStrollRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingIdleStrollRequest===request;
  const farmArrivalRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingFarmArrivalRequest===request;
  const strollSelectedSourceMatches=(reference,next,request)=>reference.sourceRequest?sameNativeIdleStrollRequestReference(reference.sourceRequest,request):nativeIdleStrollContinuesNext(reference,next);
  const strollIssuedSourceMatches=(reference,record)=>reference.sourceRequest?sameNativeIdleStrollRequestReference(reference.sourceRequest,record.sourceStrollRequest):record.sourceIdleCycleAdmitted&&nativeIdleStrollContinuesNext(reference,record.sourceIdleCycleNext);
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
    const farmArrival=event.nativeFarmArrival===undefined?null:copyNativeFarmArrivalRouteAttestation(event.nativeFarmArrival);
    if(farmArrival&&(event.type!=='RouteAssigned'||event.state!==1||revoked||event.taskId||event.targetId||[event.taskRequest,event.actionRequest,event.homeRequest,event.initialIdleRequest,event.idleStrollRequest,event.farmArrivalRequest,event.idleCycle,event.idleCycleNext,event.nativeIdleStroll].some(v=>v!==undefined&&v!==null)||farmArrival.reference.actorId!==event.actorId||farmArrival.assignmentSequence!==event.sequence||farmArrival.reference.sourceControlSequence!==event.sequence-1||farmArrival.reference.worldBoundary.authorityEpoch!==authorityEpoch||farmArrival.reference.worldBoundary.effectiveTime!==event.effectiveTime||!sameHandle(farmArrival.reference.expectedRouteHandle,handle)))throw Error('Native farm arrival event conflicts with its issued assignment');
    const stroll=event.nativeIdleStroll?copyNativeIdleStrollAttestation(event.nativeIdleStroll):null;
    if(stroll&&(!assigned||event.state!==1||event.taskId||event.targetId||event.taskRequest||event.actionRequest||event.homeRequest||event.initialIdleRequest||event.idleStrollRequest||event.farmArrivalRequest||event.idleCycle||event.idleCycleNext||stroll.reference.actorId!==event.actorId||stroll.assignmentSequence!==event.sequence||stroll.reference.sourceControlSequence!==event.sequence-1||stroll.reference.worldBoundary.authorityEpoch!==authorityEpoch||stroll.reference.worldBoundary.effectiveTime!==event.effectiveTime||!sameHandle(stroll.reference.expectedRouteHandle,handle)))throw Error('Native Idle stroll event conflicts with its issued assignment');
    const taskRequest=event.state===6&&event.taskRequest?copyNativeTaskRequestReference(event.taskRequest):null;
    const actionRequest=event.state===6&&event.actionRequest?copyNativeTaskActionRestoreReference(event.actionRequest):null;
    const homeRequest=event.state===6&&event.homeRequest?copyNativeHomeRequestReference(event.homeRequest):null;
    const initialIdleRequest=event.state===6&&event.initialIdleRequest?copyNativeInitialIdleRequestReference(event.initialIdleRequest):null;
    const idleStrollRequest=event.state===6&&event.idleStrollRequest?copyNativeIdleStrollRequestReference(event.idleStrollRequest):null;
    const farmArrivalRequest=event.state===6&&event.farmArrivalRequest?copyNativeFarmArrivalRequestReference(event.farmArrivalRequest):null;
    if(event.farmArrivalRequest&&!farmArrivalRequest||farmArrivalRequest&&(event.type!=='IntentChanged'||handle||revoked||taskRequest||actionRequest||homeRequest||initialIdleRequest||idleStrollRequest||event.idleCycle||event.idleCycleNext||farmArrivalRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||farmArrivalRequest.requestSequence!==event.sequence||farmArrivalRequest.requestedAt!==event.effectiveTime||farmArrivalRequest.authorityEpoch!==authorityEpoch||clock&&farmArrivalRequest.nativeSession!==clock.nativeSession))throw Error('Native farm arrival request event identity mismatch');
    if(event.idleStrollRequest&&!idleStrollRequest||idleStrollRequest&&(event.type!=='IntentChanged'||handle||revoked||taskRequest||actionRequest||homeRequest||initialIdleRequest||event.idleCycle||event.idleCycleNext||idleStrollRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||idleStrollRequest.requestSequence!==event.sequence||idleStrollRequest.requestedAt!==event.effectiveTime||idleStrollRequest.authorityEpoch!==authorityEpoch||clock&&idleStrollRequest.nativeSession!==clock.nativeSession))throw Error('Native restored stroll request event identity mismatch');
    if(event.initialIdleRequest&&!initialIdleRequest||initialIdleRequest&&(event.type!=='IntentChanged'||handle||revoked||taskRequest||actionRequest||homeRequest||initialIdleRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||initialIdleRequest.requestSequence!==event.sequence||initialIdleRequest.requestedAt!==event.effectiveTime||initialIdleRequest.authorityEpoch!==authorityEpoch||clock&&initialIdleRequest.nativeSession!==clock.nativeSession))throw Error('Native initial Idle request event identity mismatch');
    if(event.homeRequest&&!homeRequest||homeRequest&&(taskRequest||actionRequest||homeRequest.actorId!==event.actorId||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||homeRequest.requestSequence!==event.sequence||homeRequest.requestedAt!==event.effectiveTime||homeRequest.authorityEpoch!==authorityEpoch||clock&&homeRequest.nativeSession!==clock.nativeSession))throw Error('Native Home request event identity mismatch');
    if(event.actionRequest&&!actionRequest||taskRequest&&actionRequest||actionRequest&&(actionRequest.actorId!==event.actorId||actionRequest.taskId!==event.taskId||actionRequest.targetId!==event.targetId||actionRequest.requestSequence!==event.sequence||actionRequest.requestedAt!==event.effectiveTime||actionRequest.authorityEpoch!==authorityEpoch||clock&&actionRequest.nativeSession!==clock.nativeSession))throw Error('Native action request event identity mismatch');
    if(taskRequest&&(taskRequest.actorId!==event.actorId||taskRequest.taskId!==event.taskId||taskRequest.targetId!==event.targetId||taskRequest.requestSequence!==event.sequence||taskRequest.requestedAt!==event.effectiveTime||taskRequest.requestHandle.authorityEpoch!==authorityEpoch||clock&&taskRequest.requestHandle.session!==clock.nativeSession))throw Error('Native request event identity mismatch');
    const idleCycle=event.idleCycle===undefined?null:copyNativeIdleCycleAttestation(event.idleCycle),idleCycleNext=event.idleCycleNext===undefined?null:copyNativeIdleCycleNextRequest(event.idleCycleNext);
    const cycleFromStroll=!!idleCycle&&idleCycle.reference.sourceCycleSequence===0&&idleCycle.reference.sourceBody.kind==='native-idle-stroll-arrival-source';
    if((idleCycle||idleCycleNext)&&(event.type!==(cycleFromStroll?'RouteCompleted':'IntentChanged')||event.state!==7||handle||(cycleFromStroll?!revoked:!!revoked)||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||event.taskRequest||event.actionRequest||event.homeRequest||event.initialIdleRequest||event.idleStrollRequest||event.farmArrivalRequest||idleCycle&&idleCycleNext))throw Error('Native Idle cycle event conflicts with another owner');
    if(idleCycle&&(idleCycle.reference.actorId!==event.actorId||idleCycle.cycleSequence!==event.sequence||idleCycle.reference.sourceControlSequence!==event.sequence-1||idleCycle.reference.worldBoundary.effectiveTime!==event.effectiveTime||idleCycle.reference.worldBoundary.authorityEpoch!==authorityEpoch||clock&&idleCycle.reference.worldBoundary.nativeSession!==clock.nativeSession))throw Error('Native Idle cycle acquisition identity mismatch');
    if(idleCycleNext&&(idleCycleNext.sourceCycle.reference.actorId!==event.actorId||idleCycleNext.requestSequence!==event.sequence||idleCycleNext.requestedAt!==event.effectiveTime||idleCycleNext.sourceCycle.reference.worldBoundary.authorityEpoch!==authorityEpoch||clock&&idleCycleNext.sourceCycle.reference.worldBoundary.nativeSession!==clock.nativeSession))throw Error('Native Idle cycle successor identity mismatch');
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
    const actor=assigned||event.type==='IntentChanged'&&event.state===6?actorContext(event.actorId,false):actors.get(event.actorId);
    if(farmArrivalRequest&&(current||actor.closed||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingFarmArrivalRequest||actor.pendingIdleStrollRequest||actor.pendingInitialIdleRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.idleCycleSource||actor.strollProof||actor.revoked||actor.initialIdleBodySource||actor.settlementSource||actor.actionProof))throw Error('Native farm arrival request cannot replace an existing owner');
    if(farmArrivalRequest&&[...actors.values()].some(other=>other!==actor&&[other.pendingFarmArrivalRequest,other.pendingInitialIdleRequest,other.pendingIdleStrollRequest,other.pendingHomeRequest,other.idleCycleSource?.binding.reference].some(q=>q?.bodyId===farmArrivalRequest.bodyId)))throw Error('Native farm arrival request aliases an existing body');
    // Route acquisition, Idle and Home from this source still require their
    // own prepared native/graphical handoff. A genuine pending Task may claim it.
    if(farmArrival&&(!actor||actor.closed||current||actor.state!==6||actor.latestSequence!==actor.pendingFarmArrivalRequest?.requestSequence||!sameNativeFarmArrivalRequestReference(farmArrival.reference.sourceRequest,actor.pendingFarmArrivalRequest)||!sameNativeFarmArrivalRequestReference(farmArrival.preparedReference.sourceRequest,actor.pendingFarmArrivalRequest)))throw Error('Native farm arrival acquisition lacks its exact pending source');
    // The ordered native log can revoke a moving Farm into its held state.
    // This closes the old lease; only exact stop installation grants a held one.
    const heldFarmRevocation=current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===4&&!assigned&&!handle&&!!revoked&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!homeRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.startTime&&event.effectiveTime<current.issuedFarmArrival.reference.endTime;
    const completedFarmTask=!!current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!taskRequest&&!actionRequest&&!homeRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedFarmArrival.reference.endTime&&taskRequest.requestSequence>current.assignmentSequence;
    const completedFarmHome=!!current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!homeRequest&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedFarmArrival.reference.endTime&&completedFarmHomeRequestMatches(homeRequest,current);
    const completedFarmGoal=completedFarmTask||completedFarmHome;
    if(current?.issuedFarmArrival&&!heldFarmRevocation&&!completedFarmGoal)throw Error('Native farm arrival transition requires prepared lifecycle');
    if(actor?.pendingFarmArrivalRequest&&!farmArrival&&(assigned||handle||revoked||homeRequest||initialIdleRequest||idleStrollRequest||actionRequest||idleCycle||idleCycleNext||event.state===2||event.state===7||taskRequest&&event.type!=='IntentChanged'))throw Error('Native farm arrival transition requires prepared admission');
    if(stroll&&(!actor||current||(stroll.reference.sourceRequest?actor.state!==6||actor.latestSequence!==actor.pendingIdleStrollRequest?.requestSequence:actor.state!==7||!actor.idleCycleSource||actor.latestSequence!==actor.pendingIdleCycleRequest?.requestSequence)||!strollSelectedSourceMatches(stroll.reference,actor.pendingIdleCycleRequest,actor.pendingIdleStrollRequest)||!strollSelectedSourceMatches(stroll.preparedReference,actor.pendingIdleCycleRequest,actor.pendingIdleStrollRequest)))throw Error('Native Idle stroll acquisition lacks its exact selected cycle');
    if(assigned&&actor?.state===7&&actor.pendingIdleCycleRequest?.idleState.mode==='walk'&&!event.taskId&&!event.targetId&&!stroll)throw Error('Native Idle stroll acquisition omitted its typed source');
    if(assigned&&actor?.pendingIdleStrollRequest&&!event.taskId&&!event.targetId&&!stroll)throw Error('Native restored stroll acquisition omitted its typed source');
    if(idleStrollRequest&&(current||actor.closed||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingIdleStrollRequest||actor.pendingInitialIdleRequest||actor.pendingFarmArrivalRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.idleCycleSource||actor.strollProof||actor.revoked||actor.initialIdleBodySource||actor.settlementSource||actor.actionProof))throw Error('Native restored stroll request cannot replace an existing owner');
    if(homeRequest&&actor?.pendingIdleStrollRequest){const q=actor.pendingIdleStrollRequest;if(!['authorityEpoch','nativeSession','actorId','bodyId','bodyFlags','profile'].every(k=>homeRequest[k]===q[k])||homeRequest.requestSequence<=q.requestSequence||homeRequest.requestedAt<q.requestedAt||Object.keys(q.pose).some(k=>homeRequest.pose[k]!==q.pose[k]))throw Error('Native Home differs from its pending restored stroll body');}
    if(current?.issuedStroll&&event.type==='RouteCompleted'&&event.state===7&&!idleCycle)throw Error('Native Idle stroll completion omitted its stationary source');
    if(idleCycle&&(!actor||!cyclePreparationSourceMatches(idleCycle.reference,actor)))throw Error('Native Idle cycle acquisition has no exact admitted body source');
    if(idleCycleNext&&(!actor||actor.state!==7||actor.pendingIdleCycleRequest||!sameNativeIdleCycleAttestation(actor.idleCycleSource?.binding,idleCycleNext.sourceCycle)||actor.latestSequence!==idleCycleNext.sourceCycle.cycleSequence))throw Error('Native Idle cycle successor has no current native cycle');
    if(actor?.idleCycleSource&&event.type==='IntentChanged'&&event.state===7&&!idleCycle&&!idleCycleNext)throw Error('Native Idle cycle event omitted its typed source');
    const stoppedRouteSourceRequired=!!actor?.stoppedProjection||!current&&actor?.revoked?.revokedState===4&&!!(actor.revoked.issuedStroll||actor.revoked.issuedFarmArrival);
    const heldHomeSource=homeRequest&&actor?.stoppedProjection?stoppedHomeSource(actor):null;
    if(homeRequest&&stoppedRouteSourceRequired&&(!heldHomeSource||!nativeHomeRequestContinuesHeldWorker(homeRequest,heldHomeSource)))throw Error('Native Home differs from its actual stopped worker body');
    const heldTaskSource=taskRequest?stoppedHomeSource(actor):null;
    if(taskRequest&&stoppedRouteSourceRequired&&!heldTaskSource)throw Error('Native task request lacks its actual stopped worker body');
    const keepStoppedBody=!!(heldHomeSource||heldTaskSource)&&!current&&event.type==='IntentChanged'&&event.state===6;
    const keepIdleCycle=!!actor?.idleCycleSource&&!current&&event.type==='IntentChanged'&&(!!idleCycleNext||event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state));
    if(keepIdleCycle&&homeRequest&&!cycleHomeMatches(homeRequest,actor.idleCycleSource.binding))throw Error('Native Home differs from its held Idle cycle body');
    if(actor?.idleCycleRecord?.lastDrawTime!=null&&event.effectiveTime<actor.idleCycleRecord.lastDrawTime){const error=Error('Native Idle cycle revocation arrived after its presented time');error.code='native-idle-cycle-revocation-late';throw error;}
    if(initialIdleRequest&&(current||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingInitialIdleRequest||actor.pendingIdleStrollRequest||actor.pendingFarmArrivalRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.proof||actor.startProof||actor.actionProof||actor.consequenceProof||actor.settlementProof||actor.settlementSource||actor.homeProof||actor.initialIdleBodyProof||actor.initialIdleBodySource))throw Error('Native initial Idle request cannot replace an existing owner');
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
    const sourceStoppedTaskBody=assigned&&actor?.proof&&stoppedTaskCurrent(actor,actor.revoked,actor.proof)?actor.proof:null;
    const sourceCompletedFarm=assigned?(completedFarmGoalRecord(actor)?.issuedFarmArrival??null):null;
    if(actor&&!actors.has(event.actorId))actors.set(event.actorId,actor);
    if(current&&revoked){
      current.revokedSequence=event.sequence;current.revokedState=Number.isInteger(event.state)?event.state:null;
      if(actor){actor.revoked=current;actor.current=null;actor.proof=null;}
      current.safeUntil=Math.min(current.safeUntil,completedFarmGoal?current.issuedFarmArrival.reference.endTime:event.effectiveTime);
      active.delete(event.actorId);counters.revoked++;
    }
    const sourceHome=assigned&&actor?.settlementProof?.reference.home&&settlementCurrent(actor.settlementProof.reference,actor)?actor.settlementProof:null,sourceTaskRequest=assigned?actor?.pendingTaskRequest??null:null,sourceAction=assigned&&actor?.actionProof&&actionCurrent(actor.actionProof.reference,actor)?actor.actionProof:null;
    if(assigned){const record={actorId:event.actorId,handle:Object.freeze({...handle}),
      assignmentSequence:event.sequence,startTime:event.effectiveTime,
      safeUntil:Infinity,lastDrawTime:null,actor,sourceSuspension,sourceStoppedTaskBody,sourceCompletedFarm,sourceTaskRequest,sourceAction,sourceHome,sourceHomeRequest:actor?.pendingHomeRequest??null,sourceInitialIdleBody:actor?.initialIdleBodySource?.request??null,sourceIdleCycle:actor?.idleCycleSource?.binding??null,sourceIdleCycleNext:actor?.pendingIdleCycleRequest??null,sourceStrollRequest:actor?.pendingIdleStrollRequest??null,sourceFarmArrivalRequest:actor?.pendingFarmArrivalRequest??null,issuedFarmArrival:farmArrival,sourceIdleCycleAdmitted:!!actor?.idleCycleProof&&cycleRecordCurrent(actor.idleCycleProof.reference,actor),issuedStroll:stroll};active.set(event.actorId,record);actor.current=record;actor.proof=null;}
    if(actor){
      if(keepStoppedBody){actor.revoked.stoppedHomeRequest=homeRequest;actor.revoked.stoppedTaskRequest=taskRequest;}
      if(!keepIdleCycle){if(actor.idleCycleRecord)actor.idleCycleRecord.safeUntil=Math.min(actor.idleCycleRecord.safeUntil,event.effectiveTime);actor.idleCycleProof=null;actor.idleCycleRecord=null;actor.idleCycleSource=idleCycle?{binding:idleCycle,fromBaseline:false,phaseUntil:Infinity}:null;actor.pendingIdleCycleRequest=null;}
      else if(event.state===6){actor.idleCycleSource.phaseUntil=Math.min(actor.idleCycleSource.phaseUntil,event.effectiveTime);if(actor.idleCycleRecord)actor.idleCycleRecord.phaseUntil=Math.min(actor.idleCycleRecord.phaseUntil,event.effectiveTime);}
      if(idleCycleNext)actor.pendingIdleCycleRequest=idleCycleNext;
      if(!keepInitialBody){if(actor.initialIdleBodyRecord)actor.initialIdleBodyRecord.safeUntil=Math.min(actor.initialIdleBodyRecord.safeUntil,event.effectiveTime);actor.initialIdleBodyProof=null;actor.initialIdleBodyRecord=null;actor.initialIdleBodySource=completedInitialBody;}
      if(!keepSettlement){if(actor.settlementRecord)actor.settlementRecord.safeUntil=Math.min(actor.settlementRecord.safeUntil,event.effectiveTime);actor.settlementProof=null;actor.settlementRecord=null;actor.settlementSource=event.type==='RouteCompleted'&&event.state===7&&retiringCarry?{proof:retiringCarry,record:current}:null;}
      if(actor.actionRecord)actor.actionRecord.safeUntil=Math.min(actor.actionRecord.safeUntil,event.effectiveTime);actor.actionSourceRequest=event.state===2?actor.pendingActionRequest:null;actor.pendingActionRequest=actionRequest;actor.actionProof=null;actor.actionRecord=null;actor.startProof=null;actor.consequenceProof=null;actor.homeProof=null;actor.strollProof=null;if(!completedFarmGoal)actor.farmArrivalProof=null;actor.pendingTaskRequest=taskRequest;actor.resumeProof=null;if(!keepStoppedBody)actor.stoppedProjection=null;actor.latestSequence=event.sequence;actor.state=assigned?1:Number.isInteger(event.state)?event.state:null;
      // NeedsPlan retains its existing intent and revoked record, never a draw clock.
      if(!actor.current&&actor.state!==0&&actor.state!==2&&actor.state!==4&&actor.state!==6&&actor.state!==7){actor.closed=true;actors.delete(event.actorId);}}
    if(actor){actor.pendingHomeRequest=homeRequest;actor.pendingInitialIdleRequest=initialIdleRequest;actor.pendingIdleStrollRequest=idleStrollRequest;actor.pendingFarmArrivalRequest=farmArrivalRequest;actor.taskId=event.taskId??null;actor.targetId=event.targetId??null;}
    sequence=event.sequence;effectiveTime=event.effectiveTime;counters.accepted++;
    return true;
  }
  function suspendedCurrent(reference,record,actor){
    return !closed&&!!clock&&!actor.closed&&actors.get(reference.nativeRoute.actorId)===actor&&
      actor.current===null&&actor.state===4&&actor.revoked===record&&record.revokedState===4&&
      actor.latestSequence===record.revokedSequence&&record.safeUntil===reference.suspendedAt&&
      sameNativeSuspendedBodyReference(actor.proof,reference);
  }
  const stopBody=(reference,owner)=>copyNativeSuspendedBodyReference({kind:'native-suspended-body',version:1,nativeRoute:owner.nativeRoute,worldBoundary:reference.worldBoundary,bodyId:owner.bodyId,resumeGeneration:owner.resumeGeneration,suspendedAt:reference.worldBoundary.effectiveTime});
  function stoppedRecordCurrent(owner,boundary,actor,record){
    return !closed&&!!clock&&!!actor&&!!record&&!actor.closed&&actors.get(owner.nativeRoute.actorId)===actor&&actor.current===null&&actor.state===owner.state&&actor.revoked===record&&record.revokedState===owner.state&&actor.latestSequence===record.revokedSequence&&actor.latestSequence<=clock.intentSequence&&record.safeUntil===boundary.effectiveTime&&matches(record,owner.nativeRoute);
  }
  // A child request retains the installed allocation, including family and
  // generation. Each child links its own typed source and final native pose.
  function stoppedWorkerSource(actor,family){
    const record=actor?.revoked,proof=record?.stopProof,source=record?.[family.issued],body=actor?.proof;
    if(proof?.kind!==family.codec.attestationKind||!record?.[family.admitted]||!source||!body||actor.stoppedProjection?.proof!==proof||!matches(record,proof.reference.sourceRoute)||!matches(record,body.nativeRoute)||body.bodyId!==source.reference.bodyId||body.nativeRoute.assignmentSequence!==source.assignmentSequence)return null;
    const farm=family===farmStopFamily,radius=farm?source.reference.sourceRequest.pose.radius:source.reference.pose.radius;
    return {kind:farm?'native-farm-arrival-held-execution':'native-idle-stroll-held-execution',actorId:source.reference.actorId,bodyId:source.reference.bodyId,sourceReference:source.reference,assignmentSequence:source.assignmentSequence,resumeHandle:{...body.nativeRoute.routeHandle,generation:body.resumeGeneration},suspendedAt:body.suspendedAt,pose:actor.stoppedProjection.homePose(radius)};
  }
  function stoppedHomeSource(actor){return stoppedWorkerSource(actor,strollStopFamily)??stoppedWorkerSource(actor,farmStopFamily);}
  function stoppedHomeCurrent(actor,record,body){
    const request=record?.stoppedHomeRequest;
    return !!request&&!closed&&!!clock&&!actor.closed&&actors.get(request.actorId)===actor&&actor.current===null&&actor.revoked===record&&actor.state===6&&record.revokedState===4&&record.safeUntil===body.suspendedAt&&actor.latestSequence===request.requestSequence&&request.requestSequence<=clock.intentSequence&&actor.pendingHomeRequest===request&&sameNativeSuspendedBodyReference(actor.proof,body);
  }
  function stoppedTaskCurrent(actor,record,body){
    const request=record?.stoppedTaskRequest,h=body?.nativeRoute.routeHandle;
    return !!request&&!closed&&!!clock&&!actor.closed&&actors.get(request.actorId)===actor&&actor.current===null&&actor.revoked===record&&actor.state===6&&record.revokedState===4&&record.safeUntil===body.suspendedAt&&actor.latestSequence===request.requestSequence&&request.requestSequence<=clock.intentSequence&&request.requestSequence>record.revokedSequence&&request.requestedAt>=body.suspendedAt&&request.requestHandle.authorityEpoch===h.authorityEpoch&&request.requestHandle.session===h.session&&actor.pendingTaskRequest===request&&sameNativeSuspendedBodyReference(actor.proof,body);
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
  function strollRecordCurrent(reference,actor){const record=actor?.current,proof=actor?.strollProof;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&proof.assignmentSequence<=clock.intentSequence;}
  function completedFarmHomeRequestMatches(request,record){
    const r=record?.issuedFarmArrival?.reference,q=r?.sourceRequest;
    return !!q&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===q.profile&&request.pose.radius===q.pose.radius&&request.pose.x===r.destination.x&&request.pose.z===r.destination.z&&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>record.assignmentSequence&&request.requestedAt>=r.endTime;
  }
  // Reuse the revoked native record for one terminal body awaiting Task/Home.
  // Native ancestry bounds candidate body IDs even without old GPU admission;
  // only the previously installed proof may keep drawing the finite old data.
  function completedFarmGoalRecord(actor){
    const record=actor?.revoked,task=actor?.pendingTaskRequest,home=actor?.pendingHomeRequest,request=task??home,r=record?.issuedFarmArrival?.reference;
    return !closed&&!!r&&!!request&&!(task&&home)&&!actor.closed&&actors.get(r.actorId)===actor&&actor.current===null&&actor.state===6&&record.revokedState===6&&record.safeUntil===r.endTime&&actor.latestSequence===record.revokedSequence&&request.requestSequence===record.revokedSequence&&request.requestSequence>record.assignmentSequence&&request.requestedAt>=r.endTime&&request.actorId===r.actorId&&(task?request.requestHandle.authorityEpoch===r.worldBoundary.authorityEpoch&&request.requestHandle.session===r.worldBoundary.nativeSession:completedFarmHomeRequestMatches(home,record))?record:null;
  }
  function completedFarmGoalCurrent(reference,actor){
    const record=completedFarmGoalRecord(actor),proof=actor?.farmArrivalProof,request=actor?.pendingTaskRequest??actor?.pendingHomeRequest;
    return !!record&&!!clock&&record.farmArrivalAdmitted===true&&!!proof&&proof.assignmentSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&request.requestSequence<=clock.intentSequence&&request.requestedAt<=clock.committedThrough;
  }
  function farmArrivalRecordCurrent(reference,actor){const record=actor?.current,proof=actor?.farmArrivalProof;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&proof.assignmentSequence<=clock.intentSequence||completedFarmGoalCurrent(reference,actor);}
  function homeRecordCurrent(reference,actor){const record=actor?.current,proof=actor?.homeProof;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence;}
  function sameCarryProof(a,b){try{return JSON.stringify(copyNativeTaskConsequenceAttestation(a))===JSON.stringify(copyNativeTaskConsequenceAttestation(b));}catch{return false;}}
  // accept/install establish the immutable source match once; replay reads
  // the same installed proof and live request sequence without pose rescans.
  function settlementState(actor,proof){return actor.state===7&&actor.latestSequence===proof.settlementSequence||!proof.reference.home&&actor.state===6&&actor.latestSequence>proof.settlementSequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence&&(actor.settlementProof===proof||nativeHomeRequestContinuesIdle(actor.pendingHomeRequest,proof)));}
  function settlementRecordCurrent(reference,actor){const proof=actor?.settlementProof,record=actor?.settlementRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&record.settlementSequence===proof.settlementSequence&&settlementState(actor,proof);}
  function settlementCurrent(reference,actor){return settlementRecordCurrent(reference,actor)&&nativeTaskSettlementAttestationCovers(actor.settlementProof,reference);}
  function initialBodyState(actor,proof){return actor.state===7&&actor.latestSequence===proof.bodySequence||actor.state===6&&actor.latestSequence>proof.bodySequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence);}
  function initialBodyRecordCurrent(reference,actor){const proof=actor?.initialIdleBodyProof,record=actor?.initialIdleBodyRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&record.bodySequence===proof.bodySequence&&proof.bodySequence<=clock.intentSequence&&initialBodyState(actor,proof);}
  function cycleHomeMatches(request,proof){return nativeHomeRequestContinuesIdleCycle(request,proof);}
  function cycleState(actor,proof){return actor.state===7&&(actor.latestSequence===proof.cycleSequence||actor.pendingIdleCycleRequest?.sourceCycle.cycleSequence===proof.cycleSequence&&actor.latestSequence===actor.pendingIdleCycleRequest.requestSequence)||actor.state===6&&actor.latestSequence>proof.cycleSequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence);}
  function cycleRecordCurrent(reference,actor){const proof=actor?.idleCycleProof,record=actor?.idleCycleRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&actor.idleCycleSource?.binding===proof&&record.cycleSequence===proof.cycleSequence&&proof.cycleSequence<=clock.intentSequence&&cycleState(actor,proof);}
  function cyclePreparationSourceMatches(reference,actor){
    if(!actor||actor.closed)return false;
    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-arrival-source'){
      const proof=actor.strollProof;return !!proof&&strollRecordCurrent(proof.reference,actor)&&nativeIdleStrollArrivalSourceMatches(reference.sourceBody,proof)&&reference.worldBoundary.effectiveTime>=reference.sourceBody.sourceAt;
    }
    if(actor.current||actor.state!==7)return false;
    if(reference.sourceCycleSequence===0){const proof=actor.initialIdleBodyProof;return !!proof&&initialBodyRecordCurrent(proof.reference,actor)&&JSON.stringify(proof)===JSON.stringify(reference.sourceBody);}
    const proof=actor.idleCycleProof,request=actor.pendingIdleCycleRequest;
    return !!proof&&!!request&&cycleRecordCurrent(proof.reference,actor)&&proof.cycleSequence===reference.sourceCycleSequence&&actor.latestSequence===request.requestSequence&&request.idleState.mode==='rest'&&JSON.stringify(request.idleState)===JSON.stringify(reference.initialState)&&JSON.stringify(proof.reference.sourceBody)===JSON.stringify(reference.sourceBody);
  }
  // Immutable proof associations are checked once per installation. Every replay still
  // checks the live owner, sequence, state and route; revocation clears the proof.
  function proofLeaseCurrent(reference,actor,field,covers,recordCurrent){let observedProof=null,matchesProof=false;return ()=>{const proof=actor?.[field]??null;if(proof!==observedProof){observedProof=proof;matchesProof=!!proof&&covers(proof,reference);}return matchesProof&&recordCurrent(reference,actor);};}
  function installRouteStops(family,boundary,values=[],{bootstrap=false}={}){
    boundary=copyNativeWorldBoundary(boundary);
    if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Invalid native moving stop attestation boundary');
    const staged=[],ids=new Set(),bodies=new Set();
    for(const input of values){const value=family.codec.copyAttestation(input),{projection,...metadata}=value,proof=Object.freeze(metadata),r=proof.reference,root=actors.get(r.sourceRoute.actorId),rootRecord=root?.revoked,sourceOwner=r.routes.find(owner=>owner.nativeRoute.actorId===r.sourceRoute.actorId);
      if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||!rootRecord?.[family.admitted]||!rootRecord[family.issued]||rootRecord[family.issued].reference.bodyId!==sourceOwner.bodyId||!matches(rootRecord,r.sourceRoute))throw Error(`Native moving stop lacks its admitted ${family.name} source`);
      for(let i=0;i<r.routes.length;i++){const owner=r.routes[i],actor=actors.get(owner.nativeRoute.actorId),record=actor?.revoked;
        if(ids.has(owner.nativeRoute.actorId)||bodies.has(owner.bodyId)||!stoppedRecordCurrent(owner,boundary,actor,record)||record.stopProof||proof.preparedReference.worldBoundary.effectiveTime<record.startTime)throw Error('Native moving stop differs from its exact revocations');
        const reference=owner.state===4?stopBody(r,owner):null;
        if(actor.proof&&(reference===null||!sameNativeSuspendedBodyReference(actor.proof,reference)))throw Error('Native moving stop changed an installed body proof');
        ids.add(owner.nativeRoute.actorId);bodies.add(owner.bodyId);staged.push({actor,record,proof,reference,pose:projection?projection.routeEffects.rows.slice(i*26+8,(i+1)*26):null});
      }
    }
    // All validation precedes every write, including a bad later proof.
    for(const {actor,record,proof,reference,pose} of staged){record.stopProof=proof;actor.proof=reference;actor.stoppedProjection=pose?Object.freeze({proof,read(field){if(!Object.hasOwn(NATIVE_STOP_POSE_FIELDS,field))throw TypeError('Invalid native stopped pose field');return pose[NATIVE_STOP_POSE_FIELDS[field]];},homePose(radius){return Object.freeze({x:pose[0],z:pose[1],yaw:pose[4],radius,runPhase:pose[9],walkPhase:pose[10],carryPhase:pose[11],runRemaining:pose[14]});}}):null;}
    return staged.length;
  }
  function admitRouteStop(family,value,{preparingWorldBoundary=null}={}){
    const reference=family.codec.copyReference(value),boundary=copyNativeWorldBoundary(preparingWorldBoundary),root=actors.get(reference.sourceRoute.actorId),rootRecord=root?.current??root?.revoked,
      owners=reference.routes.map(owner=>{const actor=actors.get(owner.nativeRoute.actorId);return {owner,actor,record:actor?.current??actor?.revoked};});
    const pending=()=>!closed&&!!clock&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&clock.committedThrough>=reference.worldBoundary.effectiveTime&&!!rootRecord?.[family.admitted]&&!!root?.[family.proof]&&(family===farmStopFamily?farmArrivalRecordCurrent:strollRecordCurrent)(root[family.proof].reference,root)&&owners.every(({owner,actor,record})=>!!actor&&!actor.closed&&actors.get(owner.nativeRoute.actorId)===actor&&actor.current===record&&active.get(owner.nativeRoute.actorId)===record&&actor.state===1&&matches(record,owner.nativeRoute)&&record.startTime<=reference.worldBoundary.effectiveTime);
    let observed=null,covers=false,actualBodies=[];
    const current=()=>{const proof=rootRecord?.stopProof??null;if(proof!==observed){observed=proof;covers=!!proof&&family.codec.attestationCovers(proof,reference);actualBodies=covers?proof.reference.routes.map(owner=>owner.state===4?stopBody(proof.reference,owner):null):[];}
      return covers&&owners.every(({owner,actor,record},i)=>record?.stopProof===proof&&stoppedRecordCurrent(owner,proof.reference.worldBoundary,actor,record)&&(owner.state===4?suspendedCurrent(actualBodies[i],record,actor):actor.proof===null));};
    if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!matches(rootRecord,reference.sourceRoute)||!current()&&!pending()){const error=Error(`Native moving stop is obsolete or lacks its admitted ${family.name}`);error.code=family.errorCode;throw error;}
    counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get binding(){return current()?observed:null;}});
  }
  function admitRouteStoppedBody(family,value,{preparingWorldBoundary=null}={}){
    const reference=family.codec.copyStoppedBody(value),owner=reference.stop.routes.find(r=>r.nativeRoute.actorId===reference.actorId),actor=actors.get(reference.actorId),record=actor?.current??actor?.revoked;
    let observed=null,covers=false,body=null;
    const current=()=>{const proof=record?.stopProof??null;if(proof!==observed){observed=proof;covers=!!proof&&family.codec.attestationCovers(proof,reference.stop);body=covers?stopBody(proof.reference,owner):null;}
      return covers&&actor?.stoppedProjection?.proof===observed&&(stoppedRecordCurrent(owner,observed.reference.worldBoundary,actor,record)&&suspendedCurrent(body,record,actor)||stoppedHomeCurrent(actor,record,body)||stoppedTaskCurrent(actor,record,body));};
    const bundle=current()?null:admitRouteStop(family,reference.stop,{preparingWorldBoundary});
    const pending=()=>!!bundle&&bundle.isPrepared()&&actor?.current===record&&active.get(reference.actorId)===record&&actor.state===1&&matches(record,owner.nativeRoute);
    if(!current()&&!pending())throw Error('Native stopped body lacks its acquired final projection');
    return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get bodyReference(){return current()?body:null;},value(field){if(!current())throw Error('Native stopped body projection is obsolete');return field==='age'?observed.reference.worldBoundary.effectiveTime-record.startTime:actor.stoppedProjection.read(field);}});
  }
  return {
    // Metadata only. It cannot authorize drawing, movement or installation of
    // an executable binding and expires with the existing actor/control record.
    pendingInitialIdleRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingInitialIdleRequest;return request&&initialIdleRequestCurrent(request,actor)?request:null;},
    pendingFarmArrivalRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingFarmArrivalRequest;return request&&farmArrivalRequestCurrent(request,actor)?request:null;},
    pendingIdleStrollRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingIdleStrollRequest;return request&&idleStrollRequestCurrent(request,actor)?request:null;},
    pendingIdleCycleRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingIdleCycleRequest;return !closed&&!!clock&&!!request&&!actor.closed&&actor.state===7&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.requestSequence<=clock.intentSequence?request:null;},
    accept,
    installIdleCycles(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native Idle cycle requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeIdleCycleAttestation(input),r=value.reference,actor=actors.get(r.actorId),source=actor?.idleCycleSource;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.cycleSequence>sequence||value.cycleSequence>clock.intentSequence||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.current||actor.actionProof||actor.settlementProof||actor.initialIdleBodyProof||actor.idleCycleProof||!source||source.fromBaseline||!sameNativeIdleCycleAttestation(value,source.binding)||actor.latestSequence>clock.intentSequence||!cycleState(actor,value))throw Error('Native Idle cycle differs from its issued program or current owner');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,source});
      }
      for(const {actor,source} of staged){const value=source.binding,r=value.reference;actor.idleCycleProof=value;actor.idleCycleRecord={actorId:r.actorId,bodyId:r.bodyId,cycleSequence:value.cycleSequence,startTime:r.worldBoundary.effectiveTime,phaseUntil:Math.min(r.worldBoundary.effectiveTime+r.duration,source.phaseUntil),safeUntil:Infinity,lastDrawTime:null};}return staged.length;
    },
    admitIdleCycle(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeIdleCycleReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),fromStroll=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-arrival-source',source=reference.sourceCycleSequence?actor?.idleCycleProof:fromStroll?actor?.strollProof:actor?.initialIdleBodyProof,next=actor?.pendingIdleCycleRequest,sourceMatches=cyclePreparationSourceMatches(reference,actor),current=proofLeaseCurrent(reference,actor,'idleCycleProof',nativeIdleCycleAttestationCovers,cycleRecordCurrent);
      let observed=null,issuedMatches=false;
      const issued=()=>{const found=actor?.idleCycleSource??null;if(found!==observed){observed=found;issuedMatches=!!found&&!found.fromBaseline&&nativeIdleCycleAttestationCovers(found.binding,reference);}return issuedMatches&&!closed&&!!clock&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&cycleState(actor,observed.binding);};
      const pending=()=>sourceMatches&&!closed&&!!clock&&!actor.closed&&actors.get(reference.actorId)===actor&&(fromStroll?actor.strollProof===source&&cyclePreparationSourceMatches(reference,actor):actor.current===null&&actor.state===7&&(reference.sourceCycleSequence?actor.idleCycleProof===source&&actor.pendingIdleCycleRequest===next&&cycleRecordCurrent(source.reference,actor):actor.initialIdleBodyProof===source&&initialBodyRecordCurrent(source.reference,actor)))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&clock.intentSequence>=reference.sourceControlSequence&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native Idle cycle is obsolete or lacks its admitted source');error.code='native-idle-cycle-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get idleCycleRecord(){return current()?actor.idleCycleRecord:null;},get executionEpoch(){return current()?actor.idleCycleProof.reference.worldBoundary.effectiveTime:null;},get executionEnd(){return current()?actor.idleCycleRecord.phaseUntil:null;}});
    },
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
    installStrolls(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native Idle stroll requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeIdleStrollAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.assignmentSequence>sequence||value.assignmentSequence>clock.intentSequence||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.state!==1||active.get(r.actorId)!==record||!record||actor.latestSequence!==record.assignmentSequence||actor.strollProof||actor.proof||actor.startProof||actor.homeProof||actor.actionProof||actor.settlementProof||actor.idleCycleProof||record.assignmentSequence!==value.assignmentSequence||record.startTime!==boundary.effectiveTime||!sameHandle(record.handle,r.expectedRouteHandle)||!sameNativeIdleStrollAttestation(value,record.issuedStroll)||!strollIssuedSourceMatches(r,record)||!strollIssuedSourceMatches(value.preparedReference,record))throw Error('Native Idle stroll differs from its issued program or selected source');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged){actor.strollProof=value;actor.current.strollAdmitted=true;}return staged.length;
    },
    admitStroll(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeIdleStrollReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=reference.sourceRequest?actor?.pendingIdleStrollRequest:actor?.pendingIdleCycleRequest,
        current=proofLeaseCurrent(reference,actor,'strollProof',nativeIdleStrollAttestationCovers,strollRecordCurrent),
        pending=()=>!!source&&(reference.sourceRequest?idleStrollRequestCurrent(source,actor)&&sameNativeIdleStrollRequestReference(reference.sourceRequest,source):actor.pendingIdleCycleRequest===source&&!!actor.idleCycleProof&&cycleRecordCurrent(actor.idleCycleProof.reference,actor)&&nativeIdleStrollContinuesNext(reference,source))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime,
        issued=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===actor.current&&!!actor.current&&actor.latestSequence===actor.current.assignmentSequence&&actor.current.assignmentSequence>reference.sourceControlSequence&&sameHandle(actor.current.handle,reference.expectedRouteHandle)&&nativeIdleStrollAttestationCovers(actor.current.issuedStroll,reference)&&strollIssuedSourceMatches(reference,actor.current);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native Idle stroll is obsolete or lacks its direct selected source');error.code='native-idle-stroll-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.strollProof.reference.endTime:null;}});
    },
    installFarmArrivals(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native farm arrival requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeFarmArrivalRouteAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.assignmentSequence>sequence||value.assignmentSequence>clock.intentSequence||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.state!==1||active.get(r.actorId)!==record||!record||actor.latestSequence!==record.assignmentSequence||actor.farmArrivalProof||actor.strollProof||actor.proof||actor.startProof||actor.homeProof||actor.actionProof||actor.settlementProof||actor.idleCycleProof||record.assignmentSequence!==value.assignmentSequence||record.startTime!==boundary.effectiveTime||!sameHandle(record.handle,r.expectedRouteHandle)||!sameNativeFarmArrivalRouteAttestation(value,record.issuedFarmArrival)||!sameNativeFarmArrivalRequestReference(r.sourceRequest,record.sourceFarmArrivalRequest)||!sameNativeFarmArrivalRequestReference(value.preparedReference.sourceRequest,record.sourceFarmArrivalRequest))throw Error('Native farm arrival differs from its issued program or pending source');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged){actor.farmArrivalProof=value;actor.current.farmArrivalAdmitted=true;}return staged.length;
    },
    admitFarmArrival(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeFarmArrivalRouteReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=actor?.pendingFarmArrivalRequest,
        current=proofLeaseCurrent(reference,actor,'farmArrivalProof',nativeFarmArrivalRouteAttestationCovers,farmArrivalRecordCurrent),
        pending=()=>!!source&&farmArrivalRequestCurrent(source,actor)&&sameNativeFarmArrivalRequestReference(reference.sourceRequest,source)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime,
        issued=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===actor.current&&!!actor.current&&actor.latestSequence===actor.current.assignmentSequence&&nativeFarmArrivalRouteAttestationCovers(actor.current.issuedFarmArrival,reference)&&sameNativeFarmArrivalRequestReference(reference.sourceRequest,actor.current.sourceFarmArrivalRequest);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native farm arrival is obsolete or lacks its direct pending source');error.code='native-farm-arrival-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get routeRecord(){return current()?(actor.current??actor.revoked):null;},get executionEpoch(){return current()?(actor.current??actor.revoked).startTime:null;},get executionEnd(){return current()?actor.farmArrivalProof.reference.endTime:null;}});
    },
    installHomes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native Home boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeHomeRouteAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,w=r.worldBoundary;
        if(w.authorityEpoch!==authorityEpoch||w.nativeSession!==clock.nativeSession||w.effectiveTime>clock.committedThrough||boundary&&(w.ticket>boundary.ticket||w.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(w,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||record.issuedFarmArrival||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==w.effectiveTime||record.sourceCompletedFarm&&(r.bodyId!==record.sourceCompletedFarm.reference.bodyId||!sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest))||!bootstrap&&!(r.sourceRequest?sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest):sameSettlementProof(record.sourceHome,r.sourceSettlement)))throw Error('Native Home differs from its issued route or stationary body');
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
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||record.issuedFarmArrival||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==world.effectiveTime||!bootstrap&&!sameActionProof(record.sourceAction,r.sourceAction))throw Error('Native consequence differs from its issued route or action');
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
    startGateExecutionEpoch(gate){for(const actor of actors.values()){for(const [proof,current] of [[actor.startProof,startCurrent],[actor.consequenceProof,consequenceCurrent],[actor.homeProof,homeRecordCurrent],[actor.strollProof,strollRecordCurrent],[actor.farmArrivalProof,farmArrivalRecordCurrent]])if(proof&&current(proof.reference,actor)&&proof.gateIds.includes(gate.gateId)&&sameNativeWorldBoundary(proof.preparedReference.worldBoundary,gate.worldBoundary))return (actor.current??actor.revoked).startTime;}return null;},
    installStartedRoutes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native started route boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeTaskStartAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,world=r.worldBoundary;
        if(record?.sourceStoppedTaskBody&&r.bodyId!==record.sourceStoppedTaskBody.bodyId)throw Error('Native start differs from its stopped worker body');
        if(record?.sourceCompletedFarm&&r.bodyId!==record.sourceCompletedFarm.reference.bodyId)throw Error('Native start differs from its completed Farm body');
        if(record?.sourceInitialIdleBody&&r.bodyId!==record.sourceInitialIdleBody.bodyId)throw Error('Native start differs from its held initial Idle body');
        if(record?.sourceIdleCycle&&r.bodyId!==record.sourceIdleCycle.reference.bodyId)throw Error('Native start differs from its held Idle cycle body');
        if(world.authorityEpoch!==authorityEpoch||world.nativeSession!==clock.nativeSession||world.effectiveTime>clock.committedThrough||boundary&&(world.ticket>boundary.ticket||world.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(world,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||record.issuedFarmArrival||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==world.effectiveTime||!bootstrap&&!nativeTaskRequestMatchesStart(record.sourceTaskRequest,r))throw Error('Native start attestation differs from issued route or request');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.startProof=value;return staged.length;
    },
    admitStart(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskStartReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>startCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===6&&actor.latestSequence===reference.requestSequence&&nativeTaskRequestMatchesStart(actor.pendingTaskRequest,reference)&&(!actor.initialIdleBodySource||reference.bodyId===actor.initialIdleBodySource.request.bodyId)&&(!actor.idleCycleSource||reference.bodyId===actor.idleCycleSource.binding.reference.bodyId)&&(!actor.stoppedProjection||reference.bodyId===actor.proof?.bodyId)&&(!completedFarmGoalRecord(actor)||reference.bodyId===actor.revoked.issuedFarmArrival.reference.bodyId)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
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
    // Whole-stop preparation is metadata, never a legacy suspended-body clock.
    // Installation belongs exclusively to the direct authority's release.
    installStrollStops(boundary,values,options){return installRouteStops(strollStopFamily,boundary,values,options);},
    installFarmArrivalStops(boundary,values,options){return installRouteStops(farmStopFamily,boundary,values,options);},
    admitStrollStop(value,options){return admitRouteStop(strollStopFamily,value,options);},
    admitFarmArrivalStop(value,options){return admitRouteStop(farmStopFamily,value,options);},
    admitStoppedBody(value,options){return admitRouteStoppedBody(strollStopFamily,value,options);},
    admitFarmArrivalStoppedBody(value,options){return admitRouteStoppedBody(farmStopFamily,value,options);},
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
         if(actor.pendingFarmArrivalRequest&&actor.pendingFarmArrivalRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending farm arrival session');
         if(actor.pendingIdleStrollRequest&&actor.pendingIdleStrollRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending restored stroll session');
         if(actor.idleCycleSource&&(actor.idleCycleSource.binding.reference.worldBoundary.nativeSession!==message.nativeSession||actor.idleCycleSource.binding.cycleSequence>message.intentSequence||actor.idleCycleSource.binding.reference.worldBoundary.effectiveTime>message.committedThrough))throw Error('Invalid native Idle cycle clock session or acquisition');
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
        if(actor.idleCycleRecord&&actor.idleCycleRecord.lastDrawTime!==null&&actor.idleCycleRecord.lastDrawTime>message.committedThrough)throw Error('Invalid native Idle cycle clock boundary');
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
      if(record?.issuedFarmArrival)throw Error('Native farm arrival requires its typed prepared admission');
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
      record.safeUntil=record.lastDrawTime??record.startTime;active.clear();for(const actor of actors.values()){if(actor.actionRecord)actor.actionRecord.safeUntil=actor.actionRecord.lastDrawTime??actor.actionRecord.startTime;if(actor.settlementRecord)actor.settlementRecord.safeUntil=actor.settlementRecord.lastDrawTime??actor.settlementRecord.startTime;if(actor.initialIdleBodyRecord)actor.initialIdleBodyRecord.safeUntil=actor.initialIdleBodyRecord.lastDrawTime??actor.initialIdleBodyRecord.startTime;if(actor.idleCycleRecord)actor.idleCycleRecord.safeUntil=actor.idleCycleRecord.lastDrawTime??actor.idleCycleRecord.startTime;actor.closed=true;}actors.clear();},
  };
}
