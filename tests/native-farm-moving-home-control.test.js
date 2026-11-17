import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmMovingHome as fixture} from './helpers/native-farm-moving-home-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} Farm stopped lease survives actual Home request through acquired18`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});const body=f.body(1),peer=f.body(3),phase=f.held.value('walkPhase'),age=f.held.value('age'),request=f.requestHome();assert(f.held.isCurrent());assert(!f.legacyHeld.isCurrent());assert.equal(f.held.value('walkPhase'),phase);assert.equal(f.held.value('age'),age);
  const p=f.prepareHome(),lease=f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());const bad=structuredClone(p.nativeHome);bad.bodyId++;assert.throws(()=>f.c.admitHome(bad,{preparingWorldBoundary:p.worldBoundary}));f.advance(f.source.sourceReference.endTime-f.state.elapsed+.2);assert(f.held.isCurrent());assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.held.value('age'),age);const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);assert(f.planner.cancelNativeHomeRouteProposal(next.proposal.ticket));assert.deepEqual(f.planner.nativeHomeRequestReference(f.actor),request);assert(f.held.isCurrent());
  const fresh=f.prepareHome(),acquired=f.c.admitHome(fresh.nativeHome,{preparingWorldBoundary:fresh.worldBoundary}),binding=f.commitHome(fresh);assert(!f.held.isCurrent());assert(!acquired.isCurrent());assert.equal(f.c.installHomes(binding.reference.worldBoundary,[binding]),1);assert(acquired.isCurrent());assert(!lease.isCurrent());assert.deepEqual(f.body(1),body);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));f.advance(.2);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.worker.idleState,null);
 }finally{f?.close();await runtime?.dispose();}
});

for(const mode of ['missing','metadata-only'])test(`Farm ${mode} stop cannot upgrade its body with a Home request`,()=>{
 const f=fixture({installStop:mode!=='missing',projection:mode!=='metadata-only'});try{f.pauseEvents(true);f.pauseClocks(true);const sequence=f.c.status().sequence;f.requestHome();const event=f.events.findLast(e=>e.actorId===f.actor&&e.homeRequest);assert(event);assert.throws(()=>f.c.accept(event),/Home.*stopped/);assert.equal(f.c.status().sequence,sequence);assert(!f.held.isCurrent());}finally{f.close();}
});

test('malformed Farm Home child and missing clock cannot upgrade its installed body',()=>{
 const f=fixture();try{f.pauseEvents(true);f.pauseClocks(true);const sequence=f.c.status().sequence;f.requestHome();const event=f.events.findLast(e=>e.actorId===f.actor&&e.homeRequest),body=f.body(1);assert(event);for(const mutate of [e=>e.homeRequest.actorId++,e=>e.homeRequest.bodyId++,e=>e.homeRequest.profile++,e=>e.homeRequest.pose.x+=.1,e=>e.homeRequest.pose.yaw+=.1,e=>e.homeRequest.requestSequence++,e=>e.homeRequest.authorityEpoch='foreign']){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert.deepEqual(f.body(1),body);}assert(f.c.accept(event));assert(!f.held.isCurrent());f.acceptClock();assert(f.held.isCurrent());assert.equal(f.held.value('x'),f.source.pose.x);}finally{f.close();}
});

test('retirement or physical removal closes the Farm body while Home waits',()=>{
 for(const action of ['retire','remove']){const f=fixture();try{f.requestHome();assert(f.held.isCurrent());if(action==='retire')assert.equal(f.w.nav_intent_retire_actor(f.actor),1);else assert.equal(f.w.spatial_body_remove(1),1);f.planner.commitNativeCausalClock();assert(!f.held.isCurrent());assert.throws(()=>f.held.value('yaw'),/obsolete/);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);}finally{f.close();}}
});
