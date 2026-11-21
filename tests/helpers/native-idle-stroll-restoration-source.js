import assert from 'node:assert/strict';
import {controlledNativeIdleMovingTask} from './native-idle-moving-task.js';
import {createNativeRouteExecutionFixture} from './native-route-execution.js';
import {PROFILES} from '../../src/simulation/workforce.js';

// Real old WALK execution supplies saved semantic values. Fresh WASM source
// ABI tests only: snapshot loading/typed control/graphical admission follow.
export function savedNativeIdleStroll({profile='youngMale',advance=.12}={}){
 const old=controlledNativeIdleMovingTask({stop:false,profile});try{
  if(advance){const dt=advance==='arrival'?old.planner.nativeIdleStrollBinding(old.actor).reference.endTime-old.state.elapsed+.05:advance;old.advance(dt);old.planner.projectNativeIdleStroll(old.state,old.worker);}
  const binding=old.planner.nativeIdleStrollBinding(old.actor),state=structuredClone(old.state);state.workers=state.workers.slice(0,1);state.tasks=[];
  return {state,reference:binding.reference,assignmentSequence:binding.assignmentSequence};
 }finally{old.close();}
}
export function nativeIdleStrollRestorationSource(saved=savedNativeIdleStroll(),{core=null,declare=true,bind=true,peer=false}={}){
 const f=createNativeRouteExecutionFixture({core}),{w,bridge}=f;try{
  Object.assign(f.state,structuredClone(saved.state));if(peer){const b={...structuredClone(f.state.workers[0]),id:'worker-900012',...f.point(-6,6),status:'returning',idleState:null};delete b.nativeRouteAdmission;f.state.workers.push(b);}bridge.resetFromState(f.state);f.session.actorSectorRevision({worker:true});const worker=f.state.workers[0],actor=Number(worker.id.split('-').at(-1)),r=saved.reference,a=r.anchor,idle=worker.idleState;
  const args=()=>[actor,PROFILES.findIndex(p=>p.id===worker.profile),a.kind,a.id,a.x,a.z,a.radius,r.idleSeconds,idle.rng,idle.approachRetry,idle.destination.x,idle.destination.z,worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining];
  const request=()=>w.nav_idle_stroll_restore_request_snapshot(actor)===1?Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_restore_request_ptr(),28)):null;
  const source=()=>w.nav_idle_stroll_restore_source_snapshot(actor)===1?Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_restore_request_ptr(),28)):null;
  const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  const bindBody=()=>{assert.equal(w.spatial_body_upsert(1,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,1),1);};
  if(declare)assert.equal(w[worker.idleState.destination.id===worker.idleState.anchorId?'nav_intent_restore_idle_approach':'nav_intent_restore_idle_stroll'](...args()),1);if(bind)bindBody();
  return {...f,worker,actor,saved,args,request,source,tuple,bindBody,admitPeer:()=>f.worker(2,f.point(-6,6),f.point(6,6)),
   prepare(){const q=request();assert(q);assert(w.nav_intent_clock_commit(1,0)>=0);assert.equal(w.nav_idle_stroll_proposal_stage(actor,w.nav_intent_session(),q[3]),1);return {ticket:tuple()[1],header:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_proposal_header_ptr(),24)),semantic:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_proposal_semantic_ptr(),20))};},
   close(){f.session.dispose();}};
 }catch(error){f.session.dispose();throw error;}
}
