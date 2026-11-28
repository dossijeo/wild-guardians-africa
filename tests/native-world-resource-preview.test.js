import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {spatialShieldFootprint} from '../src/world/wild-engine/spatial-shield-mirror.js';

async function setup({animal=false,...options}={}){
 const f=createNativeRouteExecutionFixture(options);f.worker(1,f.point(-6,0),f.point(6,0));
 if(animal)f.animal(f.point(-6,6),f.point(6,6));
 f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();
 const {port1,port2}=new MessageChannel(),messages=[];
 port2.onmessage=({data:m})=>{messages.push(m);
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session:m.session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce')port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true});
  else if(['RouteAssigned','RouteInvalidated','IntentChanged','RouteCompleted','RouteReplaced'].includes(m.type))port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 };
 const source=createNativeIntentControlPublication({port:port1,session:'preview',observe:f.bridge.observeNativeIntentControl});await source.ready;
 return {...f,source,messages,mutate:(mutation,options={})=>f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation,...options}),close(){source.dispose();port2.close();f.session.dispose();}};
}
const key=p=>p.cx+','+p.cz;
const prepared=()=>({valid:()=>true,commit:()=>true,abort(){}});
function matches(candidate,actual){
 assert.equal(candidate.kind,actual.kind);assert.equal(candidate.ticket,actual.ticket);assert.equal(candidate.nativeSession,actual.nativeSession);assert.equal(candidate.effectiveTime,actual.effectiveTime);
 assert.deepEqual(candidate.removed,actual.removed);
 const projected=new Map(actual.chunks.map(p=>[key(p),p]));for(const payload of candidate.chunks)assert.deepEqual(payload,projected.get(key(payload)));
 assert.deepEqual(candidate.chunks.map(key).sort(),actual.chunks.map(key).sort());
}
test('canonical resources are prepared before any GPU hold or physical effect, then applied to the exact native ticket',async()=>{
 const f=await setup();try{
  const before=f.session.core.captureResidentChunks(),selection=f.session.core.currentChunk();let finish,preview,applied=0,aborted=0;
  const pending=f.mutate({type:'addChunk',cx:4,cz:4},{prepareResources:async value=>{preview=value;await new Promise(resolve=>{finish=resolve;});return {valid:()=>true,commit:actual=>{applied++;assert.equal(f.w.spatial_has_chunk(4,4),1);assert.deepEqual(actual.worldBoundary,value.proposedWorldBoundary);matches(value.resources,actual.resources);return true;},abort(){aborted++;}};}});
  for(let i=0;i<100&&!finish;i++)await delay(1);assert(finish);assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);assert.equal(f.w.spatial_has_chunk(4,4),0);assert.equal(f.bridge.nativeWorldResourceBoundary(),null);
  assert.equal(preview.resources.phase,'proposal');assert.deepEqual(preview.resources.chunks.map(key),['4,4']);assert.deepEqual(f.session.core.captureResidentChunks(),before);assert.deepEqual(f.session.core.currentChunk(),selection);
  finish();const result=await pending;assert.equal(result.status,'committed');assert.equal(applied,1);assert.equal(aborted,1);assert.equal(f.w.spatial_world_proposal_resource_snapshot(result.worldBoundary.nativeSession,result.worldBoundary.ticket),0);
 }finally{f.close();}
});
test('preview payloads match canonical additions, removals, prop recipes and terrain while leaving the live world unchanged',async()=>{
 const f=await setup();try{
  const original=f.session.core.snapshot().removedProps;f.session.core.selectChunk(1,1);const prop=f.session.core.props().find(p=>p.group<=5&&Math.hypot(p.x-f.body(1).x,p.z-f.body(1).z)>20);assert(prop);
  f.session.core.selectChunk(-1,-1);
  for(const mutation of [{type:'addChunk',cx:4,cz:4},{type:'removeChunks',chunks:[[4,4],[4,4]],releaseOnly:true},{type:'removeProp',group:prop.group,gx:prop.gx,gz:prop.gz},{type:'restoreRemovedProps',records:original},{type:'settlements',sites:[{x:50,z:50,hx:2,hz:2}]}]){
   const before=f.session.core.snapshot(),resident=f.session.core.captureResidentChunks(),selection=f.session.core.currentChunk();let proposal;
   const result=await f.mutate(mutation,{prepareResources:({resources})=>{proposal=resources;assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),resident);assert.deepEqual(f.session.core.currentChunk(),selection);return prepared();}});
   assert.equal(result.status,'committed',JSON.stringify(result));matches(proposal,result.resources);
  }
 }finally{f.close();}
});
test('a changed native dependency aborts prepared resources without holding the old drawing generation',async()=>{
 const f=await setup();let aborted=0;
 try{
  const result=await f.mutate({type:'addChunk',cx:4,cz:4},{prepareResources:()=>{const point=f.point(35,35);assert.equal(f.w.spatial_body_upsert(77,point.x,point.z,.2,0,1),1);return {...prepared(),abort(){aborted++;}};}});
  assert.equal(result.status,'stale',JSON.stringify(result));assert.equal(aborted,1);assert.equal(f.w.spatial_has_chunk(4,4),0);assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
 }finally{f.close();}
});
test('an application failure after a physical commit keeps drawing closed instead of releasing an aborted mutation',async()=>{
 const f=await setup();try{
  const result=await f.mutate({type:'addChunk',cx:4,cz:4},{prepareResources:()=>({...prepared(),commit(){throw Error('prepared resource adoption failed');}})});
  assert.equal(result.status,'committed-control-failed');assert.equal(f.w.spatial_has_chunk(4,4),1);assert.equal(f.source.status().closed,true);assert.equal(f.messages.some(m=>m.type==='IntentMutationRelease'),false);
 }finally{f.close();}
});
test('the pthread preparation exports the identical proposed and committed canonical chunk without premature publication',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),world=await createThreadedSpatialWorld(factory),f=await setup({core:world.core});
 try{
  const p=f.session.core.preparation,id=p.start(4,4);assert(id>0);for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);assert.equal(p.status(),3);let preview;
  const result=await f.mutate({type:'publishPreparedChunk',id},{prepareResources:({resources})=>{preview=resources;assert.equal(f.w.spatial_has_chunk(4,4),0);assert.equal(p.status(),3);return prepared();}});
  assert.equal(result.status,'committed');assert.equal(preview.kind,11);matches(preview,result.resources);
 }finally{f.close();await world.dispose();}
});
test('failed preparation never holds the GPU or changes the physical world',async()=>{
 for(const mode of ['reject','invalid','stale']){
  const f=await setup();try{
   const result=await f.mutate({type:'addChunk',cx:4,cz:4},{prepareResources:()=>{if(mode==='reject')throw Error('GPU preparation failed');return mode==='invalid'?{}:{...prepared(),valid:()=>false};}});
   assert.equal(result.status,'control-failed');assert.equal(f.w.spatial_has_chunk(4,4),0);assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);assert.equal(f.source.status().closed,false);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  }finally{f.close();}
 }
});
test('cancellation releases the native proposal even if preparation is unresolved and aborts a late resource owner',async()=>{
 const f=await setup(),controller=new AbortController();let finish,entered=false,aborted=0;
 try{
  const pending=f.mutate({type:'addChunk',cx:4,cz:4},{signal:controller.signal,prepareResources:async()=>{entered=true;await new Promise(resolve=>{finish=resolve;});return {...prepared(),abort(){aborted++;}};}});
  for(let i=0;i<100&&!entered;i++)await delay(1);controller.abort();const result=await pending;assert.equal(result.status,'control-failed');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.w.spatial_has_chunk(4,4),0);finish();await delay(0);assert.equal(aborted,1);assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
 }finally{f.close();}
});

test('solid wall resource preview preserves routes and native topology until its exact commit',async()=>{
 const f=await setup();try{const p=f.point(35,35),addition={x:p.x,z:p.z,halfX:1,halfZ:.3,yaw:.2,passMask:0},before=f.session.core.snapshot();let seen=0;
  const result=await f.mutate({type:'barriers',additions:[addition]},{prepareResources:({resources})=>{seen++;assert.equal(resources.kind,2);assert.equal(resources.retainsNativeAssignments,true);assert.equal(resources.routeEffects.rows.length,0);assert.equal(resources.gateEffects.rows.length,0);assert.deepEqual(resources.chunks,[]);assert.deepEqual(resources.removed,[]);assert.deepEqual(f.session.core.snapshot(),before);return prepared();}});
  assert.equal(result.status,'committed');assert.equal(seen,1);assert.equal(result.ids.length,1);assert.equal(f.session.core.snapshot().barriers.length,before.barriers.length+1);assert.equal(f.w.spatial_world_resource_snapshot(),1);assert.deepEqual(f.bridge.nativeWorldResourceBoundary(),result.worldBoundary);
 }finally{f.close();}
});
test('solid wall resource preview refuses affected route owners and unsupported geometry before preparation',async()=>{
 const f=await setup();try{let preparations=0;const before=f.session.core.snapshot(),cross=f.point(0,0),away=f.point(35,35),options={prepareResources:()=>{preparations++;return prepared();}};
  const crossing=await f.mutate({type:'barriers',additions:[{x:cross.x,z:cross.z,halfX:.3,halfZ:2,yaw:0}]},options);assert.equal(crossing.status,'blocked');assert.equal(preparations,0);assert.deepEqual(f.session.core.snapshot(),before);
  const masked=await f.mutate({type:'barriers',additions:[{x:away.x,z:away.z,halfX:1,halfZ:.3,yaw:0,passMask:1}]},options);assert.equal(masked.status,'invalid');assert.equal(preparations,0);assert.deepEqual(f.session.core.snapshot(),before);
  const polygon=await f.mutate({type:'addPolygon',points:[away,{x:away.x+1,z:away.z},{x:away.x,z:away.z+1}]},options);assert.equal(polygon.status,'unsupported');assert.equal(preparations,0);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});
test('prepared shield polygons retain moving workers and their mirror adopts only the committed polygon',async()=>{
 const f=await setup();try{
  const p=f.point(0,0),shield={id:'spell-1',kind:'shield',...p,radius:1.95,remaining:20};
  const initial=f.session.core.snapshot(),state=f.state,worker=f.body(1);
  let preview;
  const prepare=({resources})=>{
   preview=resources;assert.equal(resources.retainsNativeAssignments,true);
   assert.deepEqual(resources.routeEffects.rows,new Float64Array());
   assert.deepEqual(resources.gateEffects.rows,new Float64Array());
   assert.deepEqual(resources.chunks,[]);assert.deepEqual(resources.removed,[]);
   return prepared();
  };
  const addition=await f.mutate({type:'addPolygon',points:spatialShieldFootprint(shield),passMask:1},{
   prepareResources:args=>{
    assert.deepEqual(f.session.core.snapshot(),initial);assert.equal(f.session.shieldPolygonId(shield.id),null);
    return prepare(args);
   }
  });
  assert.equal(addition.status,'committed',JSON.stringify(addition));assert.equal(preview.kind,3);
  assert.deepEqual(f.body(1),worker);matches(preview,addition.resources);
  const [id]=addition.ids;
  assert.throws(()=>f.session.prepareNativeShieldAdditionAdoption(shield,{...addition,ids:[id+1]}),/another polygon/);
  assert.throws(()=>f.session.prepareNativeShieldAdditionAdoption({...shield,radius:2},addition),/topology/);
  const adopt=f.session.prepareNativeShieldAdditionAdoption(shield,addition);assert.equal(adopt(),true);
  assert.throws(()=>adopt(),/stale/);assert.equal(f.session.shieldPolygonId(shield.id),id);
  state.spells=[shield];f.session.syncState(state);
  assert.deepEqual(f.session.core.snapshot().polygons.map(p=>p.id),[...initial.polygons.map(p=>p.id),id]);
  const removal=await f.mutate({type:'removePolygon',id},{prepareResources:args=>{
   assert.equal(f.session.shieldPolygonId(shield.id),id);
   assert(f.session.core.snapshot().polygons.some(p=>p.id===id));return prepare(args);
  }});
  assert.equal(removal.status,'committed',JSON.stringify(removal));assert.equal(preview.kind,4);
  matches(preview,removal.resources);assert.deepEqual(removal.ids,[id]);
  assert.throws(()=>f.session.prepareNativeShieldRemovalAdoption({...shield,id:'spell-2'},removal),/topology/);
  const retire=f.session.prepareNativeShieldRemovalAdoption(shield,removal);assert.equal(retire(),true);
  assert.throws(()=>retire(),/stale/);
  state.spells=[];f.session.syncState(state);
  assert.equal(f.session.shieldPolygonId(shield.id),null);
  assert.deepEqual(f.session.core.snapshot().polygons,initial.polygons);assert.deepEqual(f.body(1),worker);
 }finally{f.close();}
});
test('cancelling a prepared shield removal preserves its installed polygon',async()=>{
 const f=await setup(),controller=new AbortController();try{
  const p=f.point(0,0),shield={id:'spell-1',kind:'shield',...p,radius:1.95,remaining:20};
  f.state.spells=[shield];f.session.syncState(f.state);const id=f.session.shieldPolygonId(shield.id);
  let ready;
  const pending=f.mutate({type:'removePolygon',id},{signal:controller.signal,prepareResources:async()=>{
   await new Promise(resolve=>{ready=resolve;});return prepared();
  }});
  for(let i=0;i<100&&!ready;i++)await delay(1);assert(ready);
  controller.abort();assert.equal((await pending).status,'control-failed');ready();await delay(0);
  assert.equal(f.session.shieldPolygonId(shield.id),id);
  assert(f.session.core.snapshot().polygons.some(p=>p.id===id));
  assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
 }finally{f.close();}
});
test('a prepared shield cannot silently revoke a moving animal',async()=>{
 const f=await setup({animal:true});try{
  const shield={kind:'shield',...f.point(0,6),radius:1.95},before=f.session.core.snapshot();
  const result=await f.mutate({type:'addPolygon',points:spatialShieldFootprint(shield),passMask:1},
   {prepareResources:()=>assert.fail('An affected animal needs its own prepared handoff')});
  assert.equal(result.status,'blocked');
  assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
 }finally{f.close();}
});
test('solid wall preview still rejects clock advancement without a native deferred association',async()=>{
 const f=await setup();try{let aborted=0;const before=f.session.core.snapshot(),p=f.point(35,35);
  const result=await f.mutate({type:'barriers',additions:[{x:p.x,z:p.z,halfX:1,halfZ:.3,yaw:0}]},{prepareResources:()=>{f.state.elapsed+=.1;assert(f.w.nav_intent_execution_advance(f.state.elapsed)>=0);assert(f.w.nav_intent_clock_commit(1,0)>=0);return {...prepared(),abort(){aborted++;}};}});
  assert.equal(result.status,'stale');assert.equal(aborted,1);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
 }finally{f.close();}
});
