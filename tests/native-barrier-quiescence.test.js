import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {setTimeout as delay} from 'node:timers/promises';

function transport(f){
 const {port1,port2}=new MessageChannel(),received=[],errors=[],waiters=[];let draw;
 port2.onmessage=({data:m})=>{
  received.push(m);for(const waiter of [...waiters])if(waiter.type===m.type){waiters.splice(waiters.indexOf(waiter),1);waiter.resolve(m);}
  if(m.type==='IntentBaseline'){
   draw=createNativeRouteControl({authorityEpoch:m.authorityEpoch,initialSequence:m.sequence,initialTime:m.effectiveTime,routes:m.routes});
   draw.acceptClock(m.clock,{baseline:true});port2.postMessage({type:'intent-control-applied',session:'boundary',authorityEpoch:m.authorityEpoch,
    sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  }else if(m.type==='IntentClock'){
   draw.acceptClock(m);port2.postMessage({type:'intent-clock-applied',session:'boundary',authorityEpoch:m.authorityEpoch,
    clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  }else if(m.type==='IntentControlClosed')draw.dispose();
  else if(m.type!=='IntentMutationQuiesce'&&m.type!=='IntentMutationRelease'){
   draw.accept(m);port2.postMessage({type:'intent-control-applied',session:'boundary',authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
  }
 };
 const source=createNativeIntentControlPublication({port:port1,session:'boundary',observe:f.bridge.observeNativeIntentControl,
  absoluteNow:()=>1000,onError:error=>errors.push(error)});
 return {source,received,errors,wait:type=>new Promise(resolve=>waiters.push({type,resolve})),ack:request=>port2.postMessage({...request,type:'intent-mutation-quiesced',accepted:true}),
  dispose(){source.dispose();port2.close();}};
}
function setup({core=null}={}){
 const f=fixture({core}),a=f.worker(1,f.point(-6,0),f.point(6,0)),b=f.worker(4,f.point(-6,6),f.point(6,6));
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');
 assert.equal(f.bridge.commitNativeCausalClock().status,'committed');f.bridge.intentChanges();return {...f,a,b};
}
const options=(f,c)=>({getPublication:()=>c.source,...f.point(2,0),halfX:.15,halfZ:.6,yaw:.2});

test('the authority stages no world changes, waits for its exact direct receipt, then publishes revocation before releasing drawing',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
  assert.equal((await f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c))).status,'busy');
  const released=c.wait('IntentMutationRelease');c.ack(request);const result=await pending,release=await released;
  assert.equal(result.status,'committed');assert(result.barrierId>0);assert.equal(f.bridge.nativeRouteTiming(f.a),null);assert(f.bridge.nativeRouteTiming(f.b));
  const types=c.received.map(m=>m.type),revoked=types.lastIndexOf('RouteInvalidated'),clock=types.lastIndexOf('IntentClock'),end=types.lastIndexOf('IntentMutationRelease');
  assert(revoked>types.indexOf('IntentMutationQuiesce')&&clock>revoked&&end>clock);
  assert.equal(release.heldTime,11);assert.equal(release.sequence,sequence+1);assert.equal(release.clockSequence,request.clockSequence+1);
  assert.deepEqual(c.errors,[]);assert.equal(c.source.status().pendingMutationHold,null);
 }finally{c.dispose();f.session.dispose();}
});

test('conditioned chunk addition and batch eviction preserve native/JS residency until commit and adopt only native results',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const original=f.session.core.captureResidentChunks(),sequence=f.w.nav_intent_transition_sequence();
  let received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'addChunk',cx:4,cz:4}}),request=await received;
  assert.deepEqual(f.session.core.captureResidentChunks(),original);assert.equal(f.w.spatial_has_chunk(4,4),0);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  let released=c.wait('IntentMutationRelease');c.ack(request);const added=await pending;await released;
  assert.equal(added.status,'committed');assert.deepEqual(added.ids.slice(0,2),[4,4]);assert(f.session.core.hasResidentChunk(4,4));
  const resident=f.session.core.captureResidentChunks();assert(resident.keys.includes('4,4'));assert.equal(resident.selected.cx,4);assert.equal(resident.selected.cz,4);
  received=c.wait('IntentMutationQuiesce');pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'removeChunks',chunks:[[4,4],[4,4]],releaseOnly:true}});request=await received;
  assert.deepEqual(f.session.core.captureResidentChunks(),resident);released=c.wait('IntentMutationRelease');c.ack(request);const removed=await pending;await released;
  assert.equal(removed.status,'committed');assert.deepEqual(removed.ids,[4,4]);assert.equal(f.w.spatial_has_chunk(4,4),0);
  assert.deepEqual(f.session.core.captureResidentChunks().keys,original.keys);assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
  const before=f.session.core.captureResidentChunks(),blocked=await f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
   mutation:{type:'removeChunks',chunks:[[1,1],[0,0]]}});
  assert.equal(blocked.status,'blocked');assert.equal(c.source.status().pendingMutationHold,null);assert.deepEqual(f.session.core.captureResidentChunks(),before);
 }finally{c.dispose();f.session.dispose();}
});

test('conditioned prop suppression and canonical restoration never publish preview recipes or mutate caller staging buffers',async()=>{
 const f=setup(),c=transport(f);try{
  f.session.core.selectChunk(1,1);const prop=f.session.core.props().find(p=>p.group<=5);assert(prop);
  await c.source.ready;const original=f.session.core.snapshot(),residency=f.session.core.captureResidentChunks(),payload=f.session.core.chunkPayload();
  let received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
   mutation:{type:'removeProp',group:prop.group,gx:prop.gx,gz:prop.gz}}),request=await received;
  assert.deepEqual(f.session.core.snapshot(),original);assert.deepEqual(f.session.core.captureResidentChunks(),residency);assert.deepEqual(f.session.core.chunkPayload(),payload);
  let released=c.wait('IntentMutationRelease');c.ack(request);assert.equal((await pending).status,'committed');await released;
  const suppressed=f.session.core.snapshot();assert.equal(suppressed.removedProps.length,original.removedProps.length+1);
  const records=original.removedProps.map(p=>({...p}));received=c.wait('IntentMutationQuiesce');
  pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'restoreRemovedProps',records}});request=await received;
  assert.deepEqual(f.session.core.snapshot(),suppressed);records.push({group:5,gx:999,gz:999});
  released=c.wait('IntentMutationRelease');c.ack(request);assert.equal((await pending).status,'committed');await released;
  assert.deepEqual(f.session.core.snapshot().removedProps,original.removedProps);assert.deepEqual(f.session.core.captureResidentChunks(),residency);
  assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
 }finally{c.dispose();f.session.dispose();}
});

test('terrain recipe preview and rejected support edits leave the live world and routes untouched until an exact receipt',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const initial=f.session.core.snapshot(),body=f.body(1),sequence=f.w.nav_intent_transition_sequence(),payload=f.session.core.chunkPayload();
  const blocked=await f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'settlements',replace:true,
   sites:[{x:1000,z:1000,hx:1,hz:1},{x:body.x+5,z:body.z+3,hx:4,hz:4}]}});
  assert.equal(blocked.status,'blocked');assert.deepEqual(f.session.core.snapshot(),initial);assert.deepEqual(f.session.core.chunkPayload(),payload);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.a));assert.equal(c.source.status().pendingMutationHold,null);
  const mutation={type:'settlements',sites:[{x:1000,z:1000,hx:1,hz:1}]},received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation}),request=await received;
  assert.deepEqual(f.session.core.snapshot(),initial);mutation.sites[0].x=1200;
  const released=c.wait('IntentMutationRelease');c.ack(request);const result=await pending;await released;
  assert.equal(result.status,'committed');const after=f.session.core.snapshot();assert(after.settlements.some(s=>s.x===1000));
  assert(!after.settlements.some(s=>s.x===1200));assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
 }finally{c.dispose();f.session.dispose();}
});

test('a native committed chunk with a failed JS publication mirror closes drawing instead of releasing an uncertain hold',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const original=f.session.core.adoptNativeResidencyCommit;
  f.session.core.adoptNativeResidencyCommit=()=>{throw Error('simulated mirror failure');};
  const received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
   mutation:{type:'addChunk',cx:4,cz:4}}),request=await received,closed=c.wait('IntentControlClosed');c.ack(request);
  const result=await pending,retired=await closed;assert.equal(result.status,'committed-control-failed');assert.match(result.error,/mirror failure/);
  assert.equal(f.w.spatial_has_chunk(4,4),1);assert.equal(retired.reason,'mutation-commit-failed');assert.equal(c.source.status().closed,true);
  assert(!c.received.some(m=>m.type==='IntentMutationRelease'));
  f.session.core.adoptNativeResidencyCommit=original;original(6,result.ids);assert(f.session.core.captureResidentChunks().keys.includes('4,4'));
 }finally{c.dispose();f.session.dispose();}
});

test('real pthread chunk preparation remains unpublished while staged and is adopted after a conditioned commit',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),world=await createThreadedSpatialWorld(factory),f=setup({core:world.core}),c=transport(f);
 try{
  const preparation=f.session.core.preparation,id=preparation.start(4,4);assert(id>0);
  for(let i=0;i<1000&&preparation.status()!==3;i++)await delay(4);
  assert.equal(preparation.status(),3);assert.equal(preparation.metric(0),1);await c.source.ready;
  const before=f.session.core.captureResidentChunks(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'publishPreparedChunk',id}}),request=await received;
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert.equal(preparation.metric(8),0);assert.equal(f.w.spatial_has_chunk(4,4),0);
  const released=c.wait('IntentMutationRelease');c.ack(request);const result=await pending;await released;
  assert.equal(result.status,'committed');assert.deepEqual(result.ids.slice(0,2),[4,4]);assert.equal(preparation.metric(8),1);
  assert(f.session.core.captureResidentChunks().keys.includes('4,4'));assert(f.bridge.nativeRouteTiming(f.a));
 }finally{c.dispose();f.session.dispose();}
});

function crossing(f){
 f.session.actorSectorRevision({worker:true});
 for(let z=-16;z<=16;z+=2){const a={x:17.2,z:z+.2},b={x:32.2,z:z+.2};
  if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28)===1)return {a,b};}
 assert.fail('fixture requires a native route across the resident chunk boundary');
}
function crossingSetup(){
 const f=fixture(),points=crossing(f),route=f.worker(1,points.a,points.b);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
 assert.equal(f.advance(11).status,'advanced');f.bridge.commitNativeCausalClock();f.bridge.intentChanges();return {...f,points,route};
}

test('conditioned eviction preflights a future route without revoking it, then revokes it before native removal',async()=>{
 const f=crossingSetup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.captureResidentChunks(),sequence=f.w.nav_intent_transition_sequence(),body=f.body(1);
  assert.equal((await f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
   mutation:{type:'removeChunks',chunks:[[1,0]],releaseOnly:true}})).status,'blocked');
  assert.equal(c.source.status().pendingMutationHold,null);assert(f.bridge.nativeRouteTiming(f.route));
  const
   received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
    mutation:{type:'removeChunks',chunks:[[1,0]]}}),request=await received;
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteTiming(f.route));assert.equal(f.w.nav_intent_residency_revocations(),0);
  const release=c.wait('IntentMutationRelease');c.ack(request);const result=await pending,done=await release;
  assert.equal(result.status,'committed');assert.deepEqual(result.ids,[1,0]);assert.equal(done.committed,true);
  assert.equal(f.bridge.nativeRouteTiming(f.route),null);assert.equal(f.w.spatial_has_chunk(1,0),0);
  assert(!f.session.core.captureResidentChunks().keys.includes('1,0'));assert.deepEqual(f.body(1),body);
  assert(c.received.some(m=>m.type==='RouteInvalidated'&&m.revokedRouteHandle?.generation===f.route.generation));
 }finally{c.dispose();f.session.dispose();}
});

test('a newer causal policy invalidates each family of staged world proposal before physical publication',async()=>{
 for(const family of ['overlay','residency','props','terrain']){
  const f=setup(),c=transport(f);try{
   let mutation;if(family==='overlay')mutation={type:'addPolygon',points:[{x:30,z:30},{x:31,z:30},{x:31,z:31},{x:30,z:31}]};
   if(family==='residency')mutation={type:'addChunk',cx:4,cz:4};
   if(family==='props'){f.session.core.selectChunk(1,1);const p=f.session.core.props().find(p=>p.group<=5);assert(p);
    mutation={type:'removeProp',group:p.group,gx:p.gx,gz:p.gz};}
   if(family==='terrain')mutation={type:'settlements',sites:[{x:1000,z:1000,hx:1,hz:1}]};
   await c.source.ready;const before=f.session.core.snapshot(),resident=f.session.core.captureResidentChunks(),sequence=f.w.nav_intent_transition_sequence(),
    received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation}),request=await received;
   assert.deepEqual(f.session.core.snapshot(),before,family);assert.deepEqual(f.session.core.captureResidentChunks(),resident,family);
   assert.equal(f.bridge.commitNativeCausalClock({paused:true}).status,'committed');const released=c.wait('IntentMutationRelease');c.ack(request);
   const result=await pending,release=await released;assert.equal(result.status,'stale',family);assert.equal(release.committed,false);
   assert.deepEqual(f.session.core.snapshot(),before,family);assert.deepEqual(f.session.core.captureResidentChunks(),resident,family);
   assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.a));assert.deepEqual(c.errors,[]);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('retiring the draw connection while a world proposal waits never publishes or revokes it',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),resident=f.session.core.captureResidentChunks(),sequence=f.w.nav_intent_transition_sequence(),
   received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,
    mutation:{type:'settlements',sites:[{x:1000,z:1000,hx:1,hz:1}]}});
  await received;c.source.dispose('replaced');const result=await pending;
  assert.equal(result.status,'control-failed');assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),resident);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert(f.bridge.nativeRouteTiming(f.a));
 }finally{c.dispose();f.session.dispose();}
});

test('conditioned terrain preview cannot retire a future route until GPU receipt, then commits the canonical terrain mutation',async()=>{
 const f=crossingSetup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),selected=f.session.core.captureResidentChunks(),payload=f.session.core.chunkPayload(),
   sequence=f.w.nav_intent_transition_sequence(),body=f.body(1),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'settlements',
    sites:[{x:f.points.b.x,z:f.points.b.z,hx:1,hz:1}]}}),request=await received;
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),selected);
  assert.deepEqual(f.session.core.chunkPayload(),payload);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteTiming(f.route));assert.equal(f.w.nav_intent_terrain_revocations(),0);
  const release=c.wait('IntentMutationRelease');c.ack(request);const result=await pending;await release;
  assert.equal(result.status,'committed');assert.equal(f.bridge.nativeRouteTiming(f.route),null);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.nav_intent_terrain_revocations(),1);assert(c.received.some(m=>m.type==='RouteInvalidated'));
 }finally{c.dispose();f.session.dispose();}
});

function removableSolidRoute(f,under=false){
 const core=f.session.core,selected=core.currentChunk(),candidates=[];
 try{for(const key of core.captureResidentChunks().keys){const [cx,cz]=key.split(',').map(Number);core.selectChunk(cx,cz);
  candidates.push(...core.props().filter(p=>(p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18)&&p.group<=5&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35));}}
 finally{if(selected)core.selectChunk(selected.cx,selected.cz);}
 const initial=core.snapshot().removedProps;
 for(const p of candidates){if(core.removeProp({group:p.group,gx:p.gx,gz:p.gz})!==1)continue;
  const a=under?{x:p.x,z:p.z}:{x:p.x-p.radius-2.5,z:p.z},b=under?{x:p.x+.25,z:p.z}:{x:p.x+p.radius+2.5,z:p.z};
  f.session.actorSectorRevision({worker:true});if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28)===1)return {p,a,b,initial};
  core.restoreRemovedProps(initial);
 }
 assert.fail('fixture requires a canonical solid prop and a clear corridor after suppression');
}

test('conditioned prop restoration protects a body and defers future-route retirement until the commit event',async()=>{
 for(const under of [true,false]){
  const f=fixture();try{
   const p=removableSolidRoute(f,under),route=f.worker(1,p.a,p.b);f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();f.bridge.intentChanges();
   const c=transport(f);try{
    await c.source.ready;const before=f.session.core.snapshot(),payload=f.session.core.chunkPayload(),sequence=f.w.nav_intent_transition_sequence(),
     mutation={type:'restoreRemovedProps',records:p.initial};
    if(under){
     assert.equal((await f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation})).status,'blocked');
     assert.equal(c.source.status().pendingMutationHold,null);assert(f.bridge.nativeRouteTiming(route));
    }else{
     const received=c.wait('IntentMutationQuiesce'),pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation}),request=await received;
     assert(f.bridge.nativeRouteTiming(route));assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_props_mutation_revocations(),0);
     const release=c.wait('IntentMutationRelease');c.ack(request);assert.equal((await pending).status,'committed');await release;
     assert.equal(f.bridge.nativeRouteTiming(route),null);assert.equal(f.w.nav_intent_props_mutation_revocations(),1);
    }
    if(under){assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.chunkPayload(),payload);}
   }finally{c.dispose();}
  }finally{f.session.dispose();}
 }
});

test('prepared pthread job cancellation during the GPU wait cannot publish a stale chunk',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),world=await createThreadedSpatialWorld(factory),f=setup({core:world.core}),c=transport(f);
 try{
  const p=f.session.core.preparation,id=p.start(4,4);assert(id>0);for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);
  assert.equal(p.status(),3);await c.source.ready;const before=f.session.core.captureResidentChunks(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation:{type:'publishPreparedChunk',id}}),request=await received;
  p.cancel();const released=c.wait('IntentMutationRelease');c.ack(request);const result=await pending,release=await released;
  assert.equal(result.status,'blocked');assert.equal(release.committed,false);assert.equal(f.w.spatial_has_chunk(4,4),0);
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert(f.bridge.nativeRouteTiming(f.a));
 }finally{c.dispose();f.session.dispose();}
});

test('a world or clock change during the draw hold rejects the old proposal without publishing its barrier',async()=>{
 for(const change of ['body','clock']){
  const f=setup(),c=transport(f);try{
   await c.source.ready;const received=c.wait('IntentMutationQuiesce'),pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
   if(change==='body'){const p=f.point(35,35);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.2,0,1),1);}
   else assert.equal(f.bridge.commitNativeCausalClock({paused:true}).status,'committed');
   const before=f.session.core.snapshot(),release=c.wait('IntentMutationRelease');c.ack(request);
   assert.equal((await pending).status,'stale');await release;assert.deepEqual(f.session.core.snapshot(),before);
   assert(f.bridge.nativeRouteTiming(f.a));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(c.errors,[]);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('a forged draw receipt closes the direct channel and leaves the staged mutation unpublished',async()=>{
 const f=setup(),c=transport(f);try{
  await c.source.ready;const before=f.session.core.snapshot(),received=c.wait('IntentMutationQuiesce'),
   pending=f.bridge.addNativeBarrierAfterGpuQuiescence(options(f,c)),request=await received;
  c.ack({...request,clockSequence:request.clockSequence+1});assert.equal((await pending).status,'control-failed');
  assert.equal(c.source.status().closed,true);assert.deepEqual(f.session.core.snapshot(),before);
  assert(f.bridge.nativeRouteTiming(f.a));assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{c.dispose();f.session.dispose();}
});

test('conditioned overlay variants reuse the same direct GPU hold and native ticket without JS route tests',async()=>{
 for(const mutation of [
  f=>({type:'barriers',additions:[{...f.point(2,0),halfX:.15,halfZ:.6,yaw:.2}]}),
  f=>{const p=f.point(2,0);return {type:'addPolygon',points:[{x:p.x-.2,z:p.z-.2},{x:p.x+.2,z:p.z-.2},{x:p.x+.2,z:p.z+.2},{x:p.x-.2,z:p.z+.2}]};},
 ]){
  const f=setup(),c=transport(f);try{
   await c.source.ready;const before=f.session.core.snapshot(),received=c.wait('IntentMutationQuiesce'),
    pending=f.bridge.mutateNativeOverlayAfterGpuQuiescence({getPublication:()=>c.source,mutation:mutation(f)}),request=await received;
   assert.deepEqual(f.session.core.snapshot(),before);assert(f.bridge.nativeRouteTiming(f.a));
   const release=c.wait('IntentMutationRelease');c.ack(request);const result=await pending,done=await release;
   assert.equal(result.status,'committed');assert.equal(result.ids.length,1);assert(result.ids[0]>0);assert.equal(done.committed,true);
   assert.equal(f.bridge.nativeRouteTiming(f.a),null);assert(f.bridge.nativeRouteTiming(f.b));assert.deepEqual(c.errors,[]);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('conditioned overlay removals and passability changes use native IDs without resurrecting old generations',async()=>{
 const f=setup(),c=transport(f);try{
  const p=f.point(40,40),barrier=f.session.core.addBarrier(p.x,p.z,.2,.2,2),
   polygon=f.session.core.addPolygon([{x:p.x+2,z:p.z},{x:p.x+3,z:p.z},{x:p.x+3,z:p.z+1},{x:p.x+2,z:p.z+1}]);
  assert(barrier>0&&polygon>0);await c.source.ready;
  for(const mutation of [{type:'barrierPassability',id:barrier,passMask:0},{type:'removePolygon',id:polygon},
    {type:'barriers',removeIds:[barrier]}]){
   const before=f.session.core.snapshot(),received=c.wait('IntentMutationQuiesce'),
    pending=f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>c.source,mutation}),request=await received;
   assert.deepEqual(f.session.core.snapshot(),before);const release=c.wait('IntentMutationRelease');c.ack(request);
   const result=await pending,done=await release;assert.equal(result.status,'committed');assert.equal(done.committed,true);
   assert.deepEqual(result.ids,[]);assert(f.bridge.nativeRouteTiming(f.a));assert(f.bridge.nativeRouteTiming(f.b));
  }
  const final=f.session.core.snapshot();assert(!final.barriers.some(item=>item.id===barrier));assert(!final.polygons.some(item=>item.id===polygon));
 }finally{c.dispose();f.session.dispose();}
});
