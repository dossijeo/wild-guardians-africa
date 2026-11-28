import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmArrival as fixture,farmArrivalAdmissionProtocol as protocol} from './helpers/native-farm-arrival-route-ports.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {pair,fixture as graphicsFixture,preparedWorldDraw,flush} from './helpers/remote-webgpu-fixture.js';

async function until(predicate){for(let i=0;i<40&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert(predicate(),'Expected resource response');}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'running':'walking'} receipt crosses both original ports and publication with the actual native source`,async()=>{
 const f=fixture({profile:profile.id,peer:true});let p,prepared;try{
  const body=f.body(1),peer=f.body(3),q=f.c.pendingFarmArrivalRequest(f.actor),rng=f.state.rng;p=await protocol(f,{onPrepare(resources){prepared=resources;assert.deepEqual(resources.sourceRequest,q);f.advance(.2);assert.deepEqual(f.body(1),body);},onDrain(){f.advance(.1);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);}});
  const r=await p.run({urgent});assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));const release=await p.released;await flush();assert.deepEqual(release.nativeFarmArrivals,[r.nativeFarmArrivalBinding]);assert.equal(release.nativeHomes,undefined);assert.equal(release.nativeStrolls,undefined);assert.equal(release.nativeStartedRoutes,undefined);assert.deepEqual(r.nativeFarmArrivalBinding.preparedReference,prepared.nativeFarmArrival);assert.deepEqual(r.nativeFarmArrivalBinding.reference.sourceRequest,q);assert(f.c.admitFarmArrival(prepared.nativeFarmArrival).isCurrent());assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.equal(f.worker.status,'arriving');assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

for(const corruption of ['version','source','family','frame'])test(`a ${corruption} mismatch in the real publication ACK cannot acquire Farm23`,async()=>{
 const f=fixture();let p;try{const body=f.body(1),q=f.requestSource;p=await protocol(f,{receipt:m=>{if(corruption==='version')delete m.nativeFarmArrivalVersion;else if(corruption==='frame')delete m.preparedFrameSequence;else if(corruption==='family'){m.nativeHomeRouteVersion=1;m.preparedHomeRouteTemplate=m.preparedFarmArrivalTemplate;delete m.preparedFarmArrivalTemplate;}else m.preparedFarmArrivalTemplate.sourceRequest.pose.yaw+=.1;return m;}});const r=await p.run();assert.notEqual(r.status,'committed');assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),q);assert.equal(p.counters().commits,0);assert(p.errors.length);}finally{await p?.close();f.close();}
});

test('missing/wrong retained template on the resource port never reaches the drain',async()=>{
 for(const wrong of ['missing','changed']){const f=fixture();let p;try{p=await protocol(f,{template:r=>{if(wrong==='missing')return undefined;const q=structuredClone(r.nativeFarmArrival);q.sourceRequest.pose.yaw+=.1;return q;}});const body=f.body(1),r=await p.run();assert.equal(r.status,'control-failed');assert.equal(p.requests.length,0);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);}finally{await p?.close();f.close();}}
});

test('resource refresh preserves the exact Farm class and rejects another-family envelope before calling its handle',async()=>{
 const f=fixture({peer:true});let p;try{p=await protocol(f);const first=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal,handle=await p.connection.prepareNativeFarmArrivalResources(first);assert(handle.valid());assert.deepEqual(handle.preparedFarmArrivalTemplate,first.nativeFarmArrival);assert(handle.invalidate());f.advance(.1);const next=f.planner.revalidateNativeFarmArrivalRouteProposal(first.ticket).proposal;assert(await handle.refresh(next));assert.deepEqual(handle.preparedFarmArrivalTemplate,next.nativeFarmArrival);assert(handle.valid());await assert.rejects(p.connection.prepareNativeFarmArrivalResources(next),/already pending/);p.sendResource({kind:'refreshNativeHomeRouteResources',id:1,resources:next});await until(()=>p.responses.some(m=>m.kind==='nativeGateResourcesError'));assert.equal(p.counters().refreshes,1);assert.equal(p.endpointStatus().pending,null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);handle.abort();}finally{await p?.close();f.close();}
});

test('initial resource requests cannot wrap Farm23 in another family or another proposal as Farm23',async()=>{
 const f=fixture();let p;try{let calls=0;p=await protocol(f,{onPrepare(){calls++;}});const q=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal;await assert.rejects(p.connection.prepareNativeFarmArrivalResources({...q,kind:'native-home-route-proposal'}),/farm arrival proposal/);await assert.rejects(p.connection.prepareNativeFarmArrivalResources(q,{deferredStart:false}),/deferred/);p.sendResource({kind:'prepareNativeHomeRouteResources',id:1,resources:q,deferredStart:true});await until(()=>p.responses.some(m=>m.kind==='nativeGateResourcesError'));assert.equal(calls,0);assert.equal(p.endpointStatus().pending,null);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);}finally{await p?.close();f.close();}
});

test('cancellation aborts the original retained endpoint and preserves the request for retry',async()=>{
 const f=fixture(),controller=new AbortController();let p,cancel=true;try{const body=f.body(1),q=f.requestSource;p=await protocol(f,{onPrepare(){if(cancel){cancel=false;controller.abort();}}});const first=await p.run({signal:controller.signal});assert.notEqual(first.status,'committed');await flush();assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),q);assert.deepEqual(f.body(1),body);const second=await p.run();assert.equal(second.status,'committed',JSON.stringify({status:second.status,error:second.error}));await p.released;assert.deepEqual(second.nativeFarmArrivalBinding.reference.sourceRequest,q);}finally{await p?.close();f.close();}
});

test('a generic prepared image on the actual remote Host cannot mint the Farm23 receipt',async()=>{
 const f=fixture();let g,source,prepared;try{const [sourcePort,drawPort]=pair();g=await graphicsFixture({}, {intentControl:{port:drawPort,session:'farm23-generic'}});source=createNativeIntentControlPublication({port:sourcePort,session:'farm23-generic',timeoutMs:1000,observe:f.planner.observeNativeIntentControl});await source.ready;const proposal=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal,body=f.body(1);prepared=await preparedWorldDraw({...g,clock:{version:1,epoch:0,elapsed:f.state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]}},proposal.worldBoundary);await assert.rejects(source.quiesceGpuForMutation({preparedWorldBoundary:proposal.worldBoundary,preparedFarmArrivalTemplate:proposal.nativeFarmArrival}));assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);}finally{prepared?.abort();source?.dispose();g?.client.dispose();await g?.host.dispose();f.close();}
});

test('pthread uses the same native association and both real MessageChannels',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,p;try{f=fixture({core:runtime.core,peer:true});p=await protocol(f);const r=await p.run({urgent:true});assert.equal(r.status,'committed',JSON.stringify({status:r.status,error:r.error}));const release=await p.released;assert.deepEqual(release.nativeFarmArrivals,[r.nativeFarmArrivalBinding]);assert(f.c.admitFarmArrival(r.nativeFarmArrivalBinding.reference).isCurrent());}finally{await p?.close();f?.close();await runtime.dispose();}
});

for(const corruption of ['missing','duplicate','null','foreign-template'])test(`a ${corruption} final release cannot silently drop or replace the issued Farm association`,async()=>{
 const f=fixture();let p;try{p=await protocol(f);const release=p.source.releaseGpuAfterMutation;p.source.releaseGpuAfterMutation=(receipt,data)=>{const bad=structuredClone(data);if(corruption==='missing')delete bad.nativeFarmArrivals;else if(corruption==='duplicate')bad.nativeFarmArrivals.push(bad.nativeFarmArrivals[0]);else if(corruption==='null')bad.nativeFarmArrivals=null;else bad.nativeFarmArrivals[0].preparedReference.expectedRouteHandle.generation++;return release(receipt,bad);};const r=await p.run();assert.equal(r.status,'committed-control-failed',JSON.stringify({status:r.status,error:r.error}));assert(p.source.status().closed);assert(f.planner.nativeFarmArrivalRouteBinding(f.actor));assert.equal(p.requests.filter(m=>m.type==='IntentMutationRelease').length,0);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');}finally{await p?.close();f.close();}
});

test('conflicting Farm/Home packet templates reject before taking a publication hold',async()=>{
 const f=fixture();let p;try{p=await protocol(f);const proposal=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal;await assert.rejects(Promise.resolve().then(()=>p.source.quiesceGpuForMutation({preparedWorldBoundary:proposal.worldBoundary,preparedFarmArrivalTemplate:proposal.nativeFarmArrival,preparedHomeRouteTemplate:proposal.nativeFarmArrival})),/Conflicting/);assert.equal(p.requests.length,0);assert.equal(p.source.status().closed,false);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.actor),f.requestSource);assert(f.planner.cancelNativeFarmArrivalRouteProposal(proposal.ticket));}finally{await p?.close();f.close();}
});
