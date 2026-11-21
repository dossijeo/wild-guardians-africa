import assert from 'node:assert/strict';
import {initialIdleOutsideGame} from './native-initial-idle-outside-game.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';

// Actual saved source/Game and authored assets; renderer/admission/picking are
// doubles. Genuine20 preparation precedes its trusted component acquisition.
export async function initialIdleOutsideGraphics({mode='rest',...options}={}){
 let native,f;let age=0,phaseOffset,pickTime;
 try{
  native=await initialIdleOutsideGame({...options,mode,acquireBody:false});
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id,close(){}},{idle:true,alert:true,clips:['Walk_Skip','Run','Idle','Alert'],initialClip:mode==='watch'?'Alert':'Idle'});
  const sync=()=>{f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();};
  const data=(binding,kind,field,extra={})=>({worldBoundary:binding.reference.worldBoundary,[field]:binding,resources:{version:1,kind,phase:'committed',worldBoundary:binding.reference.worldBoundary,[field]:binding,...extra}});
  const p20=native.prepareBody(),initial=await f.roster.prepareNativeInitialIdleBodyProposal(f.terrain.prepareNativeInitialIdleBody(p20.nativeInitialIdleBody),{getPickAge:()=>0});initial.activate();const body20=native.commitBody(p20),bodyData=data(body20,20,'nativeInitialIdleBodyBinding');assert(initial.validateCommit(bodyData));initial.finalize(bodyData);sync();f.flush();
  const prepareCycle=()=>{const proposal=native.prepareCycle(),support=f.terrain.prepareNativeIdleCycle(proposal.nativeIdleCycle);assert(support?.valid());return {proposal,support};};
  const first=prepareCycle();pickTime=f.nativeState.elapsed;
  return {...f,...first,nativeActor:native.actor,body20,bodyData,sync,prepareCycle,getPickAge:()=>age,getPickPhaseOffset:()=>phaseOffset,getPickTime:()=>pickTime,setPickClock(value,offset){age=value;phaseOffset=offset;},setPickTime:at=>pickTime=at,
   advance:dt=>native.advance(dt),
   commitCycle(p=first.proposal){return data(native.commitCycle(p),21,'nativeIdleCycleBinding');},
   prepareStroll(){const proposal=native.prepare(),support=f.terrain.prepareNativeIdleStrollProposal(proposal,{terrainManifest:f.manifest});assert(support?.valid());return {proposal,support};},
   commitStroll(p){const b=native.commit(p),nativeRoute={actorId:b.reference.actorId,routeHandle:b.reference.expectedRouteHandle,assignmentSequence:b.assignmentSequence};return data(b,22,'nativeIdleStrollBinding',{nativeRoute,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)});},
   async dispose(){f.close();await native.dispose();}
  };
 }catch(error){f?.close();await native?.dispose();throw error;}
}
