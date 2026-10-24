import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLiveScenePrograms} from '../src/rendering/live-program-preparation.js';
function fixture(){const objects=[],scene={traverse:fn=>objects.forEach(fn)};const add=()=>{const o={isMesh:true,parent:scene,geometry:{},material:{version:0}};objects.push(o);return o;};return {objects,scene,add};}
test('retiring a later object does not restart successful batches; newly added recipes are prepared',async()=>{
 const f=fixture(),a=f.add(),b=f.add();let c;const seen=[];
 const stats=await prepareLiveScenePrograms({},f.scene,{}, {batchSize:1,nextFrame:async()=>{},compile:async(r,view)=>{view.traverse(o=>seen.push(o));if(seen.length===1){b.parent=null;f.objects.splice(1,1);c=f.add();}}});
 assert.deepEqual(seen,[a,c]);assert.equal(stats.retiredObjects,1);assert.equal(stats.objects,2);
});
test('only the failed batch retries and changed material versions are recompiled',async()=>{
 const f=fixture(),a=f.add(),b=f.add();const seen=[];let failed=false;
 const stats=await prepareLiveScenePrograms({},f.scene,{}, {batchSize:1,nextFrame:async()=>{},compile:async(r,view)=>{let object;view.traverse(o=>object=o);seen.push(object);if(object===b&&!failed){failed=true;a.material.version++;const e=Error('disposed');e.code='BORROWED_RESOURCE_DISPOSED';throw e;}}});
 assert.deepEqual(seen,[a,b,a,b]);assert.equal(stats.invalidatedBatches,1);
});
test('cancellation and global timeout bound churn',async()=>{
 const f=fixture();f.add();let time=0;
 await assert.rejects(prepareLiveScenePrograms({},f.scene,{}, {now:()=>time,timeout:10,compile:async()=>{time=11;}}),/timed out/);
 await assert.rejects(prepareLiveScenePrograms({},f.scene,{}, {cancelled:()=>true}),/cancelled/);
});

test('compiler-owned transparent material version changes are captured after submission',async()=>{
 const f=fixture(),object=f.add();let calls=0;
 const stats=await prepareLiveScenePrograms({},f.scene,{}, {nextFrame:async()=>{},compile:async(r,v,c,t,options)=>{calls++;object.material.version+=2;options.onSubmit({label:'loading-compile-submit'});}});
 assert.equal(calls,1);assert.equal(stats.objects,1);
});

test('shared transparent compiler versions do not invalidate another completed batch',async()=>{
 const f=fixture(),a=f.add(),b=f.add();b.material=a.material;let calls=0;
 const stats=await prepareLiveScenePrograms({},f.scene,{}, {batchSize:1,nextFrame:async()=>{},compile:async(r,v,c,t,options)=>{calls++;a.material.version+=2;options.onSubmit({label:'loading-compile-submit'});if(calls>3)throw Error('Repeated compiler mutation');}});
 assert.equal(calls,2);assert.equal(stats.objects,2);
});

test('a context epoch change invalidates the entire operation',async()=>{
 const f=fixture();f.add();let epoch=0;
 await assert.rejects(prepareLiveScenePrograms({},f.scene,{}, {getEpoch:()=>epoch,nextFrame:async()=>{},compile:async()=>{epoch++;}}),/cancelled/);
});
