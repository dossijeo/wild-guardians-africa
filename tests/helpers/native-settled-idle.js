import assert from 'node:assert/strict';
import {nativeTaskSettlementFixture} from './native-task-settlement.js';
import {prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence,idleFarmAnchor} from '../../src/simulation/game.js';
import {createIdleState} from '../../src/simulation/idle.js';
import {createPlant} from '../../src/simulation/crops.js';
import {centerDeliveryPoint} from '../../src/world/centers.js';

// Trusted source setup only: real action→Carry→settlement and original Game
// projection. No render, receipt, synthetic initial body or physical rebind.
export function nativeSettledIdleFixture({inside=true,profile=null,...options}={}){
 const f=nativeTaskSettlementFixture({...options,configureSave(saved){
  options.configureSave?.(saved);
  if(profile)saved.workers[0].profile=profile;
  {const w=saved.workers[0],center=saved.structures.find(c=>c.id===w.centerId),task=saved.tasks.find(t=>t.id===w.taskId),target=saved.plants.find(p=>p.id===task.targetId),p=centerDeliveryPoint(center,target,saved),plant=createPlant('plant-900097','mijo',p.x+(inside?1.5:5),p.z+.5,center.id);for(const water of plant.water)water.status='manual';saved.plants.push(plant);}
 }});
 try{
  const preview=prepareCrateDeliveryConsequence(f.state,f.worker,f.state.crates[0],f.center),p=f.prepareSettlement();assert.equal(preview.status,'idle');assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);f.planner.flushTaskEvents();f.planner.flushNativeIntentControl();
  const settlement=f.planner.nativeTaskSettlementBinding(f.actor),anchor=idleFarmAnchor(f.state,f.worker,f.center),birth={...createIdleState(f.worker,anchor,f.state.seed),approachRetry:0},distance=Math.hypot(f.worker.x-anchor.x,f.worker.z-anchor.z);assert.equal(distance<=anchor.idleRadius,inside);assert.equal(f.worker.idleState,null);assert.equal(f.worker.nativeRouteAdmission,undefined);
  return {...f,settlement,anchor,birth,distance,advance(dt){f.advance(dt);if(f.planner.nativeIdleCycleExecution(f.actor))f.planner.projectNativeIdleCycle(f.state,f.worker);else if(f.planner.nativeIdleStrollExecution(f.actor))f.planner.projectNativeIdleStroll(f.state,f.worker);else f.planner.projectNativeSettledWorkerExecution(f.state,f.worker);},commitIdle(proposal){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeIdleCycleBinding(f.actor);assert(binding);assert(f.planner.projectNativeIdleCycle(f.state,f.worker));return binding;}};
 }catch(error){f.close();throw error;}
}
