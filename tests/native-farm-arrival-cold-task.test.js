import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {tick} from '../src/simulation/game.js';

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} cold farm arrival claims Task before binding and retains that exact first body through prepared Task14`,async()=>{
 let runtime,f,target;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeInitialIdleRequestFixture({core:runtime?.core,mode:null,bound:false,declareRequest:false,configureState(state,{point}){
   state.structures=state.structures.filter(s=>!s.gate);Object.assign(state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(state.awakenings)state.awakenings.enabled=false;state.tutorial.step='done';const a=state.workers[0];Object.assign(a,{status:'arriving',destinationId:null,idleState:null});target=createPlant(`plant-${state.nextId++}`,'mijo',point(6,0).x,point(6,0).z,a.centerId);target.growth=999999;target.harvestRequested=true;for(const water of target.water)water.status='manual';state.plants.push(target);
  }});
  f.planner.requestNativeFarmArrivalResources(f.state,f.worker);const source=f.planner.nativeFarmArrivalDeclarationReference(f.actor),nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;const fail=()=>{throw Error('Cold native arrival Task must not use legacy movement');};nav.path=nav.workerPath=nav.workerMotionClear=nav.workerRouteClear=fail;
  enqueue(f.state,f.worker.centerId,'harvest',target.id);tick(f.state,.1,nav);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeFarmArrivalDeclarationReference(f.actor),null);assert(f.planner.pendingTaskRoute(f.actor));assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);
  f.bind();assert.equal(f.planner.commitNativeCausalClock().status,'committed');const body=f.body(1);tick(f.state,.1,nav);assert.deepEqual(f.body(1),body);for(const k of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(f.worker[k],source.pose[k]);
  const proposed=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(proposed.status,'proposed');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),proposed.proposal.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});tick(f.state,.1,nav);assert.notDeepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});
