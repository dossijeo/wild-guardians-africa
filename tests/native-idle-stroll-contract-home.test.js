import test from 'node:test';import assert from 'node:assert/strict';
import {nativeIdleStrollGameFixture} from './helpers/native-idle-stroll-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {createNativeIntentProduction} from '../src/simulation/native-intent-production.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

async function fixture(threaded,profile,options={}){let runtime;try{if(threaded){const{default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}const f=nativeIdleStrollGameFixture({core:runtime?.core,profile,peer:false,...options});f.commitStroll();f.planner.projectNativeIdleStroll(f.state,f.worker);tick(f.state,.1,f.nav);return {...f,async close(){f.close();await runtime?.dispose();}};}catch(e){await runtime?.dispose();throw e;}}

for(const threaded of [false,true])for(const p of PROFILES)test(`${threaded?'pthread':'standalone'} ${p.id} contract expiry requests prepared WALK stop before Home on its original body`,async()=>{
 const f=await fixture(threaded,p.id);try{
  assert.equal(f.planner.nativeIdleStrollStopRequest?.(f.actor)??null,null);const binding=f.planner.nativeIdleStrollBinding(f.actor),body=f.body(1),rng=f.state.rng,ledger=structuredClone(f.state.ledger);
  f.state.time=p.end-.05;tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.worker.status,'idle');assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  const request=f.planner.nativeIdleStrollStopRequest(f.actor);assert.equal(request.reason,'home');assert.deepEqual(request.binding,binding);
  const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');const moving=f.body(1);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),moving);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);
  const fresh=f.planner.revalidateNativeIdleStrollStopProposal(stop.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const held=f.planner.projectNativeIdleStroll(f.state,f.worker),heldBody=f.body(1);tick(f.state,.1,f.nav);
  const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.equal(home.bodyId,binding.reference.bodyId);assert.equal(home.actorId,f.actor);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.status,'returning');assert.deepEqual(f.body(1),heldBody);assert.deepEqual(home.pose,held.pose);assert.equal(f.state.rng,rng);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.w.spatial_body_count(),1);
 }finally{await f.close();}
});

for(const threaded of [false,true])for(const p of PROFILES)test(`${threaded?'pthread':'standalone'} ${p.id} completed expired WALK requests Home without a synthetic REST or another body`,async()=>{
 const f=await fixture(threaded,p.id);try{
  const binding=f.planner.nativeIdleStrollBinding(f.actor);f.state.time=p.end-.05;tick(f.state,.1,f.nav);tick(f.state,Math.max(.1,f.proposal.endTime-f.state.elapsed+.2),f.nav);
  assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert.equal(home.bodyId,binding.reference.bodyId);assert.equal(home.actorId,f.actor);assert.equal(f.w.spatial_body_count(),1);assert.equal(f.planner.nativeIdleCycleExecution(f.actor),null);const body=f.body(1);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor).requestSequence,home.requestSequence);
 }finally{await f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} arrived WALK waits for its obsolete prepared stop to cancel before requesting Home`,async()=>{
 const f=await fixture(threaded,'olderMale');try{
  const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');f.state.time=249.95;tick(f.state,f.proposal.endTime-f.state.elapsed+.2,f.nav);assert(f.planner.nativeIdleStrollExecution(f.actor).arrived);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);const body=f.body(1);
  assert.equal(f.planner.cancelNativeIdleStrollStopProposal(stop.ticket),true);tick(f.state,.1,f.nav);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor).bodyId,1);
 }finally{await f.close();}
});

for(const field of ['session','assignment','generation','actor'])test(`completed WALK Home rejects a foreign ${field} without altering its endpoint`,async()=>{
 const f=await fixture(false,'olderMale');try{
  f.advance(f.proposal.endTime-f.state.elapsed+.2);const source=f.planner.projectNativeIdleStroll(f.state,f.worker),binding=source.binding,h=binding.reference.expectedRouteHandle,home=f.state.villages.find(v=>v.id===f.worker.villageId).entry,args=[f.actor,h.session,binding.assignmentSequence,h.generation,1,home.x,home.z],index={actor:0,session:1,assignment:2,generation:3}[field];args[index]++;const body=f.body(1);assert.notEqual(f.w.nav_intent_idle_stroll_home_request(...args),1);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),binding);
 }finally{await f.close();}
});

test('completed WALK Home retains its original request idempotently and rejects another goal',async()=>{
 const f=await fixture(false,'olderMale');try{
  f.advance(f.proposal.endTime-f.state.elapsed+.2);const source=f.planner.projectNativeIdleStroll(f.state,f.worker),b=source.binding,h=b.reference.expectedRouteHandle,home=f.state.villages.find(v=>v.id===f.worker.villageId).entry;f.worker.contractDay--;const request=f.planner.requestNativeIdleHome(f.state,f.worker);assert(request);const args=[f.actor,h.session,b.assignmentSequence,h.generation,1,home.x,home.z],body=f.body(1);assert.equal(f.w.nav_intent_idle_stroll_home_request(...args),1);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);args[5]+=.5;assert.equal(f.w.nav_intent_idle_stroll_home_request(...args),-3);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert.deepEqual(f.body(1),body);
 }finally{await f.close();}
});
test('an expired arrived WALK awaiting an existing stop cancellation does not dispatch a synthetic Idle cycle',async()=>{
 const f=await fixture(false,'olderMale');let production;try{const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');f.state.time=249.95;tick(f.state,f.proposal.endTime-f.state.elapsed+.2,f.nav);assert(f.planner.nativeIdleStrollExecution(f.actor).arrived);let calls=0;const planner={...f.planner,startNativeIdleCycleAfterGpuQuiescence(){calls++;return Promise.resolve({status:'invalid'});}};production=createNativeIntentProduction({state:f.state,planner,bodyId:()=>1,getPublication:()=>({status:()=>({coherent:true,closed:false})}),getResources:()=>({status:()=>({phase:'running',pending:false,retained:false})}),publicationSequence:()=>1,terrainManifest:()=>({epoch:'dispatch-observation',chunks:[]})});assert.equal(await production.wake(),null);assert.equal(calls,0);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert(f.planner.cancelNativeIdleStrollStopProposal(stop.ticket));}finally{production?.dispose();await f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} day expiry and prepared stop keep the Task peer advancing independently`,async()=>{
 const f=await fixture(threaded,'youngMale',{peer:true});try{
  f.worker.contractDay--;const peer=f.body(3);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(3),peer);assert.equal(f.planner.nativeIdleStrollStopRequest(f.actor).reason,'home');
  const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');const moving=f.body(1),movingPeer=f.body(3);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),moving);assert.notDeepEqual(f.body(3),movingPeer);
  assert.equal(f.planner.revalidateNativeIdleStrollStopProposal(stop.ticket).status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeIdleStroll(f.state,f.worker);const held=f.body(1),activePeer=f.body(3);tick(f.state,.1,f.nav);assert.deepEqual(f.body(1),held);assert.notDeepEqual(f.body(3),activePeer);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.planner.nativeHomeRequestReference(f.actor).bodyId,1);assert.equal(f.w.spatial_body_count(),2);
 }finally{await f.close();}
});

test('ordinary producer dispatches family12 and withdraws it when the actual contract is renewed',async()=>{
 const f=await fixture(false,'olderMale'),calls=[],prepared=[],errors=[];let production,release;
 try{
  f.worker.contractDay--;tick(f.state,.1,f.nav);
  const planner={...f.planner,stopNativeIdleStrollAfterGpuQuiescence(options){calls.push(options);const p=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(p.status,'proposed');options.prepareResources({resources:f.planner.captureNativeIdleStrollStopProposal(p.ticket),signal:options.signal,deferredStart:true});return new Promise(resolve=>{release=()=>resolve({status:'cancelled'});});}};
  production=createNativeIntentProduction({state:f.state,planner,bodyId:()=>1,getPublication:()=>({status:()=>({coherent:true,closed:false})}),getResources:()=>({status:()=>({phase:'running',pending:false,retained:false}),prepareNativeGateResources(resources,options){prepared.push({resources,options});return Promise.resolve({observationOnly:true});}}),publicationSequence:()=>7,terrainManifest:()=>({epoch:'dispatch-observation',chunks:[]}),onError:e=>errors.push(e)});
  const pending=production.wake();assert.equal(calls.length,1);assert.equal(calls[0].actorId,f.worker.id);assert.equal(prepared[0].resources.kind,12);assert.equal(prepared[0].options.minSequence,7);assert.equal(prepared[0].options.deferredStart,undefined);assert.equal(production.status().active.kind,'idle-stroll-stop');assert.equal(calls[0].signal.aborted,false);
  f.worker.contractDay=f.state.day;tick(f.state,.1,f.nav);production.wake();assert.equal(calls[0].signal.aborted,true);release();await pending;assert.equal(f.planner.nativeIdleStrollHeldExecution(f.actor),null);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.deepEqual(errors,[]);
 }finally{release?.();production?.dispose();await f.close();}
});

for(const fault of ['retired','pose','profile','task'])test(`${fault} live WALK source cannot supply a Home stop request`,async()=>{
 const f=await fixture(false,'olderMale');try{f.worker.contractDay--;if(fault==='retired'){f.w.nav_intent_retire_actor(f.actor);f.planner.commitNativeCausalClock();assert.equal(f.planner.nativeIdleStrollStopRequest(f.actor),null);}else{if(fault==='pose')f.worker.x+=.1;else if(fault==='profile')f.worker.profile='youngFemale';else f.worker.taskId='task-999';const at=f.state.elapsed,body=f.body(1);assert.throws(()=>f.planner.nativeIdleStrollStopRequest(f.actor),/Idle|stroll|source|owner/i);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);}}finally{await f.close();}
});
