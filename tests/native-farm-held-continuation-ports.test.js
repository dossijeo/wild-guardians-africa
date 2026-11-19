import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeFarmArrival as fixture} from './helpers/native-farm-arrival-control.js';
import {requestNativeIdleCurrentTask as requestTask} from './helpers/native-idle-current-task.js';
import {farmArrivalAdmissionProtocol} from './helpers/native-farm-arrival-route-ports.js';
import {tick} from '../src/simulation/game.js';

// Existing source/control/MessagePorts are real. GPU drain/resource handles in
// this protocol fixture are explicit doubles, not hardware acceptance.
for(const invalidate of ['none','task','home','abort'])test(`prepared held Farm23 traverses the existing ports; successor=${invalidate}`,async()=>{
 const f=fixture();let protocol;try{
  let body,source,held;const controller=new AbortController();
  // Attach the real publication at the pending13 baseline. A late attachment
  // to an already held body is deliberately unsupported in production.
  protocol=await farmArrivalAdmissionProtocol(f,{onPrepare(p){assert.deepEqual(p.sourceHeld.pose,source.pose);assert(held.isCurrent());assert.deepEqual(f.body(1),body);tick(f.state,.05,f.nav);if(invalidate==='task')requestTask(f);else if(invalidate==='home'){f.worker.contractDay--;tick(f.state,.01,f.nav);}else if(invalidate==='abort')controller.abort();}});
  const arrival=f.prepare(true),initial=f.commit(arrival);f.c.installFarmArrivals(initial.reference.worldBoundary,[initial]);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);f.advance(.1);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);
  const stop=f.planner.prepareNativeFarmArrivalStopProposal(f.actor);assert.equal(stop.status,'proposed');held=f.c.admitFarmArrivalStoppedBody({kind:'native-farm-arrival-stopped-body',version:1,stop:stop.proposal.nativeStop,actorId:f.actor},{preparingWorldBoundary:stop.proposal.worldBoundary});
  assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeFarmArrivalStopBinding(stop.proposal.nativeStop,stop.proposal.nativeStop,{projection:{version:1,routeEffects:stop.proposal.routeEffects,gateEffects:stop.proposal.gateEffects}});f.c.installFarmArrivalStops(stop.proposal.worldBoundary,[proof]);f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);
  tick(f.state,.01,f.nav);assert(f.planner.nativeFarmArrivalContinuationSource(f.actor));body=f.body(1);source=f.planner.nativeFarmArrivalHeldExecution(f.actor);
  const result=await f.planner.continueNativeFarmArrivalAfterGpuQuiescence({actorId:f.actor,getPublication:()=>protocol.source,prepareResources:({resources,signal})=>protocol.connection.prepareNativeFarmArrivalResources(resources,{signal}),signal:controller.signal});
  assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);
  if(invalidate==='none'){
   assert.equal(result.status,'committed',JSON.stringify(result));await protocol.released;assert.deepEqual(result.resources.nativeFarmArrivalBinding.reference.sourceHeld.pose,source.pose);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(held.isCurrent(),false);assert.equal(protocol.counters().commits,1);assert(f.c.admitFarmArrival(result.nativeFarmArrivalBinding.reference).isCurrent());tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);
  }else {assert.notEqual(result.status,'committed');assert.equal(protocol.counters().commits,0);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);if(invalidate==='task')assert(f.planner.pendingTaskRoute(f.actor));if(invalidate==='home')assert(f.planner.nativeHomeRequestReference(f.actor));}
  assert.deepEqual(protocol.errors,[]);
 }finally{await protocol?.close();f.close();}
});
