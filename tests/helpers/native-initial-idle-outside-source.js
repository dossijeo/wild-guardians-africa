import assert from 'node:assert/strict';
import {selectedApproachGame} from './native-idle-selected-approach-game.js';
import {createNativeRouteExecutionFixture} from './native-route-execution.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {idleFarmAnchor} from '../../src/simulation/game.js';
import {LOCOMOTION} from '../../src/simulation/locomotion-calibration.js';
import {updateIdle} from '../../src/simulation/idle.js';

export async function savedNativeInitialIdleOutside({mode='rest',profile='youngMale',threaded=false,retry=mode==='watch'?'watch':1}={}){
 let old;
 try{
  old=await selectedApproachGame({profile,threaded,retry});const failed=old.prepareFailedCycle();old.commitFailedCycle(failed);if(retry!==0)old.advance(mode==='watch'?failed.nativeIdleCycle.watchStartOffset+.1:.05);assert.equal(old.worker.idleState.mode,mode);
  const saved=old.save(),oldCycle=old.planner.nativeIdleCycleBinding(old.actor);await old.dispose();old=null;
  return {saved,oldCycle};
 }finally{await old?.dispose();}
}

// Public save of actual outside REST/WATCH, then a fresh authority and real20.
// Subsequent raw native commits are ABI evidence, never graphic permissions or
// a Game/ordinary-producer projection. The independent Home peer really moves.
export async function initialIdleOutsideSource({mode='rest',profile='youngMale',threaded=false,retry=mode==='watch'?'watch':1,acquireBody=true,blocked=false}={}){
 let f,runtime;
 try{
  const {saved,oldCycle}=await savedNativeInitialIdleOutside({mode,profile,threaded,retry});
  if(threaded){const {default:factory}=await import('../../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=createNativeRouteExecutionFixture({core:runtime?.core});Object.assign(f.state,saved.state);const {state,session,w}=f,worker=state.workers[0],actor=Number(worker.id.split('-').at(-1)),peerOrigin=f.point(-6,6),peerEnd=f.point(6,6);
  const peerWorker={...structuredClone(worker),id:'worker-900012',...peerOrigin,status:'returning',idleState:null};delete peerWorker.nativeRouteAdmission;state.workers.push(peerWorker);
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(state);session.actorSectorRevision({worker:true});assert.equal(w.spatial_body_upsert(1,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,1),1);
  const path=Array.from({length:11},(_,i)=>i%2?peerOrigin:peerEnd),ptr=w.nav_intent_attack_route_input_ptr(path.length);new Float32Array(w.memory.buffer,ptr,path.length*2).set(path.flatMap(p=>[p.x,p.z]));assert.equal(w.nav_intent_restore_home(900012,peerOrigin.x,peerOrigin.z,peerEnd.x,peerEnd.z,path.length),1);
  const peerHandle=planner.intentChanges().at(-1).routeHandle,prepared=planner.prepareNativeRouteMotion(peerHandle,{radius:.28});assert.equal(prepared.status,'prepared');assert.equal(w.spatial_body_upsert(2,peerOrigin.x,peerOrigin.z,.28,0,1),1);assert.equal(planner.reserveNativeRoute(prepared.routeHandle,2).status,'reserved');assert.equal(planner.beginNativeRouteExecution().status,'started');planner.commitNativeCausalClock();
  const q=planner.nativeInitialIdleRequestReference(actor);assert(q);assert.notEqual(q.authorityEpoch,oldCycle.reference.worldBoundary.authorityEpoch);assert.equal(q.idleState.mode,mode);
  const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  let body20=null;
  if(acquireBody){const p=planner.prepareNativeInitialIdleBodyProposal(q);assert.equal(p.status,'proposed');assert.equal(w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),p.proposal.ticket.ticket),1);planner.commitNativeCausalClock();planner.projectNativeInitialIdleBody(state,worker);body20=planner.nativeInitialIdleBodyBinding(actor);assert(body20);}
  const anchor=idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId)),c=LOCOMOTION.sources.find(c=>c.profile===profile),match=/^farm-(plant|structure)-(\d+)$/.exec(anchor.id);assert(match);assert(Math.hypot(worker.x-anchor.x,worker.z-anchor.z)>anchor.idleRadius);
  const anchorKind=match[1]==='plant'?1:2,anchorId=Number(match[2]),oracleWorker=structuredClone(worker),navigation=createSpatialNavigationMovement(session,state),wall=blocked?session.core.addWall(anchor.x,anchor.z,.4,.4):null;
  const args=(sequence=body20?.bodySequence??q.requestSequence,overrides={})=>{const a={actor,session:q.nativeSession,sequence,kind:anchorKind,id:anchorId,x:anchor.x,z:anchor.z,radius:anchor.idleRadius,idleSeconds:c.idleSeconds,alertSeconds:c.alertSeconds,...overrides};return [a.actor,a.session,a.sequence,a.kind,a.id,a.x,a.z,a.radius,a.idleSeconds,a.alertSeconds];};
  const read=(method,ptr,size)=>w[method](actor)===1?Array.from(new Float64Array(w.memory.buffer,w[ptr](),size)):null;
  const capture=()=>({bound:tuple(),header:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_cycle_proposal_header_ptr(),24))});
  return {...f,worker,actor,planner,q,body20,oldCycle,saved,c,anchor,wall,args,tuple,oracleWorker,navigation,capture,
   stage(sequence,overrides){const status=w.nav_idle_cycle_initial_retry_proposal_stage(...args(sequence,overrides));return status===1?{status,...capture()}:{status};},
   commit(p,preparedTicket=p.bound[1]){const result=w.nav_idle_cycle_proposal_commit_bound(...p.bound.slice(0,5),preparedTicket);if(result===1)assert(w.nav_intent_clock_commit(1,0)>=0);return result;},
   advance(seconds){state.elapsed+=seconds;assert(w.nav_intent_execution_advance(state.elapsed)>=0);assert(w.nav_intent_clock_commit(1,0)>=0);},
   oracleAdvance(seconds){while(seconds>1e-12){const i=oracleWorker.idleState,step=Math.min(seconds,i.remaining>1e-9?i.remaining:Infinity,i.approachRetry>0?i.approachRetry:Infinity);assert(step>0);updateIdle(oracleWorker,anchor,step,navigation,state.seed);seconds-=step;}},
   binding:()=>read('nav_idle_cycle_binding_snapshot','nav_idle_cycle_binding_ptr',52),
   execution:()=>read('nav_idle_cycle_execution','nav_idle_cycle_execution_ptr',14),
   next:()=>read('nav_idle_cycle_next','nav_idle_cycle_next_ptr',14),
   source(ticket=0){return w.nav_idle_cycle_source_snapshot(actor,ticket)===1?Array.from(new Float64Array(w.memory.buffer,w.nav_idle_cycle_source_ptr(),26)):null;},
   async dispose(){f.session.dispose();await runtime?.dispose();}
  };
 }catch(error){f?.session.dispose();await runtime?.dispose();throw error;}
}
