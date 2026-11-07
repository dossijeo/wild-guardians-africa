import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrassSurfaceTimeline} from '../src/rendering/webgpu-grass-timeline.js';

function setup(){
 const removed=[],errors=[],owner={suspend(){},resume(){},syncChunk(){},removeChunk:key=>removed.push(key)};
 const timeline=createGrassSurfaceTimeline({owner,residency:{revisionAt:()=>null},onError:error=>errors.push(error.message)});
 return {timeline,removed,errors};
}
function publish(t,order=1,sequence=0){const payload={cx:0,cz:0},identity={key:'0,0',epoch:'e',revision:1,sequence,publicationOrder:order};t.prepared(payload,identity);t.published('0,0',identity);t.applied(payload,1,{epoch:'e',sequence,publicationOrder:order});return {payload,identity};}
test('local eviction is allowed only at a settled boundary and removes the exact visual identity',()=>{
 const {timeline:t,removed,errors}=setup();try{
  assert.equal(t.canEvictVisualLocal(),false);t.confirmed(0,new Set());publish(t);assert.equal(t.canEvictVisualLocal(),true);assert.equal(t.canEvictVisualLocal({cx:0,cz:0,epoch:'wrong',revision:1}),false);assert.equal(t.canEvictVisualLocal({cx:0,cz:0,epoch:'e',revision:1}),true);
  t.mutationPhase({phase:'start',sequence:1,kind:'commit'});assert.equal(t.canEvictVisualLocal(),false);t.confirmed(1,new Set());t.mutationPhase({phase:'end',sequence:1,kind:'commit'});assert.equal(t.canEvictVisualLocal(),true);
  assert.equal(t.visualLocalEvicted({cx:0,cz:0,epoch:'e',revision:1}),true);assert.deepEqual(removed,['0,0']);
  publish(t,2,1);assert.equal(t.canEvictVisualLocal(),true);assert.deepEqual(errors,[]);
 }finally{t.dispose();}
});
test('local eviction rejects pending preparation and recovery; mismatches fail closed',()=>{
 const {timeline:t,errors}=setup();try{
  t.confirmed(0,new Set());publish(t);const p={cx:1,cz:0},i={key:'1,0',epoch:'e',revision:1,sequence:1,publicationOrder:2};t.prepared(p,i);assert.equal(t.canEvictVisualLocal(),false);t.discarded(p,i);assert.equal(t.canEvictVisualLocal(),true);
  t.beginRecovery();assert.equal(t.canEvictVisualLocal(),false);t.finishRecovery(0);assert.equal(t.canEvictVisualLocal(),true);
  assert.equal(t.visualLocalEvicted({cx:0,cz:0,epoch:'wrong',revision:1}),false);assert.equal(t.canEvictVisualLocal(),false);assert.match(errors[0],/identity mismatch/);
 }finally{t.dispose();}
});
test('recovery without republication retains only settled identities still visible in residency',()=>{
 let current={epoch:'e',revision:1};const removed=[],errors=[],owner={suspend(){},resume(){},syncChunk(){},removeChunk:key=>removed.push(key)};
 const t=createGrassSurfaceTimeline({owner,residency:{revisionAt:()=>current},onError:error=>errors.push(error.message)});
 try{
  t.confirmed(0,new Set());publish(t);const identity={cx:0,cz:0,epoch:'e',revision:1};
  t.beginRecovery();assert.equal(t.canEvictVisualLocal(identity),false);t.finishRecovery(0);assert.equal(t.canEvictVisualLocal(identity),true);
  t.beginRecovery();current={epoch:'e',revision:2};t.finishRecovery(0);assert.equal(t.canEvictVisualLocal(identity),false);assert.equal(t.canEvictVisualLocal({...identity,revision:2}),false);assert.deepEqual(removed,[]);assert.deepEqual(errors,[]);
 }finally{t.dispose();}
});
test('recovery never retains identities from an unsettled terrain publication',()=>{
 const owner={suspend(){},resume(){},syncChunk(){},removeChunk(){}},t=createGrassSurfaceTimeline({owner,residency:{revisionAt:()=>({epoch:'e',revision:1})}});
 try{
  t.confirmed(0,new Set());publish(t);const p={cx:1,cz:0},i={key:'1,0',epoch:'e',revision:1,sequence:1,publicationOrder:2};t.prepared(p,i);
  t.beginRecovery();t.finishRecovery(0);assert.equal(t.canEvictVisualLocal({cx:0,cz:0,epoch:'e',revision:1}),false);
 }finally{t.dispose();}
});
