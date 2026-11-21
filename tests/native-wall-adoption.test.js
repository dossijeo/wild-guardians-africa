import test from 'node:test';import assert from 'node:assert/strict';import {MessageChannel} from 'node:worker_threads';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createSpatialWallMirror} from '../src/world/wild-engine/spatial-wall-mirror.js';
import {spatialStructureBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
async function fixture(){
 const f=createNativeRouteExecutionFixture();f.worker(1,f.point(-6,0),f.point(6,0));f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();const {port1,port2}=new MessageChannel();
 port2.onmessage=({data:m})=>{if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session:m.session,authorityEpoch:m.authorityEpoch,clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});else if(m.type==='IntentMutationQuiesce')port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true});else if(['RouteAssigned','RouteInvalidated','IntentChanged','RouteCompleted','RouteReplaced'].includes(m.type))port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});};
 const control=createNativeIntentControlPublication({port:port1,session:'wall-adoption',observe:f.bridge.observeNativeIntentControl});await control.ready;
 const walls=[0,1].map(i=>({id:'wall-owned-'+i,kind:'wall',status:'intact',material:'zarzas',x:f.point(30+i*5,30).x,z:f.point(30,30).z,yaw:.23,baseScaleX:1,gate:false}));
 const result=await f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>control,mutation:{type:'barriers',additions:walls.flatMap(spatialStructureBarriers)}});assert.equal(result.status,'committed');
 return {...f,walls,result,mirror:createSpatialWallMirror(f.session.core),close(){control.dispose();port2.close();f.session.dispose();}};
}
// Native commit and topology are real. The control receiver is a GPU double.
test('adopting a committed wall batch preserves IDs and checkpoint through ordinary mirror synchronization',async()=>{
 const f=await fixture();try{const core=f.session.core,before=core.snapshot(),boundary=f.bridge.nativeWorldResourceBoundary();
  assert(f.mirror.adoptNativeAdditions(f.walls,f.result));
  f.mirror.sync(f.walls);assert.deepEqual(core.snapshot(),before,'mirror must not install a second copy of committed walls');assert.deepEqual(f.bridge.nativeWorldResourceBoundary(),boundary);assert.deepEqual(f.walls.flatMap(w=>f.mirror.barrierIds(w.id)),f.result.ids);assert.equal(f.mirror.revision(),1);
 }finally{f.close();}
});
test('wall adoption rejects foreign IDs, changed shape, duplicate entity, unsupported family and stale receipt before any mirror write',async()=>{
 const f=await fixture();try{
  const attempts=[()=>f.mirror.adoptNativeAdditions(f.walls,{...f.result,ids:[...f.result.ids].reverse()}),()=>f.mirror.adoptNativeAdditions(f.walls.map((w,i)=>i?{...w,x:w.x+.5}:w),f.result),()=>f.mirror.adoptNativeAdditions([f.walls[0],f.walls[0]],f.result),()=>f.mirror.adoptNativeAdditions(f.walls.map(w=>({...w,gate:true})),f.result),()=>f.mirror.adoptNativeAdditions(f.walls,{...f.result,worldBoundary:{...f.result.worldBoundary,ticket:f.result.worldBoundary.ticket+1}})];
  const before=f.session.core.snapshot();for(const attempt of attempts){assert.throws(attempt);assert.equal(f.mirror.revision(),0);assert.deepEqual(f.mirror.barrierIds(f.walls[0].id),[]);assert.deepEqual(f.session.core.snapshot(),before);}
  assert(f.mirror.adoptNativeAdditions(f.walls,f.result));assert.throws(()=>f.mirror.adoptNativeAdditions(f.walls,f.result));assert.equal(f.mirror.revision(),1);f.mirror.sync(f.walls);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});

test('validated wall adoption preserves quote revision until Game synchronization and is single use',async()=>{
 const f=await fixture();try{
  const before=f.session.core.snapshot(),revision=f.mirror.revision(),adopt=f.mirror.prepareNativeAdditionAdoption(f.walls,f.result);
  assert.equal(typeof adopt,'function');assert.equal(f.mirror.revision(),revision);assert.deepEqual(f.mirror.barrierIds(f.walls[0].id),[]);assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(adopt(),true);assert.equal(f.mirror.revision(),revision+1);assert.throws(adopt,/stale/);f.mirror.sync(f.walls);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});
test('a delayed wall adoption rejects a changed mirror without installing a prefix',async()=>{
 const f=await fixture();try{
  const adopt=f.mirror.prepareNativeAdditionAdoption(f.walls,f.result);
  f.mirror.sync([{...f.walls[0],id:'other-owned-wall',x:f.walls[0].x+10}]);const before=f.session.core.snapshot(),revision=f.mirror.revision();
  assert.throws(adopt,/stale/);assert.equal(f.mirror.revision(),revision);assert.deepEqual(f.mirror.barrierIds(f.walls[0].id),[]);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.close();}
});
