import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './native-idle-approach-restoration.js';
import {nativeIdleStrollRestorationSource} from './native-idle-stroll-restoration-source.js';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {LOCOMOTION} from '../../src/simulation/locomotion-calibration.js';
import {updateIdle} from '../../src/simulation/idle.js';

const nextRng=n=>{n^=n<<13;n^=n>>>17;n^=n<<5;return n>>>0;};
// Raw native ABI only: a genuine saved23→22 WALK is blocked, acquires21,
// then selects a repaired approach. No fabricated20 or graphical receipt.
export async function selectedApproachSource({profile='youngMale',threaded=false,retry=.25,rng,epoch=0,repair=true,finish=true,acquire=true}={}){
 let f,runtime;
 try{
  const saved=savedNativeIdleApproach({profile}),worker=saved.state.workers[0],c=LOCOMOTION.sources.find(c=>c.profile===profile);
  if(rng!==undefined)worker.idleState.rng=rng;
  const restRng=nextRng(worker.idleState.rng),rest=c.idleSeconds*(2+Math.floor(restRng/4294967296*3)),watch=c.alertSeconds*(1+Math.floor(nextRng(restRng)/4294967296*2));
  const duration=typeof retry==='number'?retry:rest+(retry==='watch'?.25:retry==='watch-end'?watch:0);
  worker.idleState.approachRetry=duration;saved.state.elapsed+=epoch;
  if(threaded){const {default:factory}=await import('../../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollRestorationSource(saved,{core:runtime?.core,peer:true});const {w,bridge,actor}=f,q=bridge.nativeIdleStrollRequestReference(actor),wall=f.session.core.addWall(q.destination.x,q.destination.z,.4,.4);assert(wall>0);
  f.admitPeer();assert.equal(bridge.beginNativeRouteExecution().status,'started');bridge.commitNativeCausalClock();
  const oracleWorker=structuredClone(f.worker),anchor={id:oracleWorker.idleState.anchorId,x:q.anchor.x,z:q.anchor.z,idleRadius:q.anchor.radius},navigation=createSpatialNavigationMovement(f.session,f.state);oracleWorker.idleState.pathVersion=-1;updateIdle(oracleWorker,anchor,0,navigation,f.state.seed);assert.equal(oracleWorker.idleState.mode,'rest');
  function oracleAdvance(dt){
   while(dt>1e-12){const s=oracleWorker.idleState,step=Math.min(dt,s.remaining>1e-9?s.remaining:Infinity,s.approachRetry>0?s.approachRetry:Infinity);assert(step>0);updateIdle(oracleWorker,anchor,step,navigation,f.state.seed);dt-=step;}
  }
  const read=(method,ptr,size)=>w[method](actor)===1?Array.from(new Float64Array(w.memory.buffer,w[ptr](),size)):null;
  const advance=dt=>{assert.equal(f.advance(f.state.elapsed+dt).status,'advanced');assert(w.nav_intent_clock_commit(1,0)>=0);};
  let cycle=null;
  if(acquire){
   const a=q.anchor;assert.equal(w.nav_idle_cycle_failed_rest_proposal_stage(actor,q.nativeSession,q.requestSequence,a.kind,a.id,a.x,a.z,a.radius,q.idleSeconds,c.alertSeconds),1);
   const tuple=f.tuple(),header=Array.from(new Float64Array(w.memory.buffer,w.nav_idle_cycle_proposal_header_ptr(),24));assert.equal(header[0],2);assert.equal(w.nav_idle_cycle_proposal_commit_bound(...tuple.slice(0,5),tuple[1]),1);assert(w.nav_intent_clock_commit(1,0)>=0);cycle={header,binding:read('nav_idle_cycle_binding_snapshot','nav_idle_cycle_binding_ptr',52)};
   // Approach at a pure knot, without importing a caller tick's overshoot.
   const epsilon=Math.min(4e-9,header[23]/2);if(finish&&header[23]>epsilon)oracleAdvance(header[23]-epsilon);
   if(repair)assert.equal(f.session.core.removeWall(wall),1);
   if(finish){advance(header[23]);if(repair){updateIdle(oracleWorker,anchor,oracleWorker.idleState.approachRetry,navigation,f.state.seed);assert.equal(oracleWorker.idleState.mode,'walk');}}
  }
  const next=()=>read('nav_idle_cycle_next','nav_idle_cycle_next_ptr',14);
  const capture=()=>{const bound=f.tuple();return {bound,ticket:bound[1],header:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_proposal_header_ptr(),24)),semantic:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_proposal_semantic_ptr(),21))};};
  return {...f,q,c,wall,cycle,advance,next,oracleWorker,oracleAdvance,anchor,navigation,capture,
   stage({actorId=actor,session=q.nativeSession,sequence=next()?.[4]??q.requestSequence}={}){const status=w.nav_idle_stroll_cycle_approach_proposal_stage(actorId,session,sequence);return status===1?{status,...capture()}:{status};},
   commit(p,preparedTicket=p.ticket){const result=w.nav_idle_stroll_proposal_commit_bound(...p.bound.slice(0,5),preparedTicket);if(result===1)assert(w.nav_intent_clock_commit(1,0)>=0);return result;},
   binding:()=>read('nav_idle_stroll_binding_snapshot','nav_idle_stroll_binding_ptr',73),
   execution:()=>read('nav_idle_stroll_execution','nav_idle_stroll_execution_ptr',42),
   cycleBinding:()=>read('nav_idle_cycle_binding_snapshot','nav_idle_cycle_binding_ptr',52),
   async dispose(){f.close();await runtime?.dispose();}
  };
 }catch(error){f?.close();await runtime?.dispose();throw error;}
}
