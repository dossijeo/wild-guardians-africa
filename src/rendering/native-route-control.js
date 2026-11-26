import {copyNativeShieldCropStop,sameNativeShieldCropStop} from '../world/native-shield-world.js';
import {copyPendingAnimalCrop,animalCropMatchesRequest,copyNativeAnimalCropReference,copyNativeAnimalCropAttestation,sameNativeAnimalCropReference,sameRestoredAnimalStrike} from '../world/native-animal-crop-resource.js';
import {copyRestoredWallRepairDeclaration,restoredWallRepairKey} from '../world/restored-wall-repair-reference.js';
import {WALL_REPAIR_DURATION} from '../simulation/structure-presentation.js';
import {copyNativeStoppedGateSelector} from './native-stopped-clock.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollAttestation,nativeIdleStrollContinuesNext,nativeIdleStrollArrivalSourceMatches,nativeIdleStrollAttestationCovers,sameNativeIdleStrollAttestation} from '../world/native-idle-stroll.js';
import {copyNativeIdleStrollRequestReference,sameNativeIdleStrollRequestReference} from '../world/native-idle-stroll-request-reference.js';
import {nativeFarmArrivalContinuesHeld,copyNativeFarmArrivalRouteReference,copyNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteAttestation,nativeFarmArrivalRouteAttestationCovers} from '../world/native-farm-arrival-route.js';
import {copyNativeFarmArrivalRequestReference,sameNativeFarmArrivalRequestReference} from '../world/native-farm-arrival-request-reference.js';
import {floorFloat32} from './float32-time.js';
import {isNativeIdleStrollArrivalSource,nativeIdleCycleBodyState,nativeSettledIdleSourceMatches} from '../world/native-idle-cycle-body-source.js';
import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
import {copyNativeHomeRouteReference,copyNativeHomeRouteAttestation,nativeHomeRouteAttestationCovers,sameNativeHomeRouteReference} from '../world/native-home-route.js';
import {sameNativeTaskSettlementReference} from '../world/native-task-settlement.js';
import {copyNativeHomeRequestReference,sameNativeHomeRequestReference,nativeHomeRequestContinuesIdle,nativeHomeRequestContinuesInitialIdle,nativeHomeRequestContinuesFarmRequest,nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesHeldWorker,nativeHomeRequestContinuesRepairAction} from '../world/native-home-request-reference.js';
import {copyNativeInitialIdleRequestReference,sameNativeInitialIdleRequestReference} from '../world/native-initial-idle-request-reference.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyAttestation,nativeInitialIdleBodyAttestationCovers,nativeInitialIdleActionSource,nativeTaskCancellationMatchesAction,nativeTaskCancellationMatchesPendingAction,nativeTaskCancellationMatchesTerminalRoute,nativeTaskCancellationMatchesHeldRoute} from '../world/native-initial-idle-body.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleAttestation,copyNativeIdleCycleNextRequest,sameNativeIdleCycleAttestation,nativeIdleCycleAttestationCovers,nativeIdleCycleWatchKnot} from '../world/native-idle-cycle.js';
import {copyNativeTaskRequestReference,nativeTaskRequestMatchesStart} from '../world/native-task-request-reference.js';
import {copyNativePendingTaskCancellation} from '../world/native-pending-task-cancellation.js';
import {copyNativeTaskStartReference} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation,nativeTaskStartAttestationCovers} from '../world/native-task-start-attestation.js';
import {copyNativeResumeAttestation,nativeResumeAttestationCovers} from '../world/native-resume-attestation.js';
import {copyNativeResumeReference,sameNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,sameNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec,nativeTaskRouteStopCodec,NATIVE_STOP_POSE_FIELDS} from '../world/native-worker-route-stop-codec.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {nativeRecoveryCovers,nativeWorkerRouteRecoveryProfile} from '../world/native-worker-route-recovery.js';
import {copyNativeTaskActionReference,nativeTaskActionActor} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionRestoreReference,sameNativeTaskActionRestoreReference} from '../world/native-task-action-restore-reference.js';
import {copyNativeTaskActionAttestation,nativeTaskActionAttestationCovers} from '../world/native-task-action-attestation.js';
import {sameNativeTaskActionReference} from '../world/native-task-action-presentation.js';
import {copyNativeTaskConsequenceReference,copyNativeTaskConsequenceAttestation,nativeTaskConsequenceAttestationCovers} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementAttestation,nativeTaskSettlementAttestationCovers} from '../world/native-task-settlement.js';

const strollStopFamily=Object.freeze({codec:nativeIdleStrollStopCodec,admitted:'strollAdmitted',issued:'issuedStroll',proof:'strollProof',name:'stroll',errorCode:'native-stroll-stop-admission-obsolete'});
const farmStopFamily=Object.freeze({codec:nativeFarmArrivalStopCodec,admitted:'farmArrivalAdmitted',issued:'issuedFarmArrival',proof:'farmArrivalProof',name:'farm arrival',errorCode:'native-farm-arrival-stop-admission-obsolete'});
const taskStopFamily=Object.freeze({codec:nativeTaskRouteStopCodec,name:'task route',errorCode:'native-task-route-stop-admission-obsolete'});
const stopSourceBody=(family,record)=>family===taskStopFamily?record?.taskStopBodyId:record?.[family.admitted]?record[family.issued]?.reference.bodyId:null;

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
export function createNativeRouteControl({authorityEpoch,initialSequence=0,initialTime=null,routes=[],pendingTaskRequests=[],pendingActionRequests=[],pendingHomeRequests=[],pendingInitialIdleRequests=[],pendingIdleStrollRequests=[],pendingFarmArrivalRequests=[],pendingAnimalCrop=null,nativeIdleCycles=[],pendingIdleCycleRequests=[],restoredWallRepairs=[]}={}){
  if(typeof authorityEpoch!=='string'||!authorityEpoch||
     !Number.isSafeInteger(initialSequence)||initialSequence<0||
     initialTime!==null&&(!Number.isFinite(initialTime)||initialTime<0)||!Array.isArray(routes)||!Array.isArray(pendingTaskRequests)||!Array.isArray(pendingActionRequests)||!Array.isArray(pendingHomeRequests)||!Array.isArray(pendingInitialIdleRequests)||!Array.isArray(pendingIdleStrollRequests)||!Array.isArray(pendingFarmArrivalRequests)||!Array.isArray(nativeIdleCycles)||!Array.isArray(pendingIdleCycleRequests))
    throw TypeError('Invalid native route control identity');
  if(!Array.isArray(restoredWallRepairs))throw TypeError('Invalid restored wall Repair baseline');
  const restoredRepairs=new Map();
  for(const value of restoredWallRepairs){const declaration=copyRestoredWallRepairDeclaration(value),key=restoredWallRepairKey(declaration.reference);if(declaration.authorityEpoch!==authorityEpoch||initialTime===null||declaration.restoredAt>initialTime||restoredRepairs.has(key)||[...restoredRepairs.values()].some(d=>d.reference.entityId===declaration.reference.entityId))throw Error('Invalid restored wall Repair baseline owner');restoredRepairs.set(key,declaration);}
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
  if(pendingAnimalCrop!==null){
    const q=copyPendingAnimalCrop(pendingAnimalCrop);
    // This first ordinary raid owns the only moving body. A mixed cohort must
    // establish its own causal transition before it can use the same profile.
    if(actors.size||q.authorityEpoch!==authorityEpoch||initialTime===null||q.requestSequence>initialSequence||q.restore?.requestedAt>initialTime)
      throw Error('Crop request conflicts with its native cohort or baseline');
    const actor=actorContext(q.actorId);actor.state=6;actor.latestSequence=q.requestSequence;
    actor.targetId=q.targetId;actor.cropRequest=q;
  }

  let sequence=initialSequence,effectiveTime=initialTime??-Infinity,closed=false,clock=null;
  const counters={accepted:0,revoked:0,oldEpoch:0,admissions:0};
  const homeRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&sameNativeHomeRequestReference(actor.pendingHomeRequest,request);
  const initialIdleRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingInitialIdleRequest===request;
  const idleStrollRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingIdleStrollRequest===request;
  const farmArrivalRequestCurrent=(request,actor)=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(request.actorId)===actor&&actor.state===6&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.authorityEpoch===authorityEpoch&&request.nativeSession===clock.nativeSession&&request.requestSequence<=clock.intentSequence&&actor.pendingFarmArrivalRequest===request;
  const strollSelectedSourceMatches=(reference,next,request)=>reference.sourceRequest?sameNativeIdleStrollRequestReference(reference.sourceRequest,request):nativeIdleStrollContinuesNext(reference,next);
  const strollIssuedSourceMatches=(reference,record)=>reference.sourceSettlement?!!record.sourceSettledApproach&&JSON.stringify(reference.sourceSettlement)===JSON.stringify(record.sourceSettledApproach):reference.sourceFarm?!!record.sourceFarmApproach?.admitted&&completedFarmStrollSourceMatches(reference,{issuedFarmArrival:record.sourceFarmApproach.proof,assignmentSequence:record.sourceFarmApproach.proof.assignmentSequence}):reference.sourceRequest?sameNativeIdleStrollRequestReference(reference.sourceRequest,record.sourceStrollRequest):record.sourceIdleCycleAdmitted&&nativeIdleStrollContinuesNext(reference,record.sourceIdleCycleNext);
  function validateCropChange(event,current){
    const issued=event.nativeAnimalCrop,actor=actors.get(event.actorId),q=actor?.cropRequest;
    if(!q||event.actorId!==issued.actorId||event.taskId||event.targetId!==q.targetId||
       issued.purpose!==q.purpose||issued.bodyId!==q.bodyId||issued.targetId!==q.targetId||event.revokedRouteHandle||
       [event.nativeFarmArrival,event.nativeIdleStroll,event.taskRequest,event.actionRequest,event.idleCycle].some(Boolean))
      throw Error('Animal crop change has a different owner');
    if(issued.kind===26){
      const o=issued.origin,t=issued.terminal,w=issued.worldBoundary;
      if(current||actor.state!==6||actor.latestSequence!==q.requestSequence||event.type!=='RouteAssigned'||event.state!==1||
         issued.requestSequence!==q.requestSequence||issued.assignmentSequence!==event.sequence||!sameHandle(event.routeHandle,issued.routeHandle)||
         w.authorityEpoch!==authorityEpoch||w.nativeSession!==q.nativeSession||w.effectiveTime!==event.effectiveTime||
         issued.centerId!==q.centerId||issued.center.x!==q.centerX||issued.center.z!==q.centerZ||issued.radius!==q.radius||
         q.purpose==='retreat'&&(t?.x!==Math.fround(q.targetX)||t?.z!==Math.fround(q.targetZ))||
         !['x','z','phase','yaw'].every(k=>o[k]===q[k])||![t?.x,t?.z,t?.phase,issued.endTime].every(Number.isFinite))
        throw Error('Crop assignment lost its request or end pose');
    }else{
      if(issued.restore){
        if(issued.kind!==27||current||actor.state!==6||actor.latestSequence!==q.requestSequence||!sameRestoredAnimalStrike(issued.restore,q.restore)||
           event.type!=='IntentChanged'||event.state!==2||event.routeHandle||issued.routeAssignment||issued.routeTicket||issued.generation||
           issued.at!==event.effectiveTime||issued.session!==q.nativeSession||issued.attackId!==q.restore.attackId||issued.clip!==q.restore.clip||
           issued.duration!==q.restore.duration||issued.endTime!==issued.at+q.restore.remaining||
           !['x','z','phase','yaw','targetX','targetZ'].every(k=>issued[k]===q[k]))
          throw Error('Restored crop strike differs from its saved action');
        return;
      }
      const route=current?.cropBinding,r=route?.reference,t=current?.issuedCrop?.terminal;
      if(issued.kind!==27||actor.state!==1||event.type!=='IntentChanged'||event.state!==2||event.routeHandle||
         !r||current.issuedCrop.kind!==26||event.effectiveTime<r.endTime||event.effectiveTime!==issued.at||
         issued.session!==q.nativeSession||r.worldBoundary.ticket!==issued.routeTicket||route.assignmentSequence!==issued.routeAssignment||
         issued.generation!==current.handle.generation||!['x','z','phase'].every(k=>issued[k]===t[k])||
         issued.targetX!==q.targetX||issued.targetZ!==q.targetZ||!id(issued.attackId))
        throw Error('Crop strike must acquire its installed terminal body');
    }
  }
  function sameCropSource(r,actor){
    if(!actor?.cropRequest)return false;
    if(r.restore)return animalCropMatchesRequest(r,actor.cropRequest);

    if(r.kind===26){
      if(r.purpose==='retreat'&&actor.encounterRetreatRequest===actor.cropRequest)
        return animalCropMatchesRequest(r,actor.cropRequest);
      const birth=actor.raidFlightBirth;
      if(birth){
        const peer=actors.get(birth.workerActor);
        let home=peer?.pendingHomeRequest;
        if(r.purpose==='center'){
          const moving=peer?.homeProof?.reference,arrived=retiredRefuge?.reference;
          home=moving&&homeRecordCurrent(moving,peer)?moving.sourceRequest:
            !peer&&arrived?.actorId===birth.workerActor?arrived.sourceHome.reference.sourceRequest:null;
        }else if(!homeRequestCurrent(home,peer))return false;
        if(!home||home.raidSpawnSequence!==birth.raidSpawnSequence||
           home.bodyId!==birth.workerBody||home.requestSequence<birth.sourceSequence)return false;
      }
      return animalCropMatchesRequest(r,actor.cropRequest);
    }
    const rec=actor.current,b=rec?.cropBinding,source=b?.reference,t=rec?.issuedCrop?.terminal;
    return source?.kind===26&&source.purpose===r.purpose&&b.assignmentSequence===r.routeAssignment&&source.worldBoundary.ticket===r.routeTicket&&
      source.endTime<=r.worldBoundary.effectiveTime&&t&&['x','z','phase'].every(k=>r[k]===t[k])&&
      ['bodyId','targetId','centerId','slot','generation','radius','requestSequence','targetX','targetZ','centerX','centerZ'].every(k=>r[k]===source[k]);
  }
  function installAnimalCrop(boundary,input){
    const proof=copyNativeAnimalCropAttestation(input,input?.reference?.kind),r=proof.reference,p=proof.preparedReference;
    const actor=actors.get(r.actorId),rec=actor?.current,e=rec?.issuedCrop;
    if(closed||!clock||clock.nativeSession!==r.worldBoundary.nativeSession||r.worldBoundary.authorityEpoch!==authorityEpoch||
       !sameNativeWorldBoundary(boundary,r.worldBoundary)||boundary.effectiveTime!==clock.committedThrough||
       proof.assignmentSequence!==actor?.latestSequence||proof.assignmentSequence!==r.sourceControlSequence+1||
       proof.assignmentSequence>clock.intentSequence||!rec||active.get(r.actorId)!==rec||e?.kind!==r.kind||
       (!r.restore&&(r.slot!==rec.handle?.slot||r.generation!==rec.handle?.generation))||rec.cropBinding?.reference.kind===r.kind)
      throw Error('Crop acquisition lacks its issued assignment');
    if(r.kind===26){
      if(actor.state!==1||!animalCropMatchesRequest(r,actor.cropRequest)||!sameNativeWorldBoundary(e.worldBoundary,boundary)||
         !sameNativeWorldBoundary(e.preparedWorldBoundary,p.worldBoundary)||e.endTime!==r.endTime||e.preparedEndTime!==p.endTime)
        throw Error('Crop route acquisition changed its prepared program');
    }else if(r.restore){
      if(actor.state!==2||rec.handle||!animalCropMatchesRequest(r,actor.cropRequest)||!sameRestoredAnimalStrike(e.restore,r.restore)||
         e.ticket!==boundary.ticket||e.preparedTicket!==p.worldBoundary.ticket||e.preparedAt!==p.worldBoundary.effectiveTime||
         e.attackId!==proof.attackId||e.endTime!==r.endTime)
        throw Error('Restored crop strike acquisition changed its saved action');
    }else{
      const route=rec.cropBinding,prev=route?.reference;
      if(actor.state!==2||prev?.kind!==26||route.assignmentSequence!==r.routeAssignment||prev.worldBoundary.ticket!==r.routeTicket||
         !['actorId','bodyId','targetId','clip','duration','generation','routeTicket','routeAssignment','phase','x','z','yaw','targetX','targetZ','endTime'].every(k=>e[k]===r[k])||
         !['slot','requestSequence','centerId','centerX','centerZ','radius'].every(k=>r[k]===prev[k])||
         e.ticket!==boundary.ticket||e.preparedTicket!==p.worldBoundary.ticket||e.preparedAt!==p.worldBoundary.effectiveTime||proof.attackId!==e.attackId)
        throw Error('Crop strike acquisition changed its prepared action');
    }
    rec.cropBinding=proof;
    return proof;
  }
  function shieldCropStopMatches(record,stop){
    const ref=record?.cropBinding?.reference;
    const terminal=record?.issuedCrop?.terminal;
    const terminalCut=stop.removal&&!stop.running&&terminal&&['x','z','phase'].every(key=>terminal[key]===stop[key]);
    return !!ref&&ref.kind===26&&!ref.purpose&&ref.bodyId===stop.bodyId&&ref.targetId===stop.targetId&&
      ref.slot===stop.slot&&ref.generation===stop.generation&&record.assignmentSequence===stop.assignmentSequence&&
      ref.worldBoundary.ticket===stop.routeTicket&&ref.worldBoundary.nativeSession===stop.worldBoundary.nativeSession&&
      ref.worldBoundary.authorityEpoch===stop.worldBoundary.authorityEpoch&&
      ref.worldBoundary.effectiveTime<=stop.worldBoundary.effectiveTime&&
      (stop.worldBoundary.effectiveTime<ref.endTime||terminalCut)&&stop.phase>=ref.phase;
  }
  function shieldCropStopCurrent(stop,{revoked=false}={}){
    const owner=actors.get(stop.actorId),record=revoked?owner?.revoked:active.get(stop.actorId);
    if(!shieldCropStopMatches(record,stop))return false;
    return revoked?sameNativeShieldCropStop(record.nativeShieldCropStop,stop)&&record.revokedState===0&&record.safeUntil===stop.worldBoundary.effectiveTime:
      owner.current===record&&owner.state===1&&record.revokedSequence===undefined;
  }
  function shieldCropStopAtBoundary(boundary){
    for(const owner of actors.values()){
      const stop=owner.revoked?.nativeShieldCropStop;
      if(stop&&sameNativeWorldBoundary(stop.worldBoundary,boundary))return stop;
    }
    return null;
  }
  function shieldCropExpirySource(proof){
    const actor=actors.get(proof.actorId),last=finishedCrop,ref=last?.reference,request=actor?.cropRequest;
    const preparedSequence=proof.requestSequence??proof.completionSequence;
    if(closed||!clock||active.size||!ref||ref.kind!==27||ref.purpose||
       !['actorId','bodyId','targetId'].every(k=>ref[k]===proof[k])||
       last.attackId!==proof.attackId||ref.worldBoundary.ticket!==proof.strikeTicket||
       clock.intentSequence!==preparedSequence||proof.worldBoundary.authorityEpoch!==authorityEpoch||
       clock.nativeSession!==proof.worldBoundary.nativeSession||proof.worldBoundary.effectiveTime!==clock.committedThrough||
       ref.endTime>clock.committedThrough)return null;
    const matches=previous=>sameNativeAnimalCropReference(previous,last.preparedReference);
    if(proof.completionSequence!==undefined){
      if(actors.size||last.retiredSequence!==proof.completionSequence||last.retiredAt!==proof.worldBoundary.effectiveTime||
         !['x','z','yaw','phase'].every(k=>ref[k]===proof[k]))return null;
      return Object.freeze({matches,retired:()=>!closed&&finishedCrop===last&&!active.has(proof.actorId)});
    }
    if(actors.size!==1||!actor||actor.closed||actor.state!==6||actor.cropPredecessor!==ref||!request||
       actor.latestSequence!==proof.requestSequence||request.requestSequence!==proof.requestSequence||
       !['actorId','bodyId','targetId'].every(k=>request[k]===proof[k]))return null;
    return Object.freeze({matches,
      retired:()=>!closed&&finishedCrop===last&&actor.closed&&actor.state===5&&
        actor.latestSequence===proof.requestSequence+1&&!active.has(proof.actorId)});
  }
  function cropClockMatches(record,reference){
    const proof=record.cropBinding;
    return sameNativeAnimalCropReference(proof?.preparedReference,reference)||
      record.recoveredCrop===true&&sameNativeAnimalCropReference(proof?.reference,reference);
  }


  function verifyEncounterRetreatGo(source,proof,hit){
    const r=proof.reference,actor=actors.get(r.actorId),previous=actor?.revoked,cut=previous?.nativeEncounterExhaustion;
    return !!cut&&previous.revokedSequence===source.intent+1&&previous.safeUntil===source.at&&
      cut.hit===hit&&cut.spawn===source.spawn&&cut.worker===source.worker&&cut.workerBody===source.workerBody&&
      cut.workerAssignment===source.workerAssignment&&cut.animalBody===r.bodyId&&cut.assignment===source.approach.assignmentSequence&&
      sameNativeAnimalCropReference(previous.cropBinding?.reference,source.approach.reference)&&
      actor.encounterRetreatRequest===actor.cropRequest&&animalCropMatchesRequest(r,actor.cropRequest)&&
      ['x','z','yaw','phase'].every(key=>cut.first[key]===r[key])&&sequence===source.intent+3&&
      clock?.intentSequence===sequence&&clock.clockSequence===source.initialClock+2&&clock.committedThrough===source.at;
  }
  function heldEncounterCropDraft(input,r,actor){
    const draft=input,approach=actor?.current?.cropBinding,peer=actors.get(draft?.worker),home=peer?.revoked,access=home?.sourceHomeRequest;
    if(!draft||draft.version!==1||!r||r.kind!==26||r.purpose!=='retreat'||!approach||approach.reference.purpose!=='center'||
       !sameNativeAnimalCropReference(r,draft.reference)||
       !sameNativeAnimalCropReference(approach.reference,draft.approach?.reference)||
       !sameNativeAnimalCropReference(approach.preparedReference,draft.approach?.preparedReference)||
       approach.assignmentSequence!==draft.approach?.assignmentSequence||actor.state!==1||active.get(r.actorId)!==actor.current||
       r.bodyId!==approach.reference.bodyId||r.radius!==approach.reference.radius||r.actorId!==approach.reference.actorId||
       draft.intent!==sequence||r.requestSequence!==sequence+2||r.sourceControlSequence!==sequence+2||
       draft.initialClock!==clock?.clockSequence||r.worldBoundary.effectiveTime!==clock?.committedThrough||
       !(draft.at>r.worldBoundary.effectiveTime&&draft.at-r.worldBoundary.effectiveTime<=.020000001&&draft.at<approach.reference.endTime)||
       draft.worker!==actor.raidFlightBirth?.workerActor||draft.workerBody!==actor.raidFlightBirth.workerBody||
       draft.spawn!==actor.raidFlightBirth.raidSpawnSequence||peer?.state!==0||peer.current||home?.revokedState!==0||
       home.assignmentSequence!==draft.workerAssignment||home.safeUntil>=r.worldBoundary.effectiveTime||
       access?.bodyId!==draft.workerBody||access?.raidSpawnSequence!==draft.spawn)return false;
    return true;
  }
  function admitAnimalCrop(input,{preparingWorldBoundary=null,encounterRetreatDraft=null}={}){
    const r=copyNativeAnimalCropReference(input,input?.kind),actor=actors.get(r.actorId);
    const live=()=>!closed&&!!clock&&actor&&!actor.closed&&actors.get(r.actorId)===actor&&clock.nativeSession===r.worldBoundary.nativeSession&&r.worldBoundary.authorityEpoch===authorityEpoch;
    const current=()=>!!(live()&&actor.current&&active.get(r.actorId)===actor.current&&actor.state===(r.kind===26?1:2)&&
      cropClockMatches(actor.current,r));
    const pending=()=>!!(live()&&sequence>=r.sourceControlSequence&&clock.committedThrough>=r.worldBoundary.effectiveTime&&
      sameNativeWorldBoundary(preparingWorldBoundary,r.worldBoundary)&&actor.state===(r.kind===26||r.restore?6:1)&&sameCropSource(r,actor));
    const draft=()=>!!(live()&&encounterRetreatDraft&&sameNativeWorldBoundary(preparingWorldBoundary,r.worldBoundary)&&heldEncounterCropDraft(encounterRetreatDraft,r,actor));
    if(!current()&&!pending()&&!draft())throw Error('Animal crop preparation lacks its current native source');
    return Object.freeze({reference:r,isCurrent:current,isPrepared:()=>current()||pending()||draft(),
      isRevoked(){
        const record=actor?.revoked,proof=record?.cropBinding;
        return !closed&&clock?.nativeSession===r.worldBoundary.nativeSession&&r.worldBoundary.authorityEpoch===authorityEpoch&&
          (proof?.reference.kind===27||!!record?.nativeEncounterExhaustion||proof?.reference.purpose==='retreat'&&record.safeUntil>=proof.reference.endTime||!!record?.nativeShieldCropStop)&&record.revokedSequence>proof.assignmentSequence&&
          cropClockMatches(record,r);
      },
      canQuiesceForRefugeReturn(next){
        const request=next?.sourceRequest,peer=request&&actors.get(request.actorId),retired=actor?.revoked;
        return r.purpose==='retreat'&&this.isRevoked()&&!active.has(r.actorId)&&!actors.has(r.actorId)&&
          request?.version===2&&request.refugeSequence<retired.revokedSequence&&retired.revokedSequence<request.requestSequence&&
          r.actorId!==request.actorId&&r.bodyId!==request.bodyId&&peer?.pendingFarmArrivalRequest&&farmArrivalRequestCurrent(peer.pendingFarmArrivalRequest,peer)&&
          sameNativeFarmArrivalRequestReference(request,peer.pendingFarmArrivalRequest);
      },
      canQuiesceFor(next){
        const record=actor?.revoked,last=record?.cropBinding,successor=actors.get(r.actorId);

        if(record?.nativeEncounterExhaustion&&last?.reference.purpose==='center')return cropClockMatches(record,r)&&successor?.state===6&&
          successor.encounterRetreatRequest===successor.cropRequest&&next?.kind===26&&next.purpose==='retreat'&&animalCropMatchesRequest(next,successor.cropRequest);
        return last?.reference.kind===27&&cropClockMatches(record,r)&&
          successor?.state===6&&successor.cropPredecessor===last.reference&&next?.kind===26&&
          animalCropMatchesRequest(next,successor.cropRequest);
      },
      get routeRecord(){return current()?(r.kind===26?actor.current:actor.current.cropStrikeRecord):null;},
      get executionEpoch(){return current()?actor.current.cropBinding.reference.worldBoundary.effectiveTime:null;},
      get executionEnd(){return current()?actor.current.cropBinding.reference.endTime:null;}});
  }

  // Keep only the immutable identity of the last completed strike. Its route
  // has already been revoked and cannot authorize another draw.
  let finishedCrop=null,retiredRefuge=null;
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
    const cycleFromStroll=!!idleCycle&&idleCycle.reference.sourceCycleSequence===0&&isNativeIdleStrollArrivalSource(idleCycle.reference.sourceBody),cycleFromFarm=!!idleCycle&&idleCycle.reference.sourceCycleSequence===0&&idleCycle.reference.sourceBody.kind==='native-farm-arrival-idle-source',cycleFromRoute=cycleFromStroll||cycleFromFarm;
    if((idleCycle||idleCycleNext)&&(event.type!==(cycleFromRoute?'RouteCompleted':'IntentChanged')||event.state!==7||handle||(cycleFromRoute?!revoked:!!revoked)||event.taskId!==null&&event.taskId!==0||event.targetId!==null&&event.targetId!==0||event.taskRequest||event.actionRequest||event.homeRequest||event.initialIdleRequest||event.idleStrollRequest||event.farmArrivalRequest||idleCycle&&idleCycleNext))throw Error('Native Idle cycle event conflicts with another owner');
    if(idleCycle&&(idleCycle.reference.actorId!==event.actorId||idleCycle.cycleSequence!==event.sequence||idleCycle.reference.sourceControlSequence!==event.sequence-1||idleCycle.reference.worldBoundary.effectiveTime!==event.effectiveTime||idleCycle.reference.worldBoundary.authorityEpoch!==authorityEpoch||clock&&idleCycle.reference.worldBoundary.nativeSession!==clock.nativeSession))throw Error('Native Idle cycle acquisition identity mismatch');
    if(idleCycleNext&&(idleCycleNext.sourceCycle.reference.actorId!==event.actorId||idleCycleNext.requestSequence!==event.sequence||idleCycleNext.requestedAt!==event.effectiveTime||idleCycleNext.sourceCycle.reference.worldBoundary.authorityEpoch!==authorityEpoch||clock&&idleCycleNext.sourceCycle.reference.worldBoundary.nativeSession!==clock.nativeSession))throw Error('Native Idle cycle successor identity mismatch');
    const current=active.get(event.actorId);
    if(current&&revoked&&!sameHandle(current.handle,revoked))
      throw Error('Native route revocation does not match the active version');
    if(current&&assigned&&!revoked)
      throw Error('Native route assignment omitted the previous revocation');
    const shieldStop=event.nativeShieldCropStop===undefined?null:copyNativeShieldCropStop(event.nativeShieldCropStop);
    if((!!shieldStop)!==(event.nativeShieldCropPolygon!==undefined)||shieldStop&&(!id(event.nativeShieldCropPolygon)||
       event.actorId!==shieldStop.actorId||event.type!=='RouteInvalidated'||event.state!==0||
       !current||assigned||handle||!revoked||event.taskId||event.targetId!==shieldStop.targetId||
       event.effectiveTime!==shieldStop.worldBoundary.effectiveTime||!shieldCropStopCurrent(shieldStop)))
      throw Error('Native Shield stop lacks its current route or revocation');

    const exhaustion=event.nativeEncounterExhaustion;
    if(exhaustion!==undefined){
      const owner=actors.get(event.actorId),birth=owner?.raidFlightBirth,peer=actors.get(exhaustion?.worker),home=peer?.revoked;
      const route=current?.cropBinding?.reference,access=home?.sourceHomeRequest;
      if(!exhaustion||exhaustion.version!==1||event.type!=='RouteInvalidated'||event.state!==0||handle||assigned||!revoked||
         event.actorId!==exhaustion.animal||event.targetId!==route?.targetId||event.taskId||route?.kind!==26||route.purpose!=='center'||
         !sameHandle(revoked,exhaustion.handle)||exhaustion.assignment!==current.assignmentSequence||exhaustion.animalBody!==route.bodyId||
         birth?.workerActor!==exhaustion.worker||birth.workerBody!==exhaustion.workerBody||birth.raidSpawnSequence!==exhaustion.spawn||
         peer?.state!==0||peer.current||!home||home.revokedState!==0||home.assignmentSequence!==exhaustion.workerAssignment||
         access?.bodyId!==exhaustion.workerBody||access.raidSpawnSequence!==exhaustion.spawn||
         home.safeUntil>=exhaustion.from||exhaustion.at!==event.effectiveTime||exhaustion.from!==clock?.committedThrough||
         !(exhaustion.from<exhaustion.at)||exhaustion.at-exhaustion.from>.021||!id(exhaustion.hit)||exhaustion.hit<=exhaustion.spawn||
         ![exhaustion.x,exhaustion.z,exhaustion.yaw,exhaustion.phase,exhaustion.exit?.x,exhaustion.exit?.z].every(Number.isFinite)||
         !exhaustion.first||!['x','z','yaw','phase','distance'].every(key=>Number.isFinite(exhaustion.first[key]))||
         exhaustion.first.distance<=0||Math.abs(exhaustion.first.distance-(exhaustion.at-exhaustion.from)*3.8)>1e-10||
         Math.hypot(exhaustion.first.x-exhaustion.x,exhaustion.first.z-exhaustion.z)>exhaustion.first.distance+1e-10||
         Math.abs(exhaustion.first.phase-exhaustion.phase-(exhaustion.at-exhaustion.from))>1e-10||
         exhaustion.phase<route.phase||exhaustion.at>=route.endTime||event.pendingAnimalCrop||event.nativeAnimalCrop)
        throw Error('Worker encounter exhaustion lacks its exact live approach and held worker');
    }
    const successor=event.pendingAnimalCrop==null?null:copyPendingAnimalCrop(event.pendingAnimalCrop);
    let continuedEncounter=false;
    const birth=event.raidFlightBirth;
    const centerBirth=successor?.purpose==='center'&&!event.pendingAnimalCrop.previousStrike;
    if(birth!==undefined){
      const peer=actors.get(birth?.workerActor),record=peer?.current,home=peer?.pendingHomeRequest;
      const prior=birth?.taskTicket!=null?record?.issuedStart:birth?.strollTicket!=null?record?.issuedStroll:record?.issuedFarmArrival;
      const ticket=birth?.taskTicket??birth?.strollTicket??birth?.farmTicket;
      const peerCurrent=ticket!=null?
        !!prior&&prior.assignmentSequence===birth.sourceSequence&&prior.reference.worldBoundary.ticket===ticket&&prior.reference.bodyId===birth.workerBody:
        home?.version===2&&home.requestSequence===birth?.sourceSequence&&home.raidSpawnSequence===birth.raidSpawnSequence&&home.bodyId===birth.workerBody;
      if(!birth||birth.taskTicket!=null&&(birth.strollTicket!=null||birth.farmTicket!=null||!centerBirth)||
         birth.strollTicket!=null&&(birth.farmTicket!=null||!centerBirth)||!id(birth.raidSpawnSequence)||!id(birth.sourceSequence)||!id(birth.workerBody)||!peer||peer.closed||
         peer.latestSequence!==birth.sourceSequence||!peerCurrent||actors.size!==1||actors.has(event.actorId)||!successor||
         successor.bodyId===birth.workerBody||successor.purpose&&successor.purpose!=='center'||event.pendingAnimalCrop.previousStrike||successor.actorId!==event.actorId||
         successor.nativeSession!==clock?.nativeSession||successor.authorityEpoch!==authorityEpoch||successor.requestSequence!==event.sequence||
         event.targetId!==successor.targetId||event.taskId||event.type!=='IntentChanged'||event.state!==6||current||revoked||handle||
         [event.nativeAnimalCrop,event.taskRequest,event.actionRequest,event.initialIdleRequest,event.idleStrollRequest,event.homeRequest,
          event.farmArrivalRequest,event.idleCycle,event.idleCycleNext,event.nativeFarmArrival,event.nativeIdleStroll].some(Boolean))
        throw Error('Crop birth lacks its current raid flight peer');
    }else if(centerBirth){
      if(!clock||finishedCrop||actors.size||active.size||event.type!=='IntentChanged'||event.state!==6||
         revoked||handle||event.taskId||event.targetId!==successor.targetId||event.sequence!==successor.requestSequence||
         successor.actorId!==event.actorId||successor.authorityEpoch!==authorityEpoch||successor.nativeSession!==clock.nativeSession||
         [event.nativeAnimalCrop,event.taskRequest,event.actionRequest,event.homeRequest,event.initialIdleRequest,event.idleStrollRequest,
          event.farmArrivalRequest,event.idleCycle,event.idleCycleNext,event.nativeFarmArrival,event.nativeIdleStroll].some(Boolean))
        throw Error('Center birth requires an empty causal cohort');

    }else if(event.previousWorkerEncounter!==undefined){
      const owner=actors.get(event.actorId),cut=owner?.revoked,prior=cut?.nativeEncounterExhaustion;
      if(!prior||!successor||event.previousWorkerEncounter!==prior.hit||successor.purpose!=='retreat'||
         prior.animal!==event.actorId||successor.actorId!==prior.animal||successor.bodyId!==prior.animalBody||
         successor.targetId||successor.centerId||event.taskId||event.targetId||current||handle||revoked||
         owner.state!==0||owner.latestSequence!==cut.revokedSequence||event.type!=='IntentChanged'||event.state!==6||
         event.sequence!==successor.requestSequence||successor.authorityEpoch!==authorityEpoch||successor.nativeSession!==clock?.nativeSession||
         cut.safeUntil!==prior.at||event.effectiveTime<prior.at||
         !['x','z','yaw','phase'].every(key=>successor[key]===prior.first[key])||successor.targetX!==prior.exit.x||successor.targetZ!==prior.exit.z)
        throw Error('Retreat request lacks its worker encounter exhaustion');
      continuedEncounter=true;
    }else if(event.pendingAnimalCrop?.previousShieldCrop){
      const previous=event.pendingAnimalCrop.previousShieldCrop,owner=actors.get(event.actorId),cut=owner?.revoked;
      const issued=cut?.issuedCrop,old=cut?.cropBinding?.reference,w=copyNativeWorldBoundary(previous.worldBoundary);
      const replaces=previous.replacesRequestSequence;
      const latest=replaces===undefined?cut?.revokedSequence:id(replaces)&&owner?.state===6&&
        owner.cropRequest?.requestSequence===replaces&&['actorId','bodyId','targetId','centerId','radius','x','z','yaw','phase']
          .every(k=>owner.cropRequest[k]===successor?.[k])?replaces:null;
      if(!successor||!old||!issued||!w||!sameNativeWorldBoundary(cut.nativeShieldCropStop?.worldBoundary,w)||
         !['x','z','yaw','phase'].every(key=>cut.nativeShieldCropStop[key]===successor[key])||
         w.authorityEpoch!==authorityEpoch||w.nativeSession!==clock?.nativeSession||
         w.ticket<=old.worldBoundary.ticket||w.effectiveTime!==cut.safeUntil||w.effectiveTime>event.effectiveTime||
         cut.nativeShieldCropPolygon!==previous.polygonId||cut.assignmentSequence!==previous.assignmentSequence||
         previous.routeTicket!==old.worldBoundary.ticket||!sameHandle(cut.handle,previous.routeHandle)||
         actors.size!==1||active.size||current||revoked||handle||cut.revokedState!==0||owner.latestSequence!==latest||
         event.type!=='IntentChanged'||event.state!==6||event.taskId||event.targetId!==old.targetId||
         successor.requestSequence!==event.sequence||successor.authorityEpoch!==authorityEpoch||successor.nativeSession!==w.nativeSession||
         ['actorId','bodyId','targetId','centerId','targetX','targetZ','centerX','centerZ','radius','purpose'].some(key=>old[key]!==successor[key])||
         ![successor.x,successor.z,successor.yaw,successor.phase].every(Number.isFinite)||successor.phase<old.phase)
        throw Error('Shield crop request lacks its revoked approach');
    }else if(successor){
      if(!finishedCrop||event.pendingAnimalCrop.previousStrike?.attackId!==finishedCrop.attackId||
         event.pendingAnimalCrop.previousStrike?.ticket!==finishedCrop.reference.worldBoundary.ticket||current||active.size||actors.size||event.type!=='IntentChanged'||event.state!==6||
         revoked||handle||event.taskId||event.targetId!==successor.targetId||event.sequence!==successor.requestSequence||
         successor.actorId!==event.actorId||successor.authorityEpoch!==authorityEpoch||
         successor.nativeSession!==finishedCrop.reference.worldBoundary.nativeSession||event.effectiveTime<finishedCrop.reference.endTime||
         !['actorId','bodyId','radius','x','z','phase','yaw'].every(k=>successor[k]===finishedCrop.reference[k])||
         [event.nativeAnimalCrop,event.taskRequest,event.actionRequest,event.initialIdleRequest,event.idleStrollRequest,
          event.homeRequest,event.farmArrivalRequest,event.idleCycle,event.idleCycleNext].some(Boolean))
        throw Error('Crop successor lacks the completed strike body');
    }
    const crop=event.nativeAnimalCrop;
    if(crop)validateCropChange(event,current);
    const restoredStrikeEnd=current?.issuedCrop?.restore&&event.type==='IntentChanged'&&event.state===5&&
      !handle&&!revoked&&!crop&&!event.taskId&&event.targetId===current.issuedCrop.targetId&&
      current.cropBinding&&event.effectiveTime>=current.cropBinding.reference.endTime;
    if(current&&!assigned&&!revoked&&crop?.kind!==27&&!restoredStrikeEnd)
      throw Error('Native intent transition omitted the active route revocation');
    if(current?.cropStrikeRecord?.lastDrawTime!=null&&event.effectiveTime<current.cropStrikeRecord.lastDrawTime)
      throw Error('Native strike revocation arrived after its submitted time');
    if(current&&revoked&&current.lastDrawTime!==null&&
       event.effectiveTime<current.lastDrawTime){
      const error=Error('Native route revocation arrived after its presented time');
      error.code='native-route-revocation-late';throw error;
    }
    const actor=assigned||event.type==='IntentChanged'&&event.state===6?actorContext(event.actorId,false):actors.get(event.actorId);
    if(farmArrivalRequest?.version===2){
      const previous=retiredRefuge?.reference,goal=previous?.sourceHome.reference.sourceRequest?.home;
      if(!goal||retiredRefuge.retiredSequence!==farmArrivalRequest.refugeSequence||
         previous.worldBoundary.authorityEpoch!==farmArrivalRequest.authorityEpoch||
         previous.worldBoundary.nativeSession!==farmArrivalRequest.nativeSession||previous.actorId!==farmArrivalRequest.actorId||
         previous.bodyId===farmArrivalRequest.bodyId||farmArrivalRequest.pose.x!==goal.x||farmArrivalRequest.pose.z!==goal.z||
         previous.worldBoundary.effectiveTime>farmArrivalRequest.requestedAt||
         ['yaw','runPhase','walkPhase','carryPhase','runRemaining'].some(k=>previous.pose[k]!==farmArrivalRequest.pose[k]))
        throw Error('Civil Farm request lacks its acquired Home absence');
    }
    if(farmArrivalRequest&&(current||actor.closed||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingFarmArrivalRequest||actor.pendingIdleStrollRequest||actor.pendingInitialIdleRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.idleCycleSource||actor.strollProof||actor.revoked||actor.initialIdleBodySource||actor.settlementSource||actor.actionProof))throw Error('Native farm arrival request cannot replace an existing owner');
    if(farmArrivalRequest&&[...actors.values()].some(other=>other!==actor&&[other.pendingFarmArrivalRequest,other.pendingInitialIdleRequest,other.pendingIdleStrollRequest,other.pendingHomeRequest,other.idleCycleSource?.binding.reference].some(q=>q?.bodyId===farmArrivalRequest.bodyId)))throw Error('Native farm arrival request aliases an existing body');
    // Route acquisition, Idle and Home from this source still require their
    // own prepared native/graphical handoff. A genuine pending Task may claim it.
    if(farmArrival&&(!actor||actor.closed||current||(farmArrival.reference.sourceHeld?!farmArrivalContinuationSourceMatches(farmArrival.reference,actor)||!farmArrivalContinuationSourceMatches(farmArrival.preparedReference,actor):actor.state!==6||actor.latestSequence!==actor.pendingFarmArrivalRequest?.requestSequence||!sameNativeFarmArrivalRequestReference(farmArrival.reference.sourceRequest,actor.pendingFarmArrivalRequest)||!sameNativeFarmArrivalRequestReference(farmArrival.preparedReference.sourceRequest,actor.pendingFarmArrivalRequest))))throw Error('Native farm arrival acquisition lacks its exact pending source');
    // The ordered native log can revoke a moving Farm into its held state.
    // This closes the old lease; only exact stop installation grants a held one.
    const heldFarmRevocation=current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===4&&!assigned&&!handle&&!!revoked&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!homeRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.startTime&&event.effectiveTime<current.issuedFarmArrival.reference.endTime;
    const completedFarmTask=!!current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!taskRequest&&!actionRequest&&!homeRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedFarmArrival.reference.endTime&&taskRequest.requestSequence>current.assignmentSequence;
    const completedFarmHome=!!current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!homeRequest&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedFarmArrival.reference.endTime&&completedFarmHomeRequestMatches(homeRequest,current);
    const completedTaskHome=!!current?.issuedStart&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!homeRequest&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedStart.reference.endTime&&completedTaskHomeRequestMatches(homeRequest,current);
    if(homeRequest&&current?.issuedStart&&!completedTaskHome)throw Error('Native Home differs from its completed Task body');
    const completedFarmGoal=completedFarmTask||completedFarmHome;
    const completedStrollHome=!!current?.issuedStroll&&event.type==='RouteInvalidated'&&event.state===6&&!assigned&&!handle&&!!revoked&&!!homeRequest&&!event.taskId&&!event.targetId&&!taskRequest&&!actionRequest&&!initialIdleRequest&&!idleStrollRequest&&!farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival&&event.effectiveTime>=current.issuedStroll.reference.endTime&&completedStrollHomeRequestMatches(homeRequest,current);
    if(homeRequest&&current?.issuedStroll&&!completedStrollHome)throw Error('Native Home differs from its completed stroll body');
    const completedFarmCycle=!!current?.issuedFarmArrival&&cycleFromFarm&&completedFarmCycleSourceMatches(idleCycle.reference,current);
    const settledStroll=!!stroll?.reference.sourceSettlement&&settledIdlePreparationSourceMatches(stroll.reference.sourceSettlement,actor)&&settledIdlePreparationSourceMatches(stroll.preparedReference.sourceSettlement,actor);
    const completedFarmStroll=event.type==='RouteReplaced'&&!!current?.issuedFarmArrival&&!!stroll?.reference.sourceFarm&&strollFarmPreparationSourceMatches(stroll.reference,actor)&&strollFarmPreparationSourceMatches(stroll.preparedReference,actor);
    const cancelledFarm=!!current?.issuedFarmArrival&&event.type==='RouteInvalidated'&&event.state===5&&!assigned&&!handle&&!!revoked&&!event.taskId&&!event.targetId&&!event.taskRequest&&!event.actionRequest&&!event.homeRequest&&!event.initialIdleRequest&&!event.idleStrollRequest&&!event.farmArrivalRequest&&!idleCycle&&!idleCycleNext&&!stroll&&!farmArrival;
    if(current?.issuedFarmArrival&&!heldFarmRevocation&&!completedFarmGoal&&!completedFarmCycle&&!completedFarmStroll&&!cancelledFarm)throw Error('Native farm arrival transition requires prepared lifecycle');
    const pendingFarmHome=!!homeRequest&&!!actor?.pendingFarmArrivalRequest&&!current&&!assigned&&!handle&&!revoked&&!taskRequest&&event.type==='IntentChanged'&&event.state===6&&actor.state===6&&actor.latestSequence===actor.pendingFarmArrivalRequest.requestSequence&&nativeHomeRequestContinuesFarmRequest(homeRequest,actor.pendingFarmArrivalRequest);
    if(actor?.pendingFarmArrivalRequest&&!farmArrival&&(assigned||handle||revoked||homeRequest&&!pendingFarmHome||initialIdleRequest||idleStrollRequest||actionRequest||idleCycle||idleCycleNext||event.state===2||event.state===7||taskRequest&&event.type!=='IntentChanged'))throw Error('Native farm arrival transition requires prepared admission');
    if(stroll&&(!actor||(stroll.reference.sourceSettlement?!settledStroll:stroll.reference.sourceFarm?!completedFarmStroll:current||(stroll.reference.sourceRequest?actor.state!==6||actor.latestSequence!==actor.pendingIdleStrollRequest?.requestSequence:actor.state!==7||!actor.idleCycleSource||actor.latestSequence!==actor.pendingIdleCycleRequest?.requestSequence)||!strollSelectedSourceMatches(stroll.reference,actor.pendingIdleCycleRequest,actor.pendingIdleStrollRequest)||!strollSelectedSourceMatches(stroll.preparedReference,actor.pendingIdleCycleRequest,actor.pendingIdleStrollRequest))))throw Error('Native Idle stroll acquisition lacks its exact selected cycle');
    if(assigned&&actor?.state===7&&actor.pendingIdleCycleRequest?.idleState.mode==='walk'&&!event.taskId&&!event.targetId&&!stroll)throw Error('Native Idle stroll acquisition omitted its typed source');
    if(assigned&&actor?.pendingIdleStrollRequest&&!event.taskId&&!event.targetId&&!stroll)throw Error('Native restored stroll acquisition omitted its typed source');
    if(idleStrollRequest&&(current||actor.closed||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingIdleStrollRequest||actor.pendingInitialIdleRequest||actor.pendingFarmArrivalRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.idleCycleSource||actor.strollProof||actor.revoked||actor.initialIdleBodySource||actor.settlementSource||actor.actionProof))throw Error('Native restored stroll request cannot replace an existing owner');
    const pendingStroll=actor?.pendingIdleStrollRequest;
    if(homeRequest&&pendingStroll&&!nativeHomeRequestContinuesInitialIdle(homeRequest,pendingStroll))
      throw Error('Native Home differs from its pending restored stroll body');
    const pendingStrollFlight=homeRequest?.version===2&&pendingStroll&&event.type==='IntentChanged'&&!current&&!handle&&!revoked&&
      actor.state===6&&actor.latestSequence===pendingStroll.requestSequence&&event.strollFlightSequence===pendingStroll.requestSequence;
    if(event.strollFlightSequence!==undefined&&!pendingStrollFlight)throw Error('Native Home flight lacks its pending restored stroll source');
    if(current?.issuedStroll&&event.type==='RouteCompleted'&&event.state===7&&!idleCycle)throw Error('Native Idle stroll completion omitted its stationary source');
    if(idleCycle&&(!actor||!cyclePreparationSourceMatches(idleCycle.reference,actor)))throw Error('Native Idle cycle acquisition has no exact admitted body source');
    if(idleCycleNext&&(!actor||actor.state!==7||actor.pendingIdleCycleRequest||!sameNativeIdleCycleAttestation(actor.idleCycleSource?.binding,idleCycleNext.sourceCycle)||!stationarySequenceCurrent(actor,21,idleCycleNext.sourceCycle.cycleSequence)))throw Error('Native Idle cycle successor has no current native cycle');
    const pendingTaskCancellation=event.pendingTaskCancellation===undefined?null:copyNativePendingTaskCancellation(event.pendingTaskCancellation);
    if(pendingTaskCancellation){
      const {request,owner}=pendingTaskCancellation,stationary=owner.kind===21?actor?.idleCycleProof:actor?.initialIdleBodyProof,ref=stationary?.reference;
      if(event.type!=='IntentChanged'||event.state!==7||current||handle||revoked||event.taskId||event.targetId||taskRequest||actionRequest||homeRequest||initialIdleRequest||idleStrollRequest||farmArrivalRequest||idleCycle||idleCycleNext||
         actor?.state!==6||actor.latestSequence!==request.requestSequence||actor.taskId!==request.taskId||actor.targetId!==request.targetId||!actor.pendingTaskRequest||JSON.stringify(request)!==JSON.stringify(actor.pendingTaskRequest)||
         pendingTaskCancellation.sequence!==event.sequence||pendingTaskCancellation.effectiveTime!==event.effectiveTime||
         !ref||ref.bodyId!==owner.bodyId||ref.worldBoundary.ticket!==owner.ticket||ref.worldBoundary.nativeSession!==request.requestHandle.session||
         (owner.kind===21?owner.sequence!==stationary.cycleSequence||owner.endTime!==ref.worldBoundary.effectiveTime+ref.duration||!cycleRecordCurrent(ref,actor):
           !!actor.idleCycleSource||owner.sequence!==stationary.bodySequence||!initialBodyRecordCurrent(ref,actor)))throw Error('Native pending Task cancellation lacks its retained Idle owner');
    }
    if(actor?.idleCycleSource&&event.type==='IntentChanged'&&event.state===7&&!idleCycle&&!idleCycleNext&&pendingTaskCancellation?.owner.kind!==21)throw Error('Native Idle cycle event omitted its typed source');
    const stoppedRouteSourceRequired=!!actor?.stoppedProjection||!current&&actor?.revoked?.revokedState===4&&!!(actor.revoked.issuedStroll||actor.revoked.issuedFarmArrival||actor.revoked.taskStopBodyId);
    const heldHomeSource=homeRequest&&actor?.stoppedProjection?stoppedHomeSource(actor):null;
    const heldTaskHome=homeRequest&&stoppedTaskHomeMatches(actor,homeRequest);
    if(homeRequest&&stoppedRouteSourceRequired&&!heldTaskHome&&(!heldHomeSource||!nativeHomeRequestContinuesHeldWorker(homeRequest,heldHomeSource)))throw Error('Native Home differs from its actual stopped worker body');
    const heldTaskSource=taskRequest?stoppedHomeSource(actor):null;
    if(taskRequest&&stoppedRouteSourceRequired&&!heldTaskSource)throw Error('Native task request lacks its actual stopped worker body');
    const keepStoppedBody=!!(heldHomeSource||heldTaskHome||heldTaskSource)&&!current&&event.type==='IntentChanged'&&event.state===6;
    const keepIdleCycle=!!actor?.idleCycleSource&&!current&&event.type==='IntentChanged'&&(pendingTaskCancellation?.owner.kind===21||!!idleCycleNext||event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state));
    const phaseDelay=idleCycle?inheritedIdleCyclePhaseDelay(idleCycle,actor):0;
    if(keepIdleCycle&&homeRequest&&!cycleHomeMatches(homeRequest,actor.idleCycleSource.binding))throw Error('Native Home differs from its held Idle cycle body');
    const idleFlight=keepIdleCycle&&actor.state===7&&event.state===6&&!assigned&&!handle&&!revoked&&
      !actor.pendingHomeRequest&&cycleState(actor,actor.idleCycleSource.binding);
    const strollFlightSource=homeRequest?.version===2?
      (completedStrollHome?current.issuedStroll:heldHomeSource?.kind==='native-idle-stroll-held-execution'?actor.revoked.issuedStroll:null):null;
    const strollFlight=strollFlightSource&&[...actors.values()].some(peer=>{
      const birth=peer.raidFlightBirth;
      return birth?.workerActor===event.actorId&&birth.raidSpawnSequence===homeRequest.raidSpawnSequence&&
        birth.sourceSequence===strollFlightSource.assignmentSequence&&birth.strollTicket===strollFlightSource.reference.worldBoundary.ticket&&
        birth.workerBody===homeRequest.bodyId;
    });
    const taskFlightSource=homeRequest?.version===2?(completedTaskHome?current.issuedStart:heldTaskHome?actor.revoked.issuedStart:null):null;
    const taskFlight=taskFlightSource&&[...actors.values()].some(peer=>{
      const birth=peer.raidFlightBirth;
      return birth?.workerActor===event.actorId&&birth.raidSpawnSequence===homeRequest.raidSpawnSequence&&
        birth.sourceSequence===taskFlightSource.assignmentSequence&&birth.taskTicket===taskFlightSource.reference.worldBoundary.ticket&&
        birth.workerBody===homeRequest.bodyId;
    });
    if(actor?.idleCycleRecord?.lastDrawTime!=null&&event.effectiveTime<actor.idleCycleRecord.lastDrawTime){const error=Error('Native Idle cycle revocation arrived after its presented time');error.code='native-idle-cycle-revocation-late';throw error;}
    if(initialIdleRequest&&(current||actor.taskId||actor.targetId||actor.state!==null&&actor.state!==6||actor.pendingInitialIdleRequest||actor.pendingIdleStrollRequest||actor.pendingFarmArrivalRequest||actor.pendingTaskRequest||actor.pendingActionRequest||actor.pendingHomeRequest||actor.proof||actor.startProof||actor.actionProof||actor.consequenceProof||actor.settlementProof||actor.settlementSource||actor.homeProof||actor.initialIdleBodyProof||actor.initialIdleBodySource))throw Error('Native initial Idle request cannot replace an existing owner');
    const pendingInitialIdle=actor?.pendingInitialIdleRequest,initialBody=actor?.initialIdleBodySource;
    if(homeRequest&&pendingInitialIdle&&!nativeHomeRequestContinuesInitialIdle(homeRequest,pendingInitialIdle))throw Error('Native Home request differs from its pending initial Idle body');
    const initialBodyRequest=initialBody?.request;
    if(homeRequest&&initialBodyRequest&&!nativeHomeRequestContinuesInitialIdle(homeRequest,initialBodyRequest))throw Error('Native Home request differs from its held initial Idle body');
    const initialIdleFlight=homeRequest?.version===2&&event.type==='IntentChanged'&&!current&&!handle&&!revoked&&
      (pendingInitialIdle&&actor.state===6&&actor.latestSequence===pendingInitialIdle.requestSequence&&event.initialIdleFlightSequence===pendingInitialIdle.requestSequence||
       initialBody&&actor.state===7&&stationarySequenceCurrent(actor,20,initialBody.bodySequence)&&event.initialIdleFlightSequence===initialBody.bodySequence);
    if(event.initialIdleFlightSequence!==undefined&&!initialIdleFlight)throw Error('Native Home flight lacks its initial Idle source');
    const repair=actor?.actionProof;
    const repairFlight=event.repairFlightSequence!==undefined&&!!repair&&event.repairFlightSequence===repair.actionSequence&&
      event.type==='IntentChanged'&&event.state===6&&!handle&&!revoked&&!assigned&&!event.taskId&&!event.targetId&&
      !event.initialIdleFlightSequence&&!event.strollFlightSequence&&actionCurrent(repair.reference,actor)&&nativeHomeRequestContinuesRepairAction(homeRequest,repair);
    if(event.repairFlightSequence!==undefined&&!repairFlight)throw Error('Native Home flight lacks its acquired Repair action');
    if(homeRequest?.version===2&&!pendingFarmHome&&!completedFarmHome&&!idleFlight&&!strollFlight&&!pendingStrollFlight&&!initialIdleFlight&&!taskFlight&&!repairFlight&&heldHomeSource?.kind!=='native-farm-arrival-held-execution')
      throw Error('Native raid flight requires its Farm, Idle or Task source');
    const keepInitialBody=!!initialBodyRequest&&!current&&event.type==='IntentChanged'&&(pendingTaskCancellation?.owner.kind===20||event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state));
    if(actor?.pendingInitialIdleRequest&&event.state===7&&(event.type!=='IntentChanged'||current||handle||revoked||event.taskId||event.targetId||event.taskRequest||event.actionRequest||event.homeRequest||event.initialIdleRequest))throw Error('Native initial Idle body acquisition conflicts with its pending source');
    const completedInitialBody=actor?.pendingInitialIdleRequest&&!current&&event.type==='IntentChanged'&&event.state===7&&!handle&&!revoked&&!event.taskId&&!event.targetId?{request:actor.pendingInitialIdleRequest,bodySequence:event.sequence,at:event.effectiveTime}:null;
    const declaredAction=actor?.pendingActionRequest;
    const adoptedPendingAction=declaredAction&&actor.state===6&&actor.latestSequence===declaredAction.requestSequence&&
      event.type==='IntentChanged'&&event.state===7&&!current&&!handle&&!revoked&&!event.taskId&&!event.targetId?
      {pendingActionSource:declaredAction,bodySequence:event.sequence,at:event.effectiveTime}:null;
    const action=actor?.actionProof;
    const adoptsActionBody=action&&actionCurrent(action.reference,actor)&&event.type==='IntentChanged'&&event.state===7&&
      !handle&&!revoked&&!event.taskId&&!event.targetId;
    const completedAction=adoptsActionBody&&['initial','water','repair'].includes(action.reference.request.actionKind)&&event.effectiveTime>=action.reference.endTime;
    const adoptedAction=adoptsActionBody?{...(completedAction?{actionSource:action}:{}),cancelledActionSource:action,bodySequence:event.sequence,at:event.effectiveTime}:null;
    const taskRouteSource=event.state===7&&!handle&&!event.taskId&&!event.targetId&&actor?.taskId&&actor?.targetId&&
      (event.type==='RouteCompleted'&&revoked&&current?.issuedStart||event.type==='IntentChanged'&&!revoked&&!current&&actor.state===4)?currentTaskRouteCancellationOwner(actor):null;
    const adoptedTaskRoute=taskRouteSource?{taskRouteSource,bodySequence:event.sequence,at:event.effectiveTime}:null;
    if(actor?.initialIdleBodyRecord?.lastDrawTime!==null&&actor?.initialIdleBodyRecord?.lastDrawTime!==undefined&&event.effectiveTime<actor.initialIdleBodyRecord.lastDrawTime){const error=Error('Native initial Idle body revocation arrived after its presented time');error.code='native-initial-idle-body-revocation-late';throw error;}
    const retiringCarry=current&&actor?.consequenceProof&&consequenceCurrent(actor.consequenceProof.reference,actor)?actor.consequenceProof:null;
    if(homeRequest&&actor?.settlementProof&&!nativeHomeRequestContinuesIdle(homeRequest,actor.settlementProof))throw Error('Native Home request differs from its held Idle body');
    const keepSettlement=!!actor&&!actor.settlementProof?.reference.home&&!current&&event.type==='IntentChanged'&&event.state===6&&!!(taskRequest||homeRequest)&&[6,7].includes(actor.state)&&!!(actor.settlementProof||actor.settlementSource);
    if(actor?.settlementRecord?.lastDrawTime!==null&&actor?.settlementRecord?.lastDrawTime!==undefined&&event.effectiveTime<actor.settlementRecord.lastDrawTime){const error=Error('Native settlement revocation arrived after its presented time');error.code='native-settlement-revocation-late';throw error;}
    if(actor?.actionRecord&&actor.actionRecord.lastDrawTime!==null&&event.effectiveTime<actor.actionRecord.lastDrawTime){const error=Error('Native action revocation arrived after its presented time');error.code='native-action-revocation-late';throw error;}
    const sourceSuspension=assigned&&actor?.proof&&suspendedCurrent(actor.proof,actor.revoked,actor)?{reference:actor.proof,sequence:actor.latestSequence}:null;
    const sourceStoppedTaskBody=assigned&&actor?.proof&&stoppedTaskCurrent(actor,actor.revoked,actor.proof)?actor.proof:null;
    const sourceFarmArrivalHeld=assigned&&farmArrival?.reference.sourceHeld?farmArrival.reference.sourceHeld:null;
    const sourceCompletedFarm=assigned?(completedFarmGoalRecord(actor)?.issuedFarmArrival??null):null,sourceCompletedStroll=assigned?(completedStrollHomeRecord(actor)?.issuedStroll??null):null;
    const sourceCompletedTask=assigned?(completedTaskHomeRecord(actor)?.issuedStart??null):null;
    const sourceSettledApproach=settledStroll?stroll.reference.sourceSettlement:null;
    const sourceFarmApproach=completedFarmStroll?Object.freeze({proof:actor.farmArrivalProof,admitted:current.farmArrivalAdmitted===true}):null;
    if(current?.cropBinding && current.lastDrawTime!==null && event.effectiveTime<current.lastDrawTime)
      throw Error('Native crop owner changed after its submitted time');
    if(actor?.cropRequest&&assigned&&!crop)throw Error('Native crop assignment omitted its typed source');
    if(actor&&!actors.has(event.actorId))actors.set(event.actorId,actor);
    if(successor){actor.cropRequest=successor;actor.encounterRetreatRequest=continuedEncounter?successor:null;actor.cropPredecessor=birth||centerBirth||continuedEncounter||event.pendingAnimalCrop.previousShieldCrop?null:finishedCrop.reference;if(birth)actor.raidFlightBirth=Object.freeze({...birth});}
    if(current?.cropBinding?.reference.kind===27&&(restoredStrikeEnd||revoked&&event.type==='RouteInvalidated')&&
        event.effectiveTime>=current.cropBinding.reference.endTime){
      finishedCrop={...current.cropBinding,retiredSequence:event.sequence,retiredAt:event.effectiveTime};
    }else if(!successor&&!(event.type==='IntentChanged'&&actor?.cropRequest&&event.state===5)){
      finishedCrop=null;
    }
    if(current&&(revoked||restoredStrikeEnd)){
      if(exhaustion)current.nativeEncounterExhaustion=Object.freeze({...exhaustion,first:Object.freeze({...exhaustion.first})});
      if(shieldStop){current.nativeShieldCropStop=shieldStop;current.nativeShieldCropPolygon=event.nativeShieldCropPolygon;}
      current.revokedSequence=event.sequence;current.revokedState=Number.isInteger(event.state)?event.state:null;
      if(actor){actor.revoked=current;actor.current=null;actor.proof=null;}
      current.safeUntil=Math.min(current.safeUntil,completedTaskHome?current.issuedStart.reference.endTime:completedStrollHome?current.issuedStroll.reference.endTime:completedFarmGoal||completedFarmCycle||completedFarmStroll?current.issuedFarmArrival.reference.endTime:event.effectiveTime,cancelledFarm?current.issuedFarmArrival.reference.endTime:Infinity);
      active.delete(event.actorId);counters.revoked++;
    }
    const sourceHome=assigned&&actor?.settlementProof?.reference.home&&settlementCurrent(actor.settlementProof.reference,actor)?actor.settlementProof:null,sourceTaskRequest=assigned?actor?.pendingTaskRequest??null:null,sourceAction=assigned&&actor?.actionProof&&actionCurrent(actor.actionProof.reference,actor)?actor.actionProof:null;
    if(assigned){const record={actorId:event.actorId,handle:Object.freeze({...handle}),
      assignmentSequence:event.sequence,startTime:event.effectiveTime,
      safeUntil:Infinity,lastDrawTime:null,actor,sourceSuspension,sourceStoppedTaskBody,sourceCompletedTask,sourceCompletedFarm,sourceCompletedStroll,sourceFarmApproach,sourceSettledApproach,sourceTaskRequest,sourceAction,sourceHome,sourceHomeRequest:actor?.pendingHomeRequest??null,sourceInitialIdleBody:actor?.initialIdleBodySource?.request??null,sourceIdleCycle:actor?.idleCycleSource?.binding??null,sourceIdleCycleNext:actor?.pendingIdleCycleRequest??null,sourceStrollRequest:actor?.pendingIdleStrollRequest??null,sourceFarmArrivalRequest:actor?.pendingFarmArrivalRequest??(sourceFarmArrivalHeld?farmArrival.reference.sourceRequest:null),sourceFarmArrivalHeld,issuedFarmArrival:farmArrival,sourceIdleCycleAdmitted:!!actor?.idleCycleProof&&cycleRecordCurrent(actor.idleCycleProof.reference,actor),issuedStroll:stroll};active.set(event.actorId,record);actor.current=record;actor.proof=null;}
    if(crop){
      if(crop.restore){
        const record={actorId:event.actorId,handle:null,assignmentSequence:event.sequence,startTime:event.effectiveTime,
          safeUntil:Infinity,lastDrawTime:null,actor};
        actor.current=record;active.set(event.actorId,record);
      }
      actor.current.issuedCrop=Object.freeze({...crop,...(crop.restore?{restore:actor.cropRequest.restore}:{})});
      if(crop.kind===27)actor.current.cropStrikeRecord={startTime:event.effectiveTime,safeUntil:Infinity,lastDrawTime:null};
    }
    if(current?.cropStrikeRecord&&(revoked||restoredStrikeEnd)){
      const strike=current.cropStrikeRecord;
      strike.safeUntil=Math.min(strike.safeUntil,event.effectiveTime);
    }
    if(actor){
      if(keepStoppedBody){actor.revoked.stoppedHomeRequest=homeRequest;actor.revoked.stoppedTaskRequest=taskRequest;}
      if(!keepIdleCycle){if(actor.idleCycleRecord)actor.idleCycleRecord.safeUntil=Math.min(actor.idleCycleRecord.safeUntil,event.effectiveTime);actor.idleCycleProof=null;actor.idleCycleRecord=null;actor.idleCycleSource=idleCycle?{binding:idleCycle,fromBaseline:false,phaseUntil:Infinity,phaseDelay}:null;actor.pendingIdleCycleRequest=null;}
      else if(event.state===6){
        if(taskRequest)actor.idleCycleSource.phaseBeforeTask=actor.idleCycleSource.phaseUntil;
        actor.idleCycleSource.phaseUntil=Math.min(actor.idleCycleSource.phaseUntil,event.effectiveTime);
        if(actor.idleCycleRecord)actor.idleCycleRecord.phaseUntil=Math.min(actor.idleCycleRecord.phaseUntil,event.effectiveTime);
      }else if(pendingTaskCancellation){
        const source=actor.idleCycleSource;
        source.phaseUntil=Math.min(source.phaseBeforeTask??source.phaseUntil,pendingTaskCancellation.owner.endTime);
        actor.idleCycleRecord.phaseUntil=source.phaseUntil;
        delete source.phaseBeforeTask;
      }
      if(idleCycleNext)actor.pendingIdleCycleRequest=idleCycleNext;
      if(!keepInitialBody){if(actor.initialIdleBodyRecord)actor.initialIdleBodyRecord.safeUntil=Math.min(actor.initialIdleBodyRecord.safeUntil,event.effectiveTime);actor.initialIdleBodyProof=null;actor.initialIdleBodyRecord=null;actor.initialIdleBodySource=completedInitialBody??adoptedAction??adoptedTaskRoute??adoptedPendingAction;}
      if(!keepSettlement){if(actor.settlementRecord)actor.settlementRecord.safeUntil=Math.min(actor.settlementRecord.safeUntil,event.effectiveTime);actor.settlementProof=null;actor.settlementRecord=null;actor.settlementSource=event.type==='RouteCompleted'&&event.state===7&&retiringCarry?{proof:retiringCarry,record:current}:null;}
      if(actor.actionRecord)actor.actionRecord.safeUntil=Math.min(actor.actionRecord.safeUntil,event.effectiveTime);actor.actionSourceRequest=event.state===2?actor.pendingActionRequest:null;actor.pendingActionRequest=actionRequest;actor.actionProof=null;actor.actionRecord=null;if(!completedTaskHome)actor.startProof=null;actor.consequenceProof=null;actor.homeProof=null;if(!completedStrollHome)actor.strollProof=null;if(!completedFarmGoal)actor.farmArrivalProof=null;actor.pendingTaskRequest=taskRequest;actor.resumeProof=null;if(!keepStoppedBody)actor.stoppedProjection=null;actor.latestSequence=event.sequence;actor.state=assigned?1:Number.isInteger(event.state)?event.state:null;
      // NeedsPlan retains its existing intent and revoked record, never a draw clock.
      if(!actor.current&&actor.state!==0&&actor.state!==2&&actor.state!==4&&actor.state!==6&&actor.state!==7){actor.closed=true;actors.delete(event.actorId);}}
    if(farmArrivalRequest&&retiredRefuge?.reference.actorId===event.actorId)retiredRefuge=null;
    if(actor){actor.pendingTaskCancellation=pendingTaskCancellation;actor.pendingHomeRequest=homeRequest;actor.pendingInitialIdleRequest=initialIdleRequest;actor.pendingIdleStrollRequest=idleStrollRequest;actor.pendingFarmArrivalRequest=farmArrivalRequest;actor.taskId=event.taskId??null;actor.targetId=event.targetId??null;}
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
  function farmArrivalContinuationSourceMatches(reference,actor){
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&actor.state===4&&!!actor.proof&&suspendedCurrent(actor.proof,actor.revoked,actor)&&nativeFarmArrivalContinuesHeld(reference,stoppedWorkerSource(actor,farmStopFamily));
  }
  function farmArrivalRecordSourceMatches(reference,record){
    return !!record&&sameNativeFarmArrivalRequestReference(reference.sourceRequest,record.sourceFarmArrivalRequest)&&JSON.stringify(reference.sourceHeld)===JSON.stringify(record.sourceFarmArrivalHeld??undefined);
  }
  function stoppedHomeSource(actor){return stoppedWorkerSource(actor,strollStopFamily)??stoppedWorkerSource(actor,farmStopFamily);}
  function stoppedTaskHomeMatches(actor,request){
    const record=actor?.revoked,projection=actor?.stoppedProjection,proof=record?.stopProof,body=actor?.proof;
    if(proof?.kind!==taskStopFamily.codec.attestationKind||projection?.proof!==proof||!body||
       !matches(record,proof.reference.sourceRoute)||!matches(record,body.nativeRoute)||record.taskStopBodyId!==body.bodyId||
       !suspendedCurrent(body,record,actor)||request.actorId!==body.nativeRoute.actorId||request.bodyId!==body.bodyId||
       request.authorityEpoch!==body.worldBoundary.authorityEpoch||request.nativeSession!==body.worldBoundary.nativeSession||
       request.requestSequence<=record.revokedSequence||request.requestedAt<body.suspendedAt)return false;
    // WASM validates radius, profile and flags when issuing the request for
    // this exact retained body. The presentation receipt owns its pose.
    const pose=projection.homePose();
    return ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>request.pose[key]===pose[key]);
  }
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
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&proof?.assignmentSequence===record.assignmentSequence&&record.startTime===proof.reference.worldBoundary.effectiveTime&&nativeTaskStartAttestationCovers(proof,reference)||completedTaskHomeCurrent(reference,actor);
  }
  function actionCurrent(reference,actor){
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(nativeTaskActionActor(reference.request))===actor&&actor.state===2&&actor.current===null&&actor.actionRecord?.actionSequence===actor.latestSequence&&actor.actionProof?.actionSequence===actor.latestSequence&&nativeTaskActionAttestationCovers(actor.actionProof,reference);
  }
  function sameActionProof(a,b){return !!a&&!!b&&a.actionSequence===b.actionSequence&&sameNativeTaskActionReference(a.reference,b.reference)&&sameNativeTaskActionReference(a.preparedReference,b.preparedReference);}
  function currentTaskRouteCancellationOwner(actor){
    const current=actor?.current,record=current??actor?.revoked,start=record?.issuedStart;
    if(!start)return null;
    if(current)return startCurrent(start.reference,actor)?{start}:null;
    const body=actor.proof,projection=actor.stoppedProjection;
    return body&&projection&&record.stopProof===projection.proof&&suspendedCurrent(body,record,actor)?
      {start,body,projection}:null;
  }
  function taskRouteCancellationMatches(source,owner){
    if(source.phase===14)return nativeTaskCancellationMatchesTerminalRoute(source,owner?.start);
    const {start,body,projection}=owner??{};
    return !!body&&start.reference.taskId===source.taskId&&start.reference.targetId===source.targetId&&
      nativeTaskCancellationMatchesHeldRoute(source,{...body,pose:projection.homePose(source.pose.radius)},body.resumeGeneration);
  }
  function consequenceCurrent(reference,actor){
    const record=actor?.current,proof=actor?.consequenceProof;
    return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&nativeTaskConsequenceAttestationCovers(proof,reference);
  }
  function sameSettlementProof(a,b){return !!a&&!!b&&a.settlementSequence===b.settlementSequence&&sameNativeTaskSettlementReference(a.reference,b.reference)&&sameNativeTaskSettlementReference(a.preparedReference,b.preparedReference);}
  function strollRecordCurrent(reference,actor){const record=actor?.current,proof=actor?.strollProof;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===record&&!!record&&actor.latestSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&record.startTime===proof?.reference.worldBoundary.effectiveTime&&proof?.assignmentSequence===record.assignmentSequence&&proof.assignmentSequence<=clock.intentSequence||completedStrollHomeCurrent(reference,actor);}
  function completedTaskHomeRequestMatches(request,record){
    const proof=record?.issuedStart,r=proof?.reference;
    // The final pose is declared by the native Home source. Retain only the
    // previously acquired Task data, at its finite endpoint, for this body.
    return !!r&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&
      request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&
      request.requestSequence>record.assignmentSequence&&request.requestedAt>=r.endTime;
  }
  function completedTaskHomeRecord(actor){
    const record=actor?.revoked,request=actor?.pendingHomeRequest,r=record?.issuedStart?.reference;
    return !closed&&!!r&&!!request&&!actor.pendingTaskRequest&&!actor.pendingActionRequest&&!actor.closed&&actors.get(r.actorId)===actor&&actor.current===null&&actor.state===6&&record.revokedState===6&&record.safeUntil===r.endTime&&actor.latestSequence===record.revokedSequence&&request.requestSequence===record.revokedSequence&&completedTaskHomeRequestMatches(request,record)?record:null;
  }
  function completedTaskHomeCurrent(reference,actor){
    const record=completedTaskHomeRecord(actor),proof=actor?.startProof,request=actor?.pendingHomeRequest;
    return !!record&&!!clock&&proof===record.issuedStart&&proof.assignmentSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&nativeTaskStartAttestationCovers(proof,reference)&&request.requestSequence<=clock.intentSequence&&request.requestedAt<=clock.committedThrough;
  }

  function completedFarmHomeRequestMatches(request,record){
    const r=record?.issuedFarmArrival?.reference,q=r?.sourceRequest;
    return !!q&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===q.profile&&request.pose.radius===q.pose.radius&&request.pose.x===r.destination.x&&request.pose.z===r.destination.z&&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>record.assignmentSequence&&request.requestedAt>=r.endTime;
  }
  function completedStrollHomeRequestMatches(request,record){
    const r=record?.issuedStroll?.reference;
    return !!r&&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===r.bodyFlags&&request.profile===r.profile&&request.pose.radius===r.pose.radius&&request.pose.x===Math.fround(r.destination.x)&&request.pose.z===Math.fround(r.destination.z)&&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession&&request.requestSequence>record.assignmentSequence&&request.requestedAt>=r.endTime;
  }
  function completedStrollHomeRecord(actor){
    const record=actor?.revoked,request=actor?.pendingHomeRequest,r=record?.issuedStroll?.reference;
    return !closed&&!!r&&!!request&&!actor.pendingTaskRequest&&!actor.closed&&actors.get(r.actorId)===actor&&actor.current===null&&actor.state===6&&record.revokedState===6&&record.safeUntil===r.endTime&&actor.latestSequence===record.revokedSequence&&request.requestSequence===record.revokedSequence&&completedStrollHomeRequestMatches(request,record)?record:null;
  }
  function completedStrollHomeCurrent(reference,actor){
    const record=completedStrollHomeRecord(actor),proof=actor?.strollProof,request=actor?.pendingHomeRequest;
    return !!record&&!!clock&&record.strollAdmitted===true&&!!proof&&proof.assignmentSequence===record.assignmentSequence&&sameHandle(record.handle,reference.expectedRouteHandle)&&request.requestSequence<=clock.intentSequence&&request.requestedAt<=clock.committedThrough;
  }
  // Correlate one provisional/issued21 with the real23 endpoint. Native21
  // supplies its pose/phases; installation still matches its full attestation.
  // No JS trajectory evaluation or retrospective parent GPU permission.
  function completedFarmCycleSourceMatches(reference,record){
    const r=record?.issuedFarmArrival?.reference,q=r?.sourceRequest,s=reference.sourceBody,p=s?.pose;
    return !!q&&reference.sourceCycleSequence===0&&s.kind==='native-farm-arrival-idle-source'&&s.actorId===r.actorId&&s.bodyId===r.bodyId&&s.profile===q.profile&&s.workerProfile===q.workerProfile&&s.centerId===q.centerId&&s.bodyFlags===q.bodyFlags&&s.authorityEpoch===r.worldBoundary.authorityEpoch&&s.nativeSession===r.worldBoundary.nativeSession&&s.sourceSequence===record.assignmentSequence&&s.sourceAt===r.endTime&&reference.worldBoundary.effectiveTime>=r.endTime&&p.radius===q.pose.radius&&p.x===r.destination.x&&p.z===r.destination.z;
  }
  // Approach22 borrows the same actual23 body proof as stationary21.
  // Only bounded source metadata survives in the new record, never an old
  // executable lease or a reconstructed native phase/trajectory.
  function completedFarmStrollSourceMatches(reference,record){
    return !!reference.sourceFarm&&reference.sourceCycleSequence===0&&completedFarmCycleSourceMatches({sourceCycleSequence:0,sourceBody:reference.sourceFarm,worldBoundary:reference.worldBoundary},record);
  }
  function strollFarmPreparationSourceMatches(reference,actor){
    const proof=actor?.farmArrivalProof;
    return !!proof&&actor.current?.farmArrivalAdmitted===true&&farmArrivalRecordCurrent(proof.reference,actor)&&completedFarmStrollSourceMatches(reference,actor.current);
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
  function stationarySequenceCurrent(actor,kind,ownerSequence){
    const cancelled=actor.pendingTaskCancellation;
    return actor.latestSequence===ownerSequence||cancelled?.sequence===actor.latestSequence&&cancelled.owner.kind===kind&&cancelled.owner.sequence===ownerSequence;
  }
  function initialBodyState(actor,proof){return actor.state===7&&stationarySequenceCurrent(actor,20,proof.bodySequence)||actor.state===6&&actor.latestSequence>proof.bodySequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence);}
  function initialBodyRecordCurrent(reference,actor){const proof=actor?.initialIdleBodyProof,record=actor?.initialIdleBodyRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&record.bodySequence===proof.bodySequence&&proof.bodySequence<=clock.intentSequence&&initialBodyState(actor,proof);}
  function cycleHomeMatches(request,proof){return nativeHomeRequestContinuesIdleCycle(request,proof);}
  function cycleState(actor,proof){return actor.state===7&&(stationarySequenceCurrent(actor,21,proof.cycleSequence)||actor.pendingIdleCycleRequest?.sourceCycle.cycleSequence===proof.cycleSequence&&actor.latestSequence===actor.pendingIdleCycleRequest.requestSequence)||actor.state===6&&actor.latestSequence>proof.cycleSequence&&(actor.pendingTaskRequest?.requestSequence===actor.latestSequence||actor.pendingHomeRequest?.requestSequence===actor.latestSequence);}
  function cycleRecordCurrent(reference,actor){const proof=actor?.idleCycleProof,record=actor?.idleCycleRecord;return !closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&!!proof&&!!record&&actor.idleCycleSource?.binding===proof&&record.cycleSequence===proof.cycleSequence&&proof.cycleSequence<=clock.intentSequence&&cycleState(actor,proof);}
  // Keep one cosmetic delay on the existing association, never old bindings.
  // Inherit only from an installed predecessor playing the same terminal clip.
  function inheritedIdleCyclePhaseDelay(binding,actor){
    const r=binding.reference,proof=actor?.idleCycleProof,previous=proof?.reference,record=actor?.idleCycleRecord;
    // Acquired17 uses a native origin-modulo Idle clock. Retain that phase
    // at the actual21 commit, not its prepared epoch or a Game wall clock.
    // The existing host drops phaseDelay at REST->WATCH's native knot.
    if(r.sourceCycleSequence===0&&r.sourceBody.kind==='native-settled-worker-idle-source'&&settledIdlePreparationSourceMatches(r.sourceBody,actor))return r.worldBoundary.effectiveTime;
    if(!r.sourceCycleSequence||proof?.cycleSequence!==r.sourceCycleSequence||!record||!cycleRecordCurrent(previous,actor))return 0;
    const terminal=previous.initialState.mode==='watch'||floorFloat32(previous.duration)>=nativeIdleCycleWatchKnot(previous)?'watch':'rest';
    if(r.initialState.mode!==terminal)return 0;
    const retained=r.initialState.mode===previous.initialState.mode?record.phaseDelay:0;
    return retained+Math.max(0,r.worldBoundary.effectiveTime-previous.worldBoundary.effectiveTime-previous.duration);
  }
  function settledIdlePreparationSourceMatches(value,actor){
    const proof=actor?.settlementProof;
    return !!proof&&!closed&&!!clock&&!actor.closed&&actors.get(value?.actorId)===actor&&actor.state===7&&actor.current===null&&actor.latestSequence===proof.settlementSequence&&proof.settlementSequence<=clock.intentSequence&&!actor.pendingTaskRequest&&!actor.pendingHomeRequest&&settlementRecordCurrent(proof.reference,actor)&&nativeSettledIdleSourceMatches(value,proof);
  }
  function cyclePreparationSourceMatches(reference,actor){
    if(!actor||actor.closed)return false;
    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-settled-worker-idle-source')return settledIdlePreparationSourceMatches(reference.sourceBody,actor);
    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-failed-source'){
      const request=actor.pendingIdleStrollRequest;
      return !!request&&idleStrollRequestCurrent(request,actor)&&sameNativeIdleStrollRequestReference(reference.sourceBody.sourceRequest,request)&&reference.worldBoundary.effectiveTime>=request.requestedAt;
    }
    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-farm-arrival-idle-source'){
      const proof=actor.farmArrivalProof;
      return !!proof&&farmArrivalRecordCurrent(proof.reference,actor)&&completedFarmCycleSourceMatches(reference,actor.current);
    }
    if(reference.sourceCycleSequence===0&&isNativeIdleStrollArrivalSource(reference.sourceBody)){
      const proof=actor.strollProof;return !!proof&&strollRecordCurrent(proof.reference,actor)&&nativeIdleStrollArrivalSourceMatches(reference.sourceBody,proof)&&reference.worldBoundary.effectiveTime>=reference.sourceBody.sourceAt;
    }
    if(actor.current||actor.state!==7)return false;
    if(reference.sourceCycleSequence===0){const proof=actor.initialIdleBodyProof;return !!proof&&initialBodyRecordCurrent(proof.reference,actor)&&JSON.stringify(proof)===JSON.stringify(reference.sourceBody);}
    const proof=actor.idleCycleProof,request=actor.pendingIdleCycleRequest;
    return !!proof&&!!request&&cycleRecordCurrent(proof.reference,actor)&&proof.cycleSequence===reference.sourceCycleSequence&&actor.latestSequence===request.requestSequence&&(request.idleState.mode==='rest'||reference.version===2&&request.idleState.mode==='watch')&&JSON.stringify(request.idleState)===JSON.stringify(reference.initialState)&&JSON.stringify(proof.reference.sourceBody)===JSON.stringify(reference.sourceBody);
  }
  // Immutable proof associations are checked once per installation. Every replay still
  // checks the live owner, sequence, state and route; revocation clears the proof.
  function proofLeaseCurrent(reference,actor,field,covers,recordCurrent){let observedProof=null,matchesProof=false;return ()=>{const proof=actor?.[field]??null;if(proof!==observedProof){observedProof=proof;matchesProof=!!proof&&covers(proof,reference);}return matchesProof&&recordCurrent(reference,actor);};}
  function installRouteStops(family,boundary,values=[],{bootstrap=false}={}){
    boundary=copyNativeWorldBoundary(boundary);
    if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Invalid native moving stop attestation boundary');
    const staged=[],ids=new Set(),bodies=new Set();
    for(const input of values){const value=family.codec.copyAttestation(input),{projection,...metadata}=value,proof=Object.freeze(metadata),r=proof.reference,root=actors.get(r.sourceRoute.actorId),rootRecord=root?.revoked,sourceOwner=r.routes.find(owner=>owner.nativeRoute.actorId===r.sourceRoute.actorId);
      if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||stopSourceBody(family,rootRecord)!==sourceOwner.bodyId||!matches(rootRecord,r.sourceRoute))throw Error(`Native moving stop lacks its admitted ${family.name} source`);
      if(family===taskStopFamily&&!projection)throw Error('Native task route stop requires its final projection');
      for(let i=0;i<r.routes.length;i++){const owner=r.routes[i],actor=actors.get(owner.nativeRoute.actorId),record=actor?.revoked;
        if(ids.has(owner.nativeRoute.actorId)||bodies.has(owner.bodyId)||!stoppedRecordCurrent(owner,boundary,actor,record)||record.stopProof||proof.preparedReference.worldBoundary.effectiveTime<record.startTime)throw Error('Native moving stop differs from its exact revocations');
        const reference=owner.state===4?stopBody(r,owner):null;
        if(actor.proof&&(reference===null||!sameNativeSuspendedBodyReference(actor.proof,reference)))throw Error('Native moving stop changed an installed body proof');
        ids.add(owner.nativeRoute.actorId);bodies.add(owner.bodyId);staged.push({actor,record,proof,reference,pose:projection?projection.routeEffects.rows.slice(i*26+8,(i+1)*26):null,gateProjection:projection?.gateEffects.rows??null});
      }
    }
    // All validation precedes every write, including a bad later proof.
    for(const {actor,record,proof,reference,pose,gateProjection} of staged){record.stopProof=proof;actor.proof=reference;actor.stoppedProjection=pose?Object.freeze({proof,readGate(gateId,mechanism){const i=proof.reference.gates.findIndex(g=>g.gateId===gateId&&g.mechanism===mechanism);if(i<0||!gateProjection)throw Error('Native stopped motor has no final projection');return gateProjection[i*3+2];},read(field){if(!Object.hasOwn(NATIVE_STOP_POSE_FIELDS,field))throw TypeError('Invalid native stopped pose field');return pose[NATIVE_STOP_POSE_FIELDS[field]];},homePose(radius){return Object.freeze({x:pose[0],z:pose[1],yaw:pose[4],radius,runPhase:pose[9],walkPhase:pose[10],carryPhase:pose[11],runRemaining:pose[14]});}}):null;}
    return staged.length;
  }
  function admitRouteStop(family,value,{preparingWorldBoundary=null}={}){
    const reference=family.codec.copyReference(value),boundary=copyNativeWorldBoundary(preparingWorldBoundary),root=actors.get(reference.sourceRoute.actorId),rootRecord=root?.current??root?.revoked,
      owners=reference.routes.map(owner=>{const actor=actors.get(owner.nativeRoute.actorId);return {owner,actor,record:actor?.current??actor?.revoked};});
    const sourceOwner=reference.routes.find(owner=>owner.nativeRoute.actorId===reference.sourceRoute.actorId);
    const sourceCurrent=()=>stopSourceBody(family,rootRecord)===sourceOwner.bodyId&&(family===taskStopFamily||
      !!root?.[family.proof]&&(family===farmStopFamily?farmArrivalRecordCurrent:strollRecordCurrent)(root[family.proof].reference,root));
    const pending=()=>!closed&&!!clock&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&clock.committedThrough>=reference.worldBoundary.effectiveTime&&sourceCurrent()&&owners.every(({owner,actor,record})=>!!actor&&!actor.closed&&actors.get(owner.nativeRoute.actorId)===actor&&actor.current===record&&active.get(owner.nativeRoute.actorId)===record&&actor.state===1&&matches(record,owner.nativeRoute)&&record.startTime<=reference.worldBoundary.effectiveTime);
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
    admitRestoredWallRepair(reference){
      const key=restoredWallRepairKey(reference),declaration=restoredRepairs.get(key);if(closed||!clock||!declaration)throw Error('Restored wall Repair has no current authority declaration');
      return Object.freeze({declaration,end:declaration.reference.at+WALL_REPAIR_DURATION,isCurrent:()=>!closed&&!!clock&&restoredRepairs.get(key)===declaration});
    },
    // Metadata only. It cannot authorize drawing, movement or installation of
    // an executable binding and expires with the existing actor/control record.
    pendingInitialIdleRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingInitialIdleRequest;return request&&initialIdleRequestCurrent(request,actor)?request:null;},
    pendingFarmArrivalRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingFarmArrivalRequest;return request&&farmArrivalRequestCurrent(request,actor)?request:null;},
    pendingIdleStrollRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingIdleStrollRequest;return request&&idleStrollRequestCurrent(request,actor)?request:null;},
    pendingIdleCycleRequest(actorId){const actor=actors.get(actorId),request=actor?.pendingIdleCycleRequest;return !closed&&!!clock&&!!request&&!actor.closed&&actor.state===7&&actor.current===null&&actor.latestSequence===request.requestSequence&&request.requestSequence<=clock.intentSequence?request:null;},
    accept,admitAnimalCrop,installAnimalCrop,verifyEncounterRetreatGo,shieldCropStopCurrent,shieldCropStopAtBoundary,shieldCropExpirySource,
    installIdleCycles(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native Idle cycle requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeIdleCycleAttestation(input),r=value.reference,actor=actors.get(r.actorId),source=actor?.idleCycleSource;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.cycleSequence>sequence||value.cycleSequence>clock.intentSequence||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.current||actor.actionProof||actor.settlementProof||actor.initialIdleBodyProof||actor.idleCycleProof||!source||source.fromBaseline||!sameNativeIdleCycleAttestation(value,source.binding)||actor.latestSequence>clock.intentSequence||!cycleState(actor,value))throw Error('Native Idle cycle differs from its issued program or current owner');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,source});
      }
      for(const {actor,source} of staged){const value=source.binding,r=value.reference;actor.idleCycleProof=value;actor.idleCycleRecord={actorId:r.actorId,bodyId:r.bodyId,cycleSequence:value.cycleSequence,startTime:r.worldBoundary.effectiveTime,phaseDelay:source.phaseDelay,phaseUntil:Math.min(r.worldBoundary.effectiveTime+r.duration,source.phaseUntil),safeUntil:Infinity,lastDrawTime:null};}return staged.length;
    },
    admitIdleCycle(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeIdleCycleReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),fromFailed=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-failed-source',fromStroll=reference.sourceCycleSequence===0&&isNativeIdleStrollArrivalSource(reference.sourceBody),fromFarm=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-farm-arrival-idle-source',fromSettlement=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-settled-worker-idle-source',source=reference.sourceCycleSequence?actor?.idleCycleProof:fromFailed?actor?.pendingIdleStrollRequest:fromStroll?actor?.strollProof:fromFarm?actor?.farmArrivalProof:fromSettlement?actor?.settlementProof:actor?.initialIdleBodyProof,next=actor?.pendingIdleCycleRequest,sourceMatches=cyclePreparationSourceMatches(reference,actor),current=proofLeaseCurrent(reference,actor,'idleCycleProof',nativeIdleCycleAttestationCovers,cycleRecordCurrent);
      let observed=null,issuedMatches=false;
      const issued=()=>{const found=actor?.idleCycleSource??null;if(found!==observed){observed=found;issuedMatches=!!found&&!found.fromBaseline&&nativeIdleCycleAttestationCovers(found.binding,reference);}return issuedMatches&&!closed&&!!clock&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.current===null&&cycleState(actor,observed.binding);};
      const pending=()=>sourceMatches&&!closed&&!!clock&&!actor.closed&&actors.get(reference.actorId)===actor&&(fromSettlement?actor.settlementProof===source&&cyclePreparationSourceMatches(reference,actor):fromFailed?actor.pendingIdleStrollRequest===source&&cyclePreparationSourceMatches(reference,actor):fromStroll||fromFarm?(fromFarm?actor.farmArrivalProof:actor.strollProof)===source&&cyclePreparationSourceMatches(reference,actor):actor.current===null&&actor.state===7&&(reference.sourceCycleSequence?actor.idleCycleProof===source&&actor.pendingIdleCycleRequest===next&&cycleRecordCurrent(source.reference,actor):actor.initialIdleBodyProof===source&&initialBodyRecordCurrent(source.reference,actor)))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&clock.intentSequence>=reference.sourceControlSequence&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native Idle cycle is obsolete or lacks its admitted source');error.code='native-idle-cycle-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get idleCycleRecord(){return current()?actor.idleCycleRecord:null;},get executionEpoch(){return current()?actor.idleCycleProof.reference.worldBoundary.effectiveTime:null;},get executionEnd(){return current()?actor.idleCycleRecord.phaseUntil:null;}});
    },
    installInitialIdleBodies(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native initial Idle body requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeInitialIdleBodyAttestation(input),r=value.reference,actor=actors.get(r.actorId),source=actor?.initialIdleBodySource;
        const action=nativeInitialIdleActionSource(r),cancellation=r.cancellationSource,
          sourceMatches=cancellation?cancellation.phase===6?nativeTaskCancellationMatchesPendingAction(cancellation,source?.pendingActionSource):cancellation.phase===15?nativeTaskCancellationMatchesAction(cancellation,source?.cancelledActionSource):taskRouteCancellationMatches(cancellation,source?.taskRouteSource):
            action?sameActionProof(source?.actionSource,action):sameNativeInitialIdleRequestReference(source?.request,r.sourceRequest);
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.bodySequence>sequence||value.bodySequence>clock.intentSequence||r.sourceControlSequence!==value.bodySequence-1||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.current||actor.actionProof||actor.settlementProof||actor.initialIdleBodyProof||!sourceMatches||source.bodySequence!==value.bodySequence||source.at!==boundary.effectiveTime||!initialBodyState(actor,value))throw Error('Native initial Idle body differs from its issued request or current owner');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged){
        const r=value.reference;
        if(r.cancellationSource?.phase===25){actor.revoked=null;actor.proof=null;actor.stoppedProjection=null;}
        actor.initialIdleBodySource.request=r.sourceRequest;actor.initialIdleBodyProof=value;actor.initialIdleBodyRecord={actorId:r.actorId,bodyId:r.bodyId,bodySequence:value.bodySequence,startTime:r.worldBoundary.effectiveTime,safeUntil:Infinity,lastDrawTime:null};
      }return staged.length;
    },
    admitInitialIdleBody(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeInitialIdleBodyReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=actor?.pendingInitialIdleRequest,action=nativeInitialIdleActionSource(reference),cancellation=reference.cancellationSource,
        sourceMatches=!!source&&sameNativeInitialIdleRequestReference(reference.sourceRequest,source),
        current=proofLeaseCurrent(reference,actor,'initialIdleBodyProof',nativeInitialIdleBodyAttestationCovers,initialBodyRecordCurrent),
        pending=()=>sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime&&
          (cancellation?cancellation.phase===6?actor?.state===6&&actor.latestSequence===actor.pendingActionRequest?.requestSequence&&
            actor.pendingActionRequest?.authorityEpoch===authorityEpoch&&nativeTaskCancellationMatchesPendingAction(cancellation,actor.pendingActionRequest):cancellation.phase===15?!!actor?.actionProof&&actionCurrent(actor.actionProof.reference,actor)&&nativeTaskCancellationMatchesAction(cancellation,actor.actionProof):
            taskRouteCancellationMatches(cancellation,currentTaskRouteCancellationOwner(actor)):
            action?actionCurrent(action.reference,actor)&&sameActionProof(actor.actionProof,action):sourceMatches&&actor.pendingInitialIdleRequest===source&&initialIdleRequestCurrent(source,actor));
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
        if(closed||!clock||!sameNativeHomeArrivalReference(proof.preparedReference,reference)||proof.retiredSequence!==sequence||clock.intentSequence!==sequence||clock.committedThrough!==at||r.worldBoundary.nativeSession!==clock.nativeSession||actors.has(reference.actorId)||active.has(reference.actorId)||!actor.closed||actor.current!==null||actor.latestSequence!==proof.retiredSequence||actor.state!==5||actor.revoked!==record||record.revokedSequence!==proof.retiredSequence||record.revokedState!==5||record.safeUntil!==at||record.assignmentSequence!==home.assignmentSequence||!sameHandle(record.handle,home.reference.expectedRouteHandle))throw Error('Native Home absence lacks its issued retirement');
        if(home.reference.sourceRequest?.raidSpawnSequence)retiredRefuge=proof;
        return proof;
      };
      counters.admissions++;return Object.freeze({reference,isPrepared:prepared,validateCommitted});
    },

    installRecoveredRefuge(value,boundary){
      const proof=copyNativeHomeArrivalAttestation(value),r=proof.reference;
      if(closed||!clock||retiredRefuge||!r.sourceHome.reference.sourceRequest?.raidSpawnSequence||
         !nativeRecoveryCovers(boundary,r.worldBoundary)||boundary.authorityEpoch!==authorityEpoch||
         boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime>clock.committedThrough||
         proof.retiredSequence>clock.intentSequence||actors.has(r.actorId)||active.has(r.actorId))
        throw Error('Recovered Home absence conflicts with the fresh control baseline');
      // Its body stays retired. The receipt is consumed by the same civil
      // Farm request as it would have been on the original Draw.
      retiredRefuge=proof;
    },
    prepareRecoveredWorkerRoute(kind,input,boundary,{cohortSize=1,sharedCut=false}={}) {
      const profile=nativeWorkerRouteRecoveryProfile(kind),proof=profile.copyAttestation(input),ref=proof.reference;
      if(kind===27){
        const current=()=>!closed&&!!clock&&actors.size===0&&active.size===0&&
          proof.assignmentSequence===sequence&&clock.intentSequence===sequence&&clock.nativeSession===boundary.nativeSession&&
          clock.committedThrough>=boundary.effectiveTime&&clock.committedThrough<ref.endTime;
        if(!sameNativeWorldBoundary(boundary,ref.worldBoundary)||boundary.authorityEpoch!==authorityEpoch||!current())
          throw Error('Recovered strike conflicts with the fresh control baseline');
        const heldAt=clock.committedThrough;
        return ()=>{
          if(!current()||clock.committedThrough!==heldAt)throw Error('Recovered strike was revoked before materialization');
          const handle=ref.restore?null:Object.freeze({authorityEpoch,session:boundary.nativeSession,slot:ref.slot,generation:ref.generation});
          const actor=actorContext(ref.actorId),startTime=boundary.effectiveTime;
          const record={actorId:ref.actorId,handle,assignmentSequence:ref.routeAssignment??proof.assignmentSequence,startTime,
            safeUntil:Infinity,lastDrawTime:null,actor,recoveringWorkerRoute:true,recoveredCrop:true,cropBinding:proof,
            issuedCrop:Object.freeze({kind:27,session:boundary.nativeSession,targetId:ref.targetId,
              ...(ref.restore?{restore:ref.restore}:{})}),
            cropStrikeRecord:{startTime,safeUntil:Infinity,lastDrawTime:null,recoveredCrop:true}};
          actor.state=2;actor.latestSequence=proof.assignmentSequence;actor.targetId=ref.targetId;
          actor.cropRequest=copyPendingAnimalCrop({...ref,authorityEpoch,nativeSession:boundary.nativeSession});
          actor.current=record;active.set(ref.actorId,record);
        };
      }
      const actor=actors.get(ref.actorId),record=actor?.current;
      const handle=kind===26?{authorityEpoch:ref.worldBoundary.authorityEpoch,session:ref.worldBoundary.nativeSession,
        slot:ref.slot,generation:ref.generation}:ref.expectedRouteHandle;
      const source=ref.worldBoundary;
      if(closed||!clock||actors.size!==cohortSize||active.size!==cohortSize||proof.gateIds.length>profile.maxGates||
         !record||active.get(ref.actorId)!==record||record.lastDrawTime!==null||actor.strollProof||actor.farmArrivalProof||actor.homeProof||
         kind===18&&Boolean(ref.sourceRequest?.raidSpawnSequence)!==(cohortSize===2)||
         actor.latestSequence!==proof.assignmentSequence||!matches(record,{actorId:ref.actorId,assignmentSequence:proof.assignmentSequence,routeHandle:handle})||
         !(sharedCut?nativeRecoveryCovers(boundary,source):sameNativeWorldBoundary(boundary,source))||record.startTime!==source.effectiveTime||
         clock.nativeSession!==boundary.nativeSession||clock.intentSequence!==sequence||
         clock.committedThrough<record.startTime||clock.committedThrough>ref.endTime)
        throw Error('Recovered worker route conflicts with the fresh control baseline');
      // While this source is waiting, an ordinary route selector cannot use the slot.
      record.recoveringWorkerRoute=true;
      return ()=>{if(closed||actors.get(ref.actorId)!==actor||active.get(ref.actorId)!==record||
        actor.current!==record||actor.latestSequence!==proof.assignmentSequence||record.lastDrawTime!==null)
        throw Error('Recovered worker route was revoked before materialization');
        if(kind===26){
          actor.cropRequest=copyPendingAnimalCrop({...ref,authorityEpoch,nativeSession:boundary.nativeSession});
          actor.targetId=ref.targetId;
          record.issuedCrop=Object.freeze({kind:26,terminal:proof.terminal});
          record.cropBinding=proof;
          record.recoveredCrop=true;
          return;
        }
        actor[profile.proofField]=proof;
        if(profile.issuedField)record[profile.issuedField]=proof;
        if(profile.admittedField)record[profile.admittedField]=true;};
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
      const reference=copyNativeIdleStrollReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=reference.sourceSettlement?actor?.settlementProof:reference.sourceFarm?actor?.farmArrivalProof:reference.sourceRequest?actor?.pendingIdleStrollRequest:actor?.pendingIdleCycleRequest,
        current=proofLeaseCurrent(reference,actor,'strollProof',nativeIdleStrollAttestationCovers,strollRecordCurrent),
        pending=()=>!!source&&(reference.sourceSettlement?actor.settlementProof===source&&settledIdlePreparationSourceMatches(reference.sourceSettlement,actor):reference.sourceFarm?actor.farmArrivalProof===source&&strollFarmPreparationSourceMatches(reference,actor)&&clock.intentSequence>=reference.sourceControlSequence:reference.sourceRequest?idleStrollRequestCurrent(source,actor)&&sameNativeIdleStrollRequestReference(reference.sourceRequest,source):actor.pendingIdleCycleRequest===source&&!!actor.idleCycleProof&&cycleRecordCurrent(actor.idleCycleProof.reference,actor)&&nativeIdleStrollContinuesNext(reference,source))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime,
        issued=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===actor.current&&!!actor.current&&actor.latestSequence===actor.current.assignmentSequence&&actor.current.assignmentSequence>reference.sourceControlSequence&&sameHandle(actor.current.handle,reference.expectedRouteHandle)&&nativeIdleStrollAttestationCovers(actor.current.issuedStroll,reference)&&strollIssuedSourceMatches(reference,actor.current);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native Idle stroll is obsolete or lacks its direct selected source');error.code='native-idle-stroll-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get routeRecord(){return current()?(actor.current??actor.revoked):null;},get executionEpoch(){return current()?(actor.current??actor.revoked).startTime:null;},get executionEnd(){return current()?actor.strollProof.reference.endTime:null;}});
    },
    installFarmArrivals(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||bootstrap!==false||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Native farm arrival requires prepared admission at its current boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeFarmArrivalRouteAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current;
        if(!sameNativeWorldBoundary(r.worldBoundary,boundary)||value.assignmentSequence>sequence||value.assignmentSequence>clock.intentSequence||ids.has(r.actorId)||bodies.has(r.bodyId)||!actor||actor.closed||actor.state!==1||active.get(r.actorId)!==record||!record||actor.latestSequence!==record.assignmentSequence||actor.farmArrivalProof||actor.strollProof||actor.proof||actor.startProof||actor.homeProof||actor.actionProof||actor.settlementProof||actor.idleCycleProof||record.assignmentSequence!==value.assignmentSequence||record.startTime!==boundary.effectiveTime||!sameHandle(record.handle,r.expectedRouteHandle)||!sameNativeFarmArrivalRouteAttestation(value,record.issuedFarmArrival)||!farmArrivalRecordSourceMatches(r,record)||!farmArrivalRecordSourceMatches(value.preparedReference,record))throw Error('Native farm arrival differs from its issued program or pending source');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged){actor.farmArrivalProof=value;actor.current.farmArrivalAdmitted=true;}return staged.length;
    },
    admitFarmArrival(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeFarmArrivalRouteReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=actor?.pendingFarmArrivalRequest,
        current=proofLeaseCurrent(reference,actor,'farmArrivalProof',nativeFarmArrivalRouteAttestationCovers,farmArrivalRecordCurrent),
        pending=()=>(reference.sourceHeld?farmArrivalContinuationSourceMatches(reference,actor):!!source&&farmArrivalRequestCurrent(source,actor)&&sameNativeFarmArrivalRequestReference(reference.sourceRequest,source))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime,
        issued=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===1&&active.get(reference.actorId)===actor.current&&!!actor.current&&actor.latestSequence===actor.current.assignmentSequence&&nativeFarmArrivalRouteAttestationCovers(actor.current.issuedFarmArrival,reference)&&farmArrivalRecordSourceMatches(reference,actor.current);
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()&&!issued()){const error=Error('Native farm arrival is obsolete or lacks its direct pending source');error.code='native-farm-arrival-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending()||issued(),get routeRecord(){return current()?(actor.current??actor.revoked):null;},get executionEpoch(){return current()?(actor.current??actor.revoked).startTime:null;},get executionEnd(){return current()?actor.farmArrivalProof.reference.endTime:null;}});
    },
    installHomes(boundary,values=[],{bootstrap=false}={}){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||typeof bootstrap!=='boolean'||!Array.isArray(values)||values.length>32768||!bootstrap&&(!boundary||boundary.effectiveTime!==clock.committedThrough)||boundary&&(boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession))throw Error('Invalid native Home boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeHomeRouteAttestation(input),r=value.reference,actor=actors.get(r.actorId),record=actor?.current,w=r.worldBoundary;
        if(w.authorityEpoch!==authorityEpoch||w.nativeSession!==clock.nativeSession||w.effectiveTime>clock.committedThrough||boundary&&(w.ticket>boundary.ticket||w.effectiveTime>boundary.effectiveTime)||!bootstrap&&!sameNativeWorldBoundary(w,boundary)||ids.has(r.actorId)||bodies.has(r.bodyId)||!record||record.issuedFarmArrival||actor.closed||actor.state!==1||active.get(r.actorId)!==record||actor.latestSequence!==record.assignmentSequence||record.assignmentSequence!==value.assignmentSequence||!sameHandle(record.handle,r.expectedRouteHandle)||record.startTime!==w.effectiveTime||record.sourceCompletedTask&&(r.bodyId!==record.sourceCompletedTask.reference.bodyId||!sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest))||record.sourceCompletedFarm&&(r.bodyId!==record.sourceCompletedFarm.reference.bodyId||!sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest))||record.sourceCompletedStroll&&(r.bodyId!==record.sourceCompletedStroll.reference.bodyId||!sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest))||!bootstrap&&!(r.sourceRequest?sameNativeHomeRequestReference(record.sourceHomeRequest,r.sourceRequest):sameSettlementProof(record.sourceHome,r.sourceSettlement)))throw Error('Native Home differs from its issued route or stationary body');
        ids.add(r.actorId);bodies.add(r.bodyId);staged.push({actor,value});
      }
      for(const {actor,value} of staged)actor.homeProof=value;return staged.length;
    },
    admitHome(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeHomeRouteReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary),current=proofLeaseCurrent(reference,actor,'homeProof',nativeHomeRouteAttestationCovers,homeRecordCurrent),pending=()=>(reference.sourceRequest?homeRequestCurrent(reference.sourceRequest,actor):settlementCurrent(reference.sourceSettlement.reference,actor)&&sameSettlementProof(actor.settlementProof,reference.sourceSettlement))&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native Home is obsolete or lacks direct stationary/assignment proof');error.code='native-home-admission-obsolete';throw error;}
      const admitted=current()?actor.current:null;
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),
        isRevoked:()=>!closed&&admitted!==null&&admitted.revokedSequence>admitted.assignmentSequence,
        get routeRecord(){return current()?actor.current:null;},get executionEpoch(){return current()?actor.current.startTime:null;},get executionEnd(){return current()?actor.homeProof.reference.endTime:null;}});
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
    admitFarmArrivalStoppedGate(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeStoppedGateSelector(value),lease=admitRouteStop(farmStopFamily,reference.stop,{preparingWorldBoundary}),actor=actors.get(reference.stop.sourceRoute.actorId);
      const current=()=>lease.isCurrent()&&actor?.stoppedProjection?.proof===lease.binding;
      return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||lease.isPrepared(),get worldBoundary(){return current()?lease.binding.reference.worldBoundary:null;},value(field){if(field!=='opening'||!current())throw Error('Native stopped motor projection is obsolete');return actor.stoppedProjection.readGate(reference.gateId,reference.mechanism);}});
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
      for(const {actor,value} of staged){actor.startProof=value;actor.current.issuedStart=value;actor.current.taskStopBodyId=value.reference.bodyId;}return staged.length;
    },
    admitStart(value,{preparingWorldBoundary=null}={}){
      const reference=copyNativeTaskStartReference(value),actor=actors.get(reference.actorId),boundary=copyNativeWorldBoundary(preparingWorldBoundary);
      const current=()=>startCurrent(reference,actor),pending=()=>!closed&&!!clock&&!!actor&&!actor.closed&&actors.get(reference.actorId)===actor&&actor.state===6&&actor.latestSequence===reference.requestSequence&&nativeTaskRequestMatchesStart(actor.pendingTaskRequest,reference)&&(!actor.initialIdleBodySource||reference.bodyId===actor.initialIdleBodySource.request.bodyId)&&(!actor.idleCycleSource||reference.bodyId===actor.idleCycleSource.binding.reference.bodyId)&&(!actor.stoppedProjection||reference.bodyId===actor.proof?.bodyId)&&(!completedFarmGoalRecord(actor)||reference.bodyId===actor.revoked.issuedFarmArrival.reference.bodyId)&&sameNativeWorldBoundary(boundary,reference.worldBoundary)&&sequence>=reference.sourceControlSequence&&clock.committedThrough>=reference.worldBoundary.effectiveTime;
      if(reference.worldBoundary.authorityEpoch!==authorityEpoch||!clock||reference.worldBoundary.nativeSession!==clock.nativeSession||!current()&&!pending()){const error=Error('Native start is obsolete or lacks direct request/assignment proof');error.code='native-start-admission-obsolete';throw error;}
      counters.admissions++;return Object.freeze({reference,isCurrent:current,isPrepared:()=>current()||pending(),get routeRecord(){return current()?(actor.current??completedTaskHomeRecord(actor)):null;},get executionEpoch(){return current()?(actor.current??completedTaskHomeRecord(actor)).startTime:null;},get executionEnd(){return current()?actor.startProof.reference.endTime:null;}});
    },
    installResumedRoutes(boundary,values=[]){
      boundary=copyNativeWorldBoundary(boundary);
      if(closed||!clock||!boundary||boundary.authorityEpoch!==authorityEpoch||boundary.nativeSession!==clock.nativeSession||boundary.effectiveTime!==clock.committedThrough||!Array.isArray(values)||values.length>32768)throw Error('Invalid native resumed route attestation boundary');
      const staged=[],ids=new Set(),bodies=new Set();
      for(const input of values){const value=copyNativeResumeAttestation(input),reference=value.reference,actor=actors.get(reference.actorId),record=actor?.current,source=record?.sourceSuspension;
        if(!sameNativeWorldBoundary(reference.worldBoundary,boundary)||ids.has(reference.actorId)||bodies.has(reference.bodyId)||!actor||actor.closed||actor.state!==1||active.get(reference.actorId)!==record||!record||actor.latestSequence!==record.assignmentSequence||value.assignmentSequence!==record.assignmentSequence||record.assignmentSequence<=reference.sourceControlSequence||!source||source.sequence>reference.sourceControlSequence||!resumeSourceMatches(reference,source.reference)||!sameHandle(record.handle,reference.expectedRouteHandle)||record.startTime!==boundary.effectiveTime)throw Error('Native resume attestation does not match its issued assignment and source body');
        ids.add(reference.actorId);bodies.add(reference.bodyId);staged.push({actor,proof:value});}
      for(const {actor,proof} of staged){
        actor.resumeProof=proof;
        const old=actor.revoked,r=proof.reference;
        if(old?.taskStopBodyId===r.bodyId&&old.assignmentSequence===r.sourceAssignmentSequence)
          actor.current.taskStopBodyId=r.bodyId;
      }
      return staged.length;
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
    installTaskRouteStops(boundary,values,options){return installRouteStops(taskStopFamily,boundary,values,options);},
    admitStrollStop(value,options){return admitRouteStop(strollStopFamily,value,options);},
    admitFarmArrivalStop(value,options){return admitRouteStop(farmStopFamily,value,options);},
    admitTaskRouteStop(value,options){return admitRouteStop(taskStopFamily,value,options);},
    admitStoppedBody(value,options){return admitRouteStoppedBody(strollStopFamily,value,options);},
    admitFarmArrivalStoppedBody(value,options){return admitRouteStoppedBody(farmStopFamily,value,options);},
    admitTaskRouteStoppedBody(value,options){return admitRouteStoppedBody(taskStopFamily,value,options);},
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
         if(actor.cropRequest&&actor.cropRequest.nativeSession!==message.nativeSession)throw Error('Invalid crop session');
         if(actor.pendingTaskRequest&&actor.pendingTaskRequest.requestHandle.session!==message.nativeSession)throw Error('Invalid native pending request session');
         if(actor.pendingHomeRequest&&actor.pendingHomeRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending Home session');
         if(actor.pendingInitialIdleRequest&&actor.pendingInitialIdleRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending initial Idle session');
         if(actor.pendingFarmArrivalRequest&&actor.pendingFarmArrivalRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending farm arrival session');
         if(actor.pendingIdleStrollRequest&&actor.pendingIdleStrollRequest.nativeSession!==message.nativeSession)throw Error('Invalid native pending restored stroll session');
         if(actor.idleCycleSource&&(actor.idleCycleSource.binding.reference.worldBoundary.nativeSession!==message.nativeSession||actor.idleCycleSource.binding.cycleSequence>message.intentSequence||actor.idleCycleSource.binding.reference.worldBoundary.effectiveTime>message.committedThrough))throw Error('Invalid native Idle cycle clock session or acquisition');
       }
      for(const record of active.values()){
        if((record.handle?.session??record.issuedCrop?.session)!==message.nativeSession)throw Error('Invalid native causal clock session');
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
      if(record?.recoveringWorkerRoute)throw Error('Recovered worker route requires its typed resource');
      if(record?.issuedCrop)throw Error('Animal crop route requires its typed prepared admission');
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
