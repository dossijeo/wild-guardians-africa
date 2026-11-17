import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeHomeRequestContinuesHeldIdleStroll} from '../src/world/native-home-request-reference.js';
import {copyNativeIdleStrollHeldExecution} from '../src/world/native-idle-stroll.js';
import {nativeSuspendedBodiesFromProposal} from '../src/world/native-suspended-body-reference.js';
import {serialize} from '../src/persistence/snapshots.js';

// Actual source12/held22 -> Home18, logical projection and direct control.
// Installing the permission represents graphics; original Surface/GPU is a
// separate acceptance. No ordinary Game cohort capability is claimed here.
function fixture(options={}){
 const f=controlledNativeIdleStroll({...options,configureState(state,{point}){state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,-4);}});
 try{
  const walk=f.prepare(),binding=f.commitStroll(walk);f.c.installStrolls(binding.reference.worldBoundary,[binding]);f.planner.projectNativeIdleStroll(f.state,f.worker);f.advance(.12);f.planner.projectNativeIdleStroll(f.state,f.worker);
  const staged=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(staged.status,'proposed');const selector={kind:'native-idle-stroll-stopped-body',version:1,stop:staged.proposal.nativeStop,actorId:f.actor},heldLease=f.c.admitStoppedBody(selector,{preparingWorldBoundary:staged.proposal.worldBoundary});
  f.advance(.2);const fresh=f.planner.revalidateNativeIdleStrollStopProposal(staged.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),staged.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const p=fresh.proposal,proof=f.planner.nativeIdleStrollStopBinding(p.nativeStop,staged.proposal.nativeStop,{projection:{version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects}});assert(proof);f.c.installStrollStops(proof.reference.worldBoundary,[proof]);assert(heldLease.isCurrent());
  const held=f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(held.kind,'native-idle-stroll-held-execution');const legacy=f.c.admitSuspended(nativeSuspendedBodiesFromProposal(p,p.worldBoundary)[0]);
  return {...f,binding,held,heldLease,legacy,requestHome(){f.worker.contractDay=f.state.day-1;const request=f.planner.requestNativeIdleHome(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return request;}};
 }catch(error){f.close();throw error;}
}
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} typed held22 supplies Home while the same stopped body remains admitted`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),rng=f.state.rng,count=f.w.spatial_body_count(),source=f.held;
  assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.throws(()=>f.planner.requestNativeIdleHome(f.state,f.worker),/finished idle contract/);
  f.advance(.2);assert.deepEqual(f.planner.projectNativeIdleStroll(f.state,f.worker).pose,source.pose);assert.deepEqual(f.planner.nativeIdleStrollHeldExecution(f.actor).walkState,source.walkState);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  const request=f.requestHome();assert(nativeHomeRequestContinuesHeldIdleStroll(request,source));assert.deepEqual(request.pose,source.pose);assert(f.heldLease.isCurrent());assert.equal(f.legacy.isCurrent(),false);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.equal(f.worker.path,null);assert(!serialize(f.state).includes('native-idle-stroll-held-execution'));
  const held=f.planner.nativeIdleStrollHeldExecution(f.actor);assert.deepEqual(held.pose,source.pose);assert.deepEqual(f.planner.requestNativeIdleStrollHome(source,{villageId:request.home.villageId,x:request.home.x,z:request.home.z}),request);
  const proposed=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(proposed.status,'proposed');const lease=f.c.admitHome(proposed.proposal.nativeHome,{preparingWorldBoundary:proposed.proposal.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);f.planner.projectNativeHomeExecution(f.state,f.worker);assert(f.heldLease.isCurrent());assert.deepEqual(f.body(1),body);assert.equal(f.heldLease.value('x'),source.pose.x);
  const refreshed=f.planner.revalidateNativeHomeRouteProposal(proposed.proposal.ticket);assert.equal(refreshed.status,'revalidated');assert.equal(f.planner.cancelNativeHomeRouteProposal(refreshed.proposal.ticket),true);assert(f.heldLease.isCurrent());
  const next=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(next.status,'proposed');const homeLease=f.c.admitHome(next.proposal.nativeHome,{preparingWorldBoundary:next.proposal.worldBoundary});assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),next.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const home=f.planner.nativeHomeRouteBinding(f.actor);f.c.installHomes(home.reference.worldBoundary,[home]);assert(homeLease.isCurrent());assert(!f.heldLease.isCurrent());assert.equal(f.planner.nativeIdleStrollHeldExecution(f.actor),null);assert.deepEqual(f.body(1),body);f.planner.projectNativeHomeExecution(f.state,f.worker);f.advance(home.reference.endTime-f.state.elapsed+.01);assert(f.planner.projectNativeHomeExecution(f.state,f.worker).arrived);assert.equal(f.worker.x,Math.fround(request.home.x));assert.equal(f.worker.z,Math.fround(request.home.z));assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

test('held source substitutions and a pending barrier cannot issue Home or change the held Game pose',()=>{
 const f=fixture();try{
  const source=f.held,goal={villageId:Number(f.worker.villageId.split('-').at(-1)),...f.state.villages.find(v=>v.id===f.worker.villageId).entry};
  for(const change of [v=>v.pose.x+=.1,v=>v.pose.yaw+=.1,v=>v.resumeHandle.generation++,v=>v.assignmentSequence++,v=>v.sourceReference.worldBoundary.authorityEpoch='foreign']){const bad=structuredClone(source);change(bad);assert.throws(()=>f.planner.requestNativeIdleStrollHome(bad,goal));assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert(f.heldLease.isCurrent());}
  const request=f.requestHome(),p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');const worker=structuredClone(f.worker);assert.throws(()=>f.planner.requestNativeIdleStrollHome(source,goal),/request rejected/);assert.deepEqual(f.worker,worker);assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert(f.heldLease.isCurrent());assert.equal(f.planner.cancelNativeHomeRouteProposal(p.proposal.ticket),true);
  assert.equal(f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();assert.equal(f.planner.nativeIdleStrollHeldExecution(f.actor),null);assert.throws(()=>f.planner.requestNativeIdleStrollHome(source,goal),/not current/);assert(!f.heldLease.isCurrent());assert.throws(()=>copyNativeIdleStrollHeldExecution({...source,extra:true}),/held Idle/);
 }finally{f.close();}
});

test('direct Home request must match the privately held final pose before any owner changes',()=>{
 const f=fixture();try{
  f.pauseControl(true);f.pauseClock(true);f.requestHome();const event=f.events.at(-1);assert(event.homeRequest);const bad=structuredClone(event);bad.homeRequest.pose.x+=.1;assert.throws(()=>f.c.accept(bad),/actual stopped stroll/);assert(f.heldLease.isCurrent());
  f.c.accept(event);assert(!f.heldLease.isCurrent(),'unacknowledged sequence grants no draw');f.acceptLastClock();assert(f.heldLease.isCurrent());assert.equal(f.legacy.isCurrent(),false);
 }finally{f.close();}
});
