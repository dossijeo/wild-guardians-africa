import assert from 'node:assert/strict';
import {selectedApproachGame} from './native-idle-selected-approach-game.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';

// Actual source/Game and authored assets. Renderer/admission/picking clocks are
// doubles; all resource preparation precedes the corresponding trusted commit.
export async function selectedApproachGraphics({restored=false,...options}={}){
 let native,f;let pickAge=0,pickPhaseOffset;
 try{
  if(restored){const old=await selectedApproachGame(options);try{old.select();old.commit(old.prepare());old.advance(.1);native=await selectedApproachGame({...options,saved:old.save()});}finally{await old.dispose();}}
  else native=await selectedApproachGame(options);
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id,close(){}},{idle:true,alert:true,clips:['Walk_Skip','Run','Idle','Alert']});
  const sync=()=>{f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();};
  const cycleData=binding=>({worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding,resources:{version:1,kind:21,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding}});
  if(!restored){const p=native.prepareFailedCycle(),support=f.terrain.prepareNativeIdleCycle(p.nativeIdleCycle),part=await f.roster.prepareNativeIdleCycleProposal(support,{getPickAge:()=>pickAge,getPickPhaseOffset:()=>pickPhaseOffset});part.activate();const binding=native.commitFailedCycle(p);part.finalize(cycleData(binding));sync();f.flush();native.finishFailedCycle(p);sync();}
  const proposal=native.prepare(),supportFor=p=>f.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:f.manifest}),support=supportFor(proposal);assert(support?.valid());
  return {...f,nativeActor:native.actor,proposal,support,supportFor,restored,sync,cycleData,setPickClock(value,offset){pickAge=value;pickPhaseOffset=offset;},advance:dt=>native.advance(dt),
   commitStroll(p=proposal){const binding=native.commit(p),nativeRoute={actorId:binding.reference.actorId,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence},worldBoundary=binding.reference.worldBoundary;return {worldBoundary,nativeIdleStrollBinding:binding,resources:{version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding:binding,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)}};},
   prepareRest(){const p=f.planner.prepareNativeIdleCycleProposal(native.actor);assert.equal(p.status,'proposed');return {proposal:p.proposal,support:f.terrain.prepareNativeIdleCycle(p.proposal.nativeIdleCycle)};},
   commitRest(p){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);f.planner.commitNativeCausalClock();const b=f.planner.nativeIdleCycleBinding(native.actor);assert(f.planner.projectNativeIdleCycle(f.nativeState,f.worker));return cycleData(b);},
   async dispose(){f.close();await native.dispose();}
  };
 }catch(error){f?.close();await native?.dispose();throw error;}
}
