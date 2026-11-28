import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture} from './native-route-execution.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createPlant} from '../../src/simulation/crops.js';
import {PROFILES} from '../../src/simulation/workforce.js';

// An authored initial Idle, with no preceding task, delivery or permission.
// Only the independent peer, when requested, receives a genuine TaskStart.
export function nativeInitialIdleRequestFixture({core=null,bound=true,peer=false,mode='rest',profile='youngMale',declareRequest=peer,admitPeer=peer,configureState=null,configureWorld=null}={}){
 const f=createNativeRouteExecutionFixture({core}),state=f.state,w=f.w;
 state.workers=state.workers.slice(0,peer?2:1);state.time=100;state.tasks=[];state.plants=[];state.nextId=Math.max(state.nextId,1000000);
 for(const [i,worker] of state.workers.entries())Object.assign(worker,f.point(-6,i?6:0),{profile,contractDay:state.day,status:'idle',taskId:null,path:null,crateId:null,heading:.37,runPhase:23.25,walkPhase:7.125,carryPhase:9.5,runRemaining:40,running:false,gateWaiting:false,recovery:null,recoveryExitRemaining:0,fallRemaining:0,raidReturn:false,idleState:null});
 const worker=state.workers[0],actor=Number(worker.id.split('-').at(-1));
 if(mode!==null)worker.idleState={anchorId:`farm-${worker.centerId}`,mode,elapsed:.7,remaining:2.3,rng:0xfabcde98,approachRetry:.6};
 if(peer){const b=state.workers[1],target=createPlant('plant-900099','mijo',f.point(6,6).x,f.point(6,6).z,b.centerId);target.growth=999999;target.harvestRequested=true;state.plants=[target];state.tasks=[{id:'task-920002',kind:'harvest',centerId:b.centerId,targetId:target.id,created:0,workerId:null}];}
 configureState?.(state,{point:f.point});
 const planner=createEventDrivenTaskPlanner(f.session);planner.resetFromState(state);f.session.actorSectorRevision({worker:true});
 const bind=()=>{assert.equal(w.nav_intent_set_time(state.elapsed),1);assert.equal(w.spatial_body_upsert(1,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,1),1);};
 const args=()=>{const idle=worker.idleState,match=idle&&/^(farm-plant|farm-structure|village)-(\d+)$/.exec(idle.anchorId);return [actor,PROFILES.findIndex(p=>p.id===worker.profile),idle?{rest:1,watch:2,walk:3}[idle.mode]:0,idle?.elapsed??0,idle?.remaining??0,idle?.rng??0,match?['','farm-plant','farm-structure','village'].indexOf(match[1]):0,match?Number(match[2]):0,idle?.approachRetry??0,worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining];};
 const stopTasks=planner.observeTasks(state),stopWorld=planner.observeWorld(state);
 try{
  configureWorld?.(state,{point:f.point,session:f.session});
  if(bound)bind();
  let peerBinding=null,peerProposal=null;
  if(peer){assert(bound);if(declareRequest)assert.equal(w.nav_intent_request_initial_idle(...args()),1);const b=state.workers[1],bid=Number(b.id.split('-').at(-1));assert.equal(w.spatial_body_upsert(3,b.x,b.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(bid,3),1);
   const plan=planner.planIfNeeded(state.elapsed);assert.equal(plan.filter(p=>p.status===1).length,1);assert.equal(plan.find(p=>p.status===1).workerId,bid);assert.equal(planner.commitTaskBatchToState(state,plan,{navVersion:1,pendingResources:true}),1);assert.equal(planner.commitNativeCausalClock().status,'committed');
   const proposed=planner.prepareNativeTaskStartProposal(planner.pendingTaskRoute(b.id),{bodyId:3,radius:.28,urgent:false,runRemaining:b.runRemaining,runPhase:b.runPhase,walkPhase:b.walkPhase,carryPhase:b.carryPhase});assert.equal(proposed.status,'proposed');peerProposal=proposed.proposal;
   if(admitPeer){assert.equal(w.nav_intent_barrier_proposal_ticket(),1);const tuple=Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));assert.equal(w.nav_task_start_proposal_commit_bound(...tuple.slice(0,5),proposed.proposal.ticket.ticket),1);assert.equal(planner.beginNativeRouteExecution().status,'started');assert.equal(planner.commitNativeCausalClock().status,'committed');peerBinding=planner.nativeTaskStartBinding(b.id);}
  }
  return {...f,planner,actor,worker,args,bind,peerBinding,peerProposal,advance(dt){state.elapsed+=dt;assert.equal(planner.advanceNativeRouteExecution(state.elapsed).status,'advanced');assert.equal(planner.commitNativeCausalClock().status,'committed');},close(){stopWorld();stopTasks();f.session.dispose();}};
 }catch(error){stopWorld();stopTasks();f.session.dispose();throw error;}
}
