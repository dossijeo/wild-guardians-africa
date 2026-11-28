import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeFarmArrival as fixture} from './helpers/native-farm-arrival-control.js';
import {farmArrivalAdmissionProtocol} from './helpers/native-farm-arrival-route-ports.js';
import {idleCycleAdmissionProtocol} from './helpers/native-idle-cycle-admission.js';
import {tick} from '../src/simulation/game.js';
import {nativeHomeRequestContinuesFarmRequest} from '../src/world/native-home-request-reference.js';

// Existing authority/control/resource MessageChannels are real; GPU ACK and
// retained handles are explicit doubles, not hardware acceptance.
test('pending23 in flight expires into actual19 and cannot acquire the obsolete Farm packet',async()=>{
 const f=fixture();let protocol;try{
  const body=f.body(1),q=f.requestSource;protocol=await farmArrivalAdmissionProtocol(f,{onPrepare(){f.worker.contractDay--;tick(f.state,.1,f.nav);}});const result=await protocol.run({urgent:true});assert.notEqual(result.status,'committed');assert.equal(protocol.counters().commits,0);assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert(nativeHomeRequestContinuesFarmRequest(f.planner.nativeHomeRequestReference(f.actor),q));assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(protocol.errors,[]);
 }finally{await protocol?.close();f.close();}
});

for(const late of [false,true])test(`real pending13→19 traverses the existing Home resource/control ports with late preparation=${late}`,async()=>{
 const f=fixture();let protocol;try{
  const body=f.body(1),q=f.requestSource;protocol=await idleCycleAdmissionProtocol(f,{kind:'home-route',admit:p=>f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary}),onPrepare(){assert.deepEqual(f.body(1),body);if(late)tick(f.state,.1,f.nav);},onRelease(m){if(m.committed)f.c.installHomes(m.worldBoundary,m.nativeHomes);}});
  f.worker.contractDay--;tick(f.state,.1,f.nav);assert(nativeHomeRequestContinuesFarmRequest(f.planner.nativeHomeRequestReference(f.actor),q));const result=await protocol.run();assert.equal(result.status,'committed',JSON.stringify(result));await protocol.released;assert.equal(protocol.counters().commits,1);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert(f.c.admitHome(result.nativeHomeRouteBinding.reference).isCurrent());assert.deepEqual(f.body(1),body);tick(f.state,.1,f.nav);assert.notDeepEqual(f.body(1),body);assert.deepEqual(protocol.errors,[]);
 }finally{await protocol?.close();f.close();}
});
