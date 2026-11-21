import assert from 'node:assert/strict';
import {nativeTaskConsequenceGraphicsFixture} from './native-task-consequence-graphics.js';
import {prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence,projectNativeHarvestConsequence} from '../../src/simulation/game.js';
import {createPlant} from '../../src/simulation/crops.js';
import {centerDeliveryPoint} from '../../src/world/centers.js';
import {floorFloat32} from '../../src/float32-time.js';

// Real native transitions/assets/roster. Renderer, admission and picking
// clocks are doubles; this fixture does not certify a hardware fence.
export async function nativeSettledIdleGraphicsFixture({inside=true,profile='youngMale'}={}){
 const f=await nativeTaskConsequenceGraphicsFixture({idle:true,alert:true,configureSave(saved){
  const worker=saved.workers[0];worker.profile=profile;const center=saved.structures.find(c=>c.id===worker.centerId),task=saved.tasks.find(t=>t.id===worker.taskId),target=saved.plants.find(p=>p.id===task.targetId),point=centerDeliveryPoint(center,target,saved),plant=createPlant('plant-900097','mijo',point.x+(inside?1.5:5),point.z+.5,center.id);for(const water of plant.water)water.status='manual';saved.plants.push(plant);
 }});let carryPart,settledPart,settledEpoch,sourcePickAge=null;const phases=[],actor=f.roster.get(f.actor),original=actor.prepareNativeMotionVariant;actor.prepareNativeMotionVariant=(phase,settings)=>{phases.push(phase);return original(phase,settings);};
 try{
  carryPart=await f.roster.prepareNativeTaskConsequenceProposal(f.support,{getPickTime:f.getPickTime});carryPart.activate();const carryData=f.commit();carryPart.finalize(carryData);projectNativeHarvestConsequence(f.nativeState,f.worker,f.preview,f.planner);const carry=carryData.nativeTaskConsequenceBinding;
  f.advance(carry.reference.endTime+.05-f.nativeState.elapsed);assert(f.planner.projectNativeDeliveryExecution(f.nativeState,f.worker).arrived);
  const sync=()=>{f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();};sync();f.setPickTime(carry.reference.endTime);f.flush();
  const preview=prepareCrateDeliveryConsequence(f.nativeState,f.worker,f.nativeState.crates[0],f.center),prepared=f.planner.prepareNativeTaskSettlementProposal(carry);assert.equal(prepared.status,'proposed');
  const settlementProposal=prepared.proposal;settledPart=await f.roster.prepareNativeTaskSettlementProposal(f.terrain.prepareNativeTaskSettlement(settlementProposal.nativeSettlement),{getPickAge:r=>sourcePickAge?sourcePickAge(r):floorFloat32(Math.max(0,f.nativeState.elapsed-(settledEpoch??settlementProposal.worldBoundary.effectiveTime)))});settledPart.activate();assert.equal(f.w.nav_task_settlement_proposal_commit_bound(...f.tuple().slice(0,5),settlementProposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const settlement=f.planner.nativeTaskSettlementBinding(f.actor);settledEpoch=settlement.reference.worldBoundary.effectiveTime;projectNativeCrateDeliveryConsequence(f.nativeState,f.worker,preview,f.planner);settledPart.finalize({nativeTaskSettlementBinding:settlement});sync();f.flush();f.planner.flushTaskEvents();f.planner.flushNativeIntentControl();
  const result=inside?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(result.status,'proposed');const proposal=result.proposal,support=inside?f.terrain.prepareNativeIdleCycle(proposal.nativeIdleCycle):f.terrain.prepareNativeIdleStrollProposal(proposal,{terrainManifest:f.manifest});assert(support?.valid());
  return {...f,inside,settlement,proposal,support,sync,phases,useSettlementPickClock(fn){assert.equal(typeof fn,'function');sourcePickAge=fn;},get acquires(){return f.acquires;},
   commitIdle(){assert.equal((inside?f.w.nav_idle_cycle_proposal_commit_bound:f.w.nav_idle_stroll_proposal_commit_bound)(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');if(inside){const proof=f.planner.nativeIdleCycleBinding(f.actor);return {nativeIdleCycleBinding:proof,resources:{version:1,kind:21,phase:'committed',worldBoundary:proof.reference.worldBoundary,nativeIdleCycleBinding:proof}};}const proof=f.planner.nativeIdleStrollBinding(f.actor),nativeRoute={actorId:proof.reference.actorId,routeHandle:proof.reference.expectedRouteHandle,assignmentSequence:proof.assignmentSequence},worldBoundary=proof.reference.worldBoundary;return {worldBoundary,nativeIdleStrollBinding:proof,resources:{version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding:proof,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)}};},
   projectIdle(){assert(inside?f.planner.projectNativeIdleCycle(f.nativeState,f.worker):f.planner.projectNativeIdleStroll(f.nativeState,f.worker));},
   close(){settledPart?.cancel();carryPart?.cancel();f.close();}
  };
 }catch(error){settledPart?.cancel();carryPart?.cancel();f.close();throw error;}
}
