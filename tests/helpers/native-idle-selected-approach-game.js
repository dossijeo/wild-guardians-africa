import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './native-idle-approach-restoration.js';
import {createNativeRouteExecutionFixture} from './native-route-execution.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {LOCOMOTION} from '../../src/simulation/locomotion-calibration.js';
import {tick} from '../../src/simulation/game.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';

// Genuine executed23→22 saved semantics, fresh authority, then blocked WALK→21
// and selected approach22. Minimal original fixture terrain, actual Game.tick,
// trusted native commits; no graphical receipt or ordinary producer.
export async function selectedApproachGame({profile='youngMale',threaded=false,retry=.25,rng,saved=null,bind=true}={}){
 let f,runtime,stop,stopTasks;
 try{
  saved??=savedNativeIdleApproach({profile});const state=deserialize(serialize(saved.state));
  state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';for(const p of state.plants)if(p.water[0])p.water[0].status='manual';
  if(!saved.selected){if(rng!==undefined)state.workers[0].idleState.rng=rng;const c=LOCOMOTION.sources.find(c=>c.profile===profile);let n=state.workers[0].idleState.rng;n^=n<<13;n^=n>>>17;n^=n<<5;const rest=c.idleSeconds*(2+Math.floor((n>>>0)/4294967296*3));state.workers[0].idleState.approachRetry=retry==='rest-end'?rest:retry==='watch'?rest+.25:retry;}
  if(threaded){const {default:factory}=await import('../../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=createNativeRouteExecutionFixture({core:runtime?.core});Object.assign(f.state,state);const planner=createEventDrivenTaskPlanner(f.session);planner.resetFromState(f.state);const worker=f.state.workers[0],actor=Number(worker.id.split('-').at(-1)),w=f.w,nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=planner;
  stopTasks=planner.observeTasks(f.state);stop=planner.observeWorld(f.state);const fail=()=>{throw Error('Selected native Idle must not use a JS mover or clearance');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  if(bind){assert.equal(w.spatial_body_upsert(1,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,1),1);assert(['committed','unchanged'].includes(planner.commitNativeCausalClock().status));}
  const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  let failedWall;
  const prepareFailedCycle=()=>{const q=planner.nativeIdleStrollRequestReference(actor);assert(q);failedWall=f.session.core.addWall(q.destination.x,q.destination.z,.4,.4);assert(failedWall>0);const p=planner.prepareNativeIdleCycleProposal(actor);assert.equal(p.status,'proposed');return p.proposal;};
  const commitFailedCycle=p=>{assert.equal(w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),p.ticket.ticket),1);assert(['committed','unchanged'].includes(planner.commitNativeCausalClock().status));assert(planner.projectNativeIdleCycle(f.state,worker));return planner.nativeIdleCycleBinding(actor);};
  const finishFailedCycle=p=>{assert.equal(f.session.core.removeWall(failedWall),1);tick(f.state,p.nativeIdleCycle.duration,nav);const next=planner.nativeIdleCycleNextRequest(actor);assert(next?.approach);return next;};
  return {...f,planner,worker,actor,nav,tuple,prepareFailedCycle,commitFailedCycle,finishFailedCycle,
   prepare(){const r=planner.prepareNativeIdleStrollProposal(actor);assert.equal(r.status,'proposed',JSON.stringify(r));return r.proposal;},
   commit(p,{project=true}={}){assert.equal(w.nav_idle_stroll_proposal_commit_bound(...tuple().slice(0,5),p.ticket.ticket),1);assert.equal(planner.beginNativeRouteExecution().status,'started');assert(['committed','unchanged'].includes(planner.commitNativeCausalClock().status));if(project)assert(planner.projectNativeIdleStroll(f.state,worker));return planner.nativeIdleStrollBinding(actor);},
   select(){const p=prepareFailedCycle();commitFailedCycle(p);return finishFailedCycle(p);},
   advance(dt){tick(f.state,dt,nav);},
   save(){return {state:deserialize(serialize(f.state)),selected:true};},
   async dispose(){stop?.();stopTasks?.();f.session.dispose();await runtime?.dispose();}
  };
 }catch(error){stop?.();stopTasks?.();f?.session.dispose();await runtime?.dispose();throw error;}
}
