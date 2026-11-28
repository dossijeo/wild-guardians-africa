import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';
import {createPlant} from '../../src/simulation/crops.js';
import {idleFarmAnchor} from '../../src/simulation/game.js';
import {createIdleState} from '../../src/simulation/idle.js';
import {LOCOMOTION} from '../../src/simulation/locomotion-calibration.js';

// Real23 followed directly by provisional/actual21. Authored living crop is
// the original Game Idle anchor; no20/24, controller or GPU receipt is created.
export function nativeFarmArrivedIdleCycleFixture({complete=true,anchor=true,anchorReady=true,farmDelay=0,urgent=true,...options}={}){
 const f=nativeFarmArrivalRouteFixture({peer:true,...options,configureState(state,context){
  if(anchor){const crop=createPlant('plant-900098','mijo',context.target.x,context.target.z,state.workers[0].centerId);if(anchorReady)crop.water[0].status='manual';state.plants.push(crop);}
  options.configureState?.(state,context);
 }}),events=[];let detach;
 try{
  detach=f.planner.observeNativeIntentControl({onBaseline(){},onChanges:rows=>events.push(...rows),onClock(){}});
  const prepared=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,{urgent});assert.equal(prepared.status,'proposed');
  if(farmDelay){f.move(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(prepared.proposal.ticket).status,'revalidated');}
  assert.equal(f.commit({ticket:prepared.proposal.ticket.ticket}),1);const farmBinding=f.planner.nativeFarmArrivalRouteBinding(f.actor);
  f.move(complete?Math.max(0,farmBinding.reference.endTime-f.state.elapsed)+.05:.03);const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(source);if(complete)assert(source.arrived);
  const projectPeer=()=>{const peer=f.state.workers[1];if(peer)f.planner.projectNativeTaskExecution(f.state,peer);};projectPeer();
  const idleAnchor=idleFarmAnchor(f.state,f.worker,f.state.structures.find(c=>c.id===f.worker.centerId)),birth={...createIdleState(f.worker,idleAnchor,f.state.seed),approachRetry:0},calibration=LOCOMOTION.sources.find(c=>c.profile===f.worker.profile);
  f.planner.flushNativeIntentControl();events.length=0;
  return {...f,events,source,farmBinding,farmPrepared:prepared.proposal,idleAnchor,birth,calibration,
   advance(dt){f.move(dt);if(f.planner.nativeIdleCycleExecution(f.actor))f.planner.projectNativeIdleCycle(f.state,f.worker);else f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);projectPeer();},
   prepare(){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
   rawStage(change={}){const a={actor:f.actor,session:f.w.nav_intent_session(),sequence:farmBinding.assignmentSequence,kind:idleAnchor.id.startsWith('farm-plant-')?1:2,id:Number(idleAnchor.id.split('-').at(-1)),x:idleAnchor.x,z:idleAnchor.z,radius:idleAnchor.idleRadius,idleSeconds:calibration.idleSeconds,alertSeconds:calibration.alertSeconds,rng:birth.rng,...change};return f.w.nav_idle_cycle_farm_proposal_stage(a.actor,a.session,a.sequence,a.kind,a.id,a.x,a.z,a.radius,a.idleSeconds,a.alertSeconds,a.rng);},
   commitIdle(p){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeIdleCycleBinding(f.actor);assert(binding);assert(f.planner.projectNativeIdleCycle(f.state,f.worker));return binding;},
   close(){detach?.();f.close();}
  };
 }catch(error){detach?.();f.close();throw error;}
}
