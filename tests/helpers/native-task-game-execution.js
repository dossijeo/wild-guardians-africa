import assert from 'node:assert/strict';
import {nativeTaskRequestFixture} from './native-task-resource-requests.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createPlant} from '../../src/simulation/crops.js';

function issue(f,workerId,bodyId,policy={}){
 const request=f.planner.pendingTaskRoute(workerId),p=f.planner.prepareNativeTaskStartProposal(request,{bodyId,radius:.28,urgent:true,runRemaining:4,runPhase:23.125,walkPhase:41.75,carryPhase:9.5,...policy});assert.equal(p.status,'proposed');
 assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));
 assert.equal(f.w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return p.proposal;
}
export function createNativeTaskGameFixture({core=null,taskKind='harvest',runBudget=4,profile='youngMale'}={}){
 const f=nativeTaskRequestFixture({core,taskKind,profile,bindBodies:true,independentHome:false,configureState:state=>{state.structures=state.structures.filter(s=>!s.gate);}});f.claim();
 Object.assign(f.state,{pauses:[],result:null,initialPreparation:false,raid:null,spells:[],dayPlan:{done:true},nightPlan:{done:true}});if(f.state.awakenings)f.state.awakenings.enabled=false;f.state.tutorial.step='done';
 f.state.plants=f.state.plants.map(p=>({...createPlant(p.id,p.species,p.x,p.z,f.state.workers[0].centerId),growth:999999,harvestRequested:true,water:[]}));
 for(const w of f.state.workers)Object.assign(w,{recovery:null,recoveryExitRemaining:0,fallRemaining:0,raidReturn:false,crateId:null});
 // The current source-projection increment has no gate motor projection.
 assert.equal(f.state.structures.some(s=>s.gate&&s.status!=='ruined'),false);
 const proposals=f.state.workers.map((w,i)=>issue(f,w.id,i?3:1,i?{urgent:false,runRemaining:0}:{runRemaining:runBudget})),nav=createSpatialNavigationMovement(f.session,f.state);nav.intentTaskPlanner=f.planner;
 const stopWorld=f.planner.observeWorld(f.state),fail=()=>{throw Error('Legacy JS mover/clearance must not run for an executed native task');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
 return {...f,nav,proposals,close(){stopWorld();f.close();}};
}
