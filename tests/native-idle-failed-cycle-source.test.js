import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {savedNativeIdleStroll,nativeIdleStrollRestorationSource} from './helpers/native-idle-stroll-restoration-source.js';
import {restoredNativeIdleStrollGame} from './helpers/native-idle-stroll-restoration-game.js';
import {LOCOMOTION} from '../src/simulation/locomotion-calibration.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {updateIdle} from '../src/simulation/idle.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

// Trusted native ABI only. No graphical21, fabricated20/22, Game projection,
// renderer, or claim about ordinary producer/cadence is supplied by this test.
async function fixture({threaded=false,profile='youngMale',local=false,retry=.25,rng,blocked=true,epoch=0,unknownTarget=false}={}){
 let runtime,f;
 try{
  const saved=local?savedNativeIdleStroll({profile}):savedNativeIdleApproach({profile});
  if(unknownTarget){const plant=saved.state.plants.find(p=>p.id===`plant-${saved.reference.anchor.id}`);plant.x+=480;saved.state.workers[0].idleState.destination.x=plant.x;saved.reference={...saved.reference,anchor:{...saved.reference.anchor,x:plant.x}};}
  if(retry==='rest-end'||retry==='watch-end'||retry==='after-watch-end'){
   const c=LOCOMOTION.sources.find(c=>c.profile===profile);let x=saved.state.workers[0].idleState.rng;x^=x<<13;x^=x>>>17;x^=x<<5;const rest=c.idleSeconds*(2+Math.floor((x>>>0)/4294967296*3));x^=x<<13;x^=x>>>17;x^=x<<5;
   retry=rest+(retry!=='rest-end'?c.alertSeconds*(1+Math.floor((x>>>0)/4294967296*2)):0)+(retry==='after-watch-end'?5e-10:0);
  }
  saved.state.workers[0].idleState.approachRetry=retry;saved.state.elapsed+=epoch;
  if(rng!==undefined)saved.state.workers[0].idleState.rng=rng;
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollRestorationSource(saved,{core:runtime?.core,peer:true});
  const {w,bridge,actor,worker}=f,q=bridge.nativeIdleStrollRequestReference(actor),calibration=LOCOMOTION.sources.find(c=>c.profile===profile);
  const wall=blocked?f.session.core.addWall(unknownTarget?q.pose.x:q.destination.x,unknownTarget?q.pose.z:q.destination.z,.4,.4):null;if(blocked)assert(wall>0);
  f.admitPeer();assert.equal(bridge.beginNativeRouteExecution().status,'started');assert(['committed','unchanged'].includes(bridge.commitNativeCausalClock().status));
  const read=(method,ptr,size)=>w[method](actor)===1?Array.from(new Float64Array(w.memory.buffer,w[ptr](),size)):null;
  const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  function propose(sequence=q.requestSequence,overrides={}){
   const a={...q.anchor,idleSeconds:q.idleSeconds,alertSeconds:calibration.alertSeconds,...overrides};
   const status=w[sequence===q.requestSequence?'nav_idle_cycle_failed_rest_proposal_stage':'nav_idle_cycle_proposal_stage'](actor,q.nativeSession,sequence,a.kind,a.id,a.x,a.z,a.radius,a.idleSeconds,a.alertSeconds);
   return status===1?{status,header:Array.from(new Float64Array(w.memory.buffer,w.nav_idle_cycle_proposal_header_ptr(),24)),ticket:tuple()[1]}:{status};
  }
  return {...f,q,wall,calibration,tuple,propose,
   execution:()=>read('nav_idle_cycle_execution','nav_idle_cycle_execution_ptr',14),
   next:()=>read('nav_idle_cycle_next','nav_idle_cycle_next_ptr',14),
   binding:()=>read('nav_idle_cycle_binding_snapshot','nav_idle_cycle_binding_ptr',52),
   commit(prepared){assert.equal(w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),prepared.ticket),1);assert(w.nav_intent_clock_commit(1,0)>=0);},
   advanceBy(dt){assert.equal(f.advance(f.state.elapsed+dt).status,'advanced');assert(w.nav_intent_clock_commit(1,0)>=0);},
   async dispose(){f.close();await runtime?.dispose();}
  };
 }catch(error){f?.close();await runtime?.dispose();throw error;}
}
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function assertPhase(row,offset,idle){assert.equal(row[offset],idle.mode==='rest'?1:idle.mode==='watch'?2:3);close(row[offset+1],idle.elapsed);close(row[offset+2],Math.max(0,idle.remaining));assert.equal(row[offset+3],idle.rng);close(row[offset+4],idle.approachRetry);}
function oracle(f){
 const worker=structuredClone(f.worker),a=f.q.anchor,anchor={id:worker.idleState.anchorId,x:a.x,z:a.z,idleRadius:a.radius},nav=createSpatialNavigationMovement(f.session,f.state);worker.idleState.pathVersion=-1;
 updateIdle(worker,anchor,0,nav,f.state.seed);assert.equal(worker.idleState.mode,'rest');
 return {worker,anchor,nav,advance(dt){
  // Observe original semantic knots; the finite native program does not
  // inherit overshoot caused by a particular caller's large tick.
  while(dt>1e-10){const s=worker.idleState,step=Math.min(dt,s.remaining>1e-9?s.remaining:Infinity,s.approachRetry>1e-9?s.approachRetry:Infinity);assert(step>0);updateIdle(worker,anchor,step,nav,f.state.seed);dt-=step;}
 }};
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} blocked WALK admits actual REST21 with finite retry and no invented arrival`,async()=>{
 const f=await fixture({threaded,profile:profile.id});try{
  const original=structuredClone(f.worker),body=f.body(1),worldRng=f.state.rng,o=oracle(f),seq=f.w.nav_intent_last_sequence();
  assert.equal(f.w.nav_idle_cycle_failed_rest_version(),1);const a=f.q.anchor;assert.equal(f.w.nav_idle_cycle_proposal_stage(f.actor,f.q.nativeSession,f.q.requestSequence,a.kind,a.id,a.x,a.z,a.radius,f.q.idleSeconds,f.calibration.alertSeconds),-2);const p=f.propose();assert.equal(p.status,1);assert.equal(p.header[0],2);assert.equal(p.header[4],0);assert.equal(p.header[23],.25);assert.equal(p.header[21],o.worker.idleState.remaining);assert.equal(f.binding(),null);assert.equal(f.w.nav_intent_last_sequence(),seq);
  assert.equal(f.w.nav_idle_cycle_source_snapshot(f.actor,p.ticket),1);const source=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_source_ptr(),26));assert.equal(source[1],1);assert.equal(source[5],f.q.requestSequence);assert.equal(source[6],f.q.requestedAt);assertPhase(source,21,o.worker.idleState);
  f.commit(p);assert.equal(f.w.nav_idle_stroll_restore_request_snapshot(f.actor),0);assert.equal(f.w.nav_initial_idle_body_binding_snapshot(f.actor),0);assert.equal(f.w.nav_idle_stroll_binding_snapshot(f.actor),0);assertPhase(f.execution(),5,o.worker.idleState);
  f.advanceBy(.125);o.advance(.125);assertPhase(f.execution(),5,o.worker.idleState);f.advanceBy(.125);o.advance(.125);assert.equal(f.execution()[10],1);assertPhase(f.next(),6,o.worker.idleState);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),0);
  const held=f.execution().slice(5,10),next=f.next();f.advanceBy(.8);assert.deepEqual(f.execution().slice(5,10),held);assert.deepEqual(f.next(),next);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,original);assert.equal(f.state.rng,worldRng);
 }finally{await f.dispose();}
});

test('blocked local WALK keeps full original program and the local radius guard',async()=>{
 const f=await fixture({local:true});try{
  const o=oracle(f),p=f.propose();assert.equal(p.status,1);assert(p.header[23]>p.header[21]);assert.equal(p.header[23],p.header[21]+f.calibration.alertSeconds*(1+Math.floor(p.header[22]/4294967296*2)));f.commit(p);f.advanceBy(p.header[23]);o.advance(p.header[23]);assertPhase(f.next(),6,o.worker.idleState);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),0);
 }finally{await f.dispose();}
});

for(const rng of [0,1,0xffffffff])test(`repeated outside failures preserve stream ${rng} across REST/WATCH knots and retries`,async()=>{
 const f=await fixture({rng,retry:0});try{
  const o=oracle(f);let p=f.propose();assert.equal(p.status,1);assert.equal(p.header[23],0);f.commit(p);updateIdle(o.worker,o.anchor,0,o.nav,f.state.seed);assertPhase(f.next(),6,o.worker.idleState);
  let sawWatch=false,sawRestAgain=false,lastMode='rest';const body=f.body(1),worldRng=f.state.rng;
  for(let i=0;i<40&&!sawRestAgain;i++){
   const n=f.next();p=f.propose(n[4]);assert.equal(p.status,1);assert.equal(p.header[0],2);assert(p.header[23]>0&&p.header[23]<=1);assertPhase(p.header,16,o.worker.idleState);f.commit(p);f.advanceBy(p.header[23]);o.advance(p.header[23]);assertPhase(f.next(),6,o.worker.idleState);
   const mode=o.worker.idleState.mode;if(mode==='watch')sawWatch=true;if(lastMode==='watch'&&mode==='rest')sawRestAgain=true;lastMode=mode;
  }
  assert(sawWatch&&sawRestAgain);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,worldRng);
 }finally{await f.dispose();}
});

test('repair selects an approach with retained remaining, same RNG, exact anchor and no route permission',async()=>{
 const f=await fixture();try{
  const o=oracle(f),p=f.propose(),body=f.body(1);f.commit(p);assert.equal(f.session.core.removeWall(f.wall),1);f.advanceBy(p.header[23]);
  const n=f.next();assert.equal(n[3],1);assert.equal(n[6],3);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),1);assert.equal(n[7],0);close(n[8],o.worker.idleState.remaining-.25);assert.equal(n[9],o.worker.idleState.rng);assert.equal(n[10],1);assert.equal(n[11],f.q.anchor.x);assert.equal(n[12],f.q.anchor.z);assert(f.w.nav_idle_cycle_next_points(f.actor)>0);assert.equal(f.w.nav_idle_stroll_binding_snapshot(f.actor),0);assert.equal(f.w.nav_idle_stroll_proposal_stage(f.actor,f.q.nativeSession,n[4]),-8);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('repaired pending source revokes failed preparation instead of committing its copied random draw',async()=>{
 const f=await fixture();try{
  const p=f.propose(),body=f.body(1),worker=structuredClone(f.worker);assert.equal(f.session.core.removeWall(f.wall),1);const tuple=f.tuple();assert.notEqual(f.w.nav_idle_cycle_proposal_commit_bound(...tuple.slice(0,5),p.ticket),1);assert.equal(f.binding(),null);assert.equal(f.w.nav_idle_cycle_proposal_revalidate(f.q.nativeSession,p.ticket),-1);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),f.q);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
 }finally{await f.dispose();}
});

test('cancellation, late retiming and prepared-ticket validation keep the same finite failure source',async()=>{
 const f=await fixture();try{
  const body=f.body(1),p=f.propose();assert.equal(f.w.nav_idle_cycle_proposal_cancel(f.q.nativeSession,p.ticket),1);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),f.q);const old=f.propose();f.advanceBy(.2);assert.equal(f.w.nav_idle_cycle_proposal_revalidate(f.q.nativeSession,old.ticket),1);const current=f.tuple();const translation=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_proposal_time_translation_ptr(current[0],current[1]),8));assert.equal(translation[7],1);assert(translation[5]>translation[3]);assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...current.slice(0,5),old.ticket+999),-9);f.commit(old);assert.deepEqual(f.binding().slice(4,28),old.header);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('available request, wrong source, anchor envelope and body removal cannot admit failed REST',async()=>{
 const f=await fixture({blocked:false});try{
  assert.equal(f.propose().status,-2);assert(f.session.core.addWall(f.q.destination.x,f.q.destination.z,.4,.4)>0);assert.equal(f.propose(f.q.requestSequence+999).status,-2);assert.equal(f.propose(undefined,{x:f.q.anchor.x+.1}).status,-2);assert.equal(f.propose(undefined,{radius:f.q.anchor.radius+.1}).status,-2);const p=f.propose();assert.equal(p.status,1);const tuple=f.tuple();assert.equal(f.w.spatial_body_remove(1),1);assert.notEqual(f.w.nav_idle_cycle_proposal_commit_bound(...tuple.slice(0,5),p.ticket),1);assert.equal(f.binding(),null);
 }finally{await f.dispose();}
});

test('real saved fractional start remains blocked at its original pose, without initial20 or arrived22',()=>{
 const f=restoredNativeIdleStrollGame(savedNativeIdleApproach());try{
  f.planner.commitNativeCausalClock();const q=f.planner.nativeIdleStrollFailedRestReference(f.actor).sourceRequest,c=LOCOMOTION.sources.find(c=>c.profile===q.workerProfile),body=f.body(1),worker=structuredClone(f.worker),w=f.w;
  assert.equal(w.nav_idle_cycle_failed_rest_proposal_stage(q.actorId,q.nativeSession,q.requestSequence,q.anchor.kind,q.anchor.id,q.anchor.x,q.anchor.z,q.anchor.radius,q.idleSeconds,c.alertSeconds),1);assert.equal(w.nav_intent_barrier_proposal_ticket(),1);const ticket=new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6)[1];assert.equal(w.nav_idle_cycle_source_snapshot(q.actorId,ticket),1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(w.nav_idle_stroll_binding_snapshot(q.actorId),0);
 }finally{f.close();}
});

for(const retry of ['rest-end','watch-end'])for(const repaired of [false,true])test(`${retry} gives an approach retry priority over a coincident phase transition (${repaired?'repaired':'blocked'})`,async()=>{
 const f=await fixture({retry});try{
  const o=oracle(f),p=f.propose();f.commit(p);if(repaired)assert.equal(f.session.core.removeWall(f.wall),1);f.advanceBy(p.header[23]);const n=f.next();assert.equal(n[3],1);
  if(repaired){assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),1);assert.equal(n[6],3);close(n[8],0);assert.equal(n[9],retry==='rest-end'?p.header[19]:p.header[22]);}
  else{o.advance(p.header[23]);assertPhase(n,6,o.worker.idleState);}
  if(retry==='rest-end'){assert.equal(f.execution()[5],1);assert.equal(f.execution()[8],p.header[19]);const held=f.execution().slice(5,10);f.advanceBy(2);assert.deepEqual(f.execution().slice(5,10),held);}
 }finally{await f.dispose();}
});

test('large absolute epoch cannot make a held retry cross its later WATCH knot',async()=>{
 const f=await fixture({epoch:2**20});try{
  const p=f.propose();f.commit(p);f.advanceBy(.25);const held=f.execution().slice(5,10),next=f.next();assert.equal(held[0],1);assert.equal(held[3],p.header[19]);f.advanceBy(p.header[21]+f.calibration.alertSeconds*3);assert.deepEqual(f.execution().slice(5,10),held);assert.deepEqual(f.next(),next);
 }finally{await f.dispose();}
});

test('unknown connectivity cannot supply a failed source or consume its RNG',()=>{
 const saved=savedNativeIdleApproach({position:'inside'}),idle=saved.state.workers[0].idleState,plant=saved.state.plants.find(p=>p.id===`plant-${saved.reference.anchor.id}`);plant.x+=480;idle.destination.x=plant.x;saved.reference={...saved.reference,anchor:{...saved.reference.anchor,x:plant.x}};
 const f=nativeIdleStrollRestorationSource(saved);try{
  f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor),c=LOCOMOTION.sources.find(c=>c.profile===q.workerProfile),worker=structuredClone(f.worker),body=f.body(1);assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(f.actor,q.nativeSession,q.requestSequence),-6);assert.equal(f.w.nav_idle_cycle_failed_rest_proposal_stage(f.actor,q.nativeSession,q.requestSequence,q.anchor.kind,q.anchor.id,q.anchor.x,q.anchor.z,q.anchor.radius,q.idleSeconds,c.alertSeconds),-2);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('a retry with newly unknown connectivity holds its source stream until an explicit native resolution',async()=>{
 // Explicit known-empty start + unavailable target, never an old valid
 // corridor. Removing the start obstruction exposes the unknown result.
 const f=await fixture({unknownTarget:true});try{
  const p=f.propose();assert.equal(p.status,1);f.commit(p);assert.equal(f.session.core.removeWall(f.wall),1);const body=f.body(1),worker=structuredClone(f.worker),rng=f.state.rng;f.advanceBy(p.header[23]);const n=f.next();assert.equal(n[3],-6);assert.equal(n[4],0);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),0);const held=f.execution().slice(5,10),sequence=f.w.nav_intent_last_sequence();f.advanceBy(2);assert.deepEqual(f.execution().slice(5,10),held);assert.deepEqual(f.next(),n);assert.equal(f.w.nav_intent_last_sequence(),sequence);assert.equal(f.w.nav_idle_cycle_resolve_next(f.actor,f.q.nativeSession,f.binding()[1]),-6);assert.equal(f.w.nav_intent_last_sequence(),sequence);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);
 }finally{await f.dispose();}
});

test('retry timer requires zero and does not inherit the phase-end 1ns tolerance',async()=>{
 const f=await fixture();try{
  const p=f.propose();f.commit(p);const body=f.body(1),sequence=f.w.nav_intent_last_sequence();f.advanceBy(.25-5e-10);const before=f.execution();assert.equal(before[10],0);assert(before[9]>0);assert.equal(f.next(),null);assert.equal(f.w.nav_intent_last_sequence(),sequence);f.advanceBy(1e-9);assert.equal(f.execution()[10],1);assert(f.next()[4]>sequence);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('a phase-end successor does not retry early when its positive timer is below 1ns',async()=>{
 const f=await fixture({retry:'after-watch-end'});try{
  const p=f.propose();f.commit(p);assert.equal(f.session.core.removeWall(f.wall),1);f.advanceBy(p.header[23]);const n=f.next();assert.equal(n[6],1);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),0);assert(n[10]>0&&n[10]<1e-9);const next=f.propose(n[4]);assert.equal(next.status,1);assert.equal(next.header[23],n[10]);f.commit(next);f.advanceBy(next.header[23]);assert.equal(f.w.nav_idle_cycle_next_approach(f.actor),1);assert.equal(f.next()[9],n[9]);
 }finally{await f.dispose();}
});
