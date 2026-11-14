import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleCameraTerrain} from '../src/rendering/visible-camera-terrain.js';
import {createConfirmedCameraTerrain,CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';
import {createGrassSurfaceTimeline} from '../src/rendering/webgpu-grass-timeline.js';

const payload=(height=3)=>{const positions=new Float32Array(49*49*3);for(let i=1;i<positions.length;i+=3)positions[i]=height;return {authority:'spatial-wasm',cx:0,cz:0,terrain:{positions}};},
 tombstone={authority:'spatial-wasm',cx:0,cz:0,removed:true,capturedAt:2},
 metadata=(sequence,revision=sequence)=>({sequence,revision,epoch:'e',publicationOrder:revision}),
 identity=(sequence,revision=sequence)=>({key:'0,0',...metadata(sequence,revision)}),
 retirement=(sequence=2,revision=sequence)=>({cx:0,cz:0,kind:'remove',cause:'confirmed',...metadata(sequence,revision)});

test('camera retirement discards pending heights and maintains the revision fence through readmission',()=>{
 let visible={userData:{spatialTerrainRevision:1}};const view=createConfirmedCameraTerrain(),sent=[],bridge=createVisibleCameraTerrain({residency:{getVisible:()=>visible},send:p=>{sent.push(p);view.ingest(p);}});
 try{
  bridge.stage(payload(),1,metadata(1));bridge.published('0,0');view.confirm(1);assert.equal(view.surface(0,0),3);
  bridge.stage(payload(8),2,metadata(2));visible=null;assert.equal(bridge.removed(tombstone,3,metadata(3)),true);assert.equal(sent.length,2);assert.equal(sent[1].removed,true);assert.equal(sent[1].heights,undefined);
  assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(3);assert.equal(view.status().chunks,0);
  assert.equal(bridge.stage(payload(99),2,metadata(2)),false);assert.equal(bridge.removed(tombstone,3,metadata(3)),false);bridge.published('0,0');assert.equal(sent.length,2);
  bridge.stage(payload(4),4,metadata(4));visible={userData:{spatialTerrainRevision:4}};bridge.published('0,0');view.confirm(4);assert.equal(view.surface(0,0),4);
  assert.throws(()=>view.ingest({cx:0,cz:0,epoch:'e',revision:2,sequence:5,heights:new Float32Array(49*49)}),/Stale/);
 }finally{bridge.dispose();view.dispose();}
});

test('camera retirement requires actual graphical removal and cannot discard a newer prepared revision',()=>{
 let visible={userData:{spatialTerrainRevision:1}};const sent=[],bridge=createVisibleCameraTerrain({residency:{getVisible:()=>visible},send:p=>sent.push(p)});
 try{
  bridge.stage(payload(),1,metadata(1));bridge.published('0,0');assert.throws(()=>bridge.removed(tombstone,2,metadata(2)),/still visibly resident/);
  visible=null;assert.equal(bridge.removed(tombstone,2,metadata(2)),true);
  bridge.stage(payload(4),4,metadata(4));assert.equal(bridge.removed(tombstone,3,metadata(3)),false);
  visible={userData:{spatialTerrainRevision:4}};bridge.published('0,0');assert.equal(sent.at(-1).revision,4);assert.equal(sent.length,3);
  assert.throws(()=>bridge.removed(tombstone,5,{...metadata(5),epoch:'foreign'}),/epoch/);
 }finally{bridge.dispose();}
});

test('camera tombstones reject replacement buffers, malformed revisions and closed owners',()=>{
 const view=createConfirmedCameraTerrain(),message={cx:0,cz:0,epoch:'e',revision:1,sequence:1,removed:true};
 try{
  for(const change of [{removed:false},{revision:0},{sequence:-1},{heights:new Float32Array(49*49)},{mud:{}},{capturedAt:NaN}])assert.throws(()=>view.ingest({...message,...change}),/Invalid/);
  view.ingest(message);assert.throws(()=>view.ingest(message),/Stale/);view.confirm(1);assert.equal(view.status().chunks,0);
  view.dispose();assert.throws(()=>view.ingest({...message,revision:2}),/closed/);
 }finally{view.dispose();}
});

test('confirming an intermediate camera sequence never exposes a height superseded by a tombstone',()=>{
 const view=createConfirmedCameraTerrain();try{
  view.ingest({cx:0,cz:0,epoch:'e',revision:1,sequence:1,heights:new Float32Array(49*49).fill(3)});
  view.ingest({cx:0,cz:0,epoch:'e',revision:2,sequence:2,removed:true});view.confirm(1);assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);
  view.confirm(2);assert.equal(view.status().pending,0);assert.equal(view.status().chunks,0);
 }finally{view.dispose();}
});

function grassFixture(){
 let current=null,suspended=true;const calls=[],errors=[],owner={suspend(){suspended=true;calls.push('suspend');},resume(){suspended=false;calls.push('resume');},removeChunk:key=>calls.push(['remove',key]),syncChunk:key=>calls.push(['sync',key]),occupancyChanged:()=>false},
  grass=createGrassSurfaceTimeline({owner,residency:{revisionAt:()=>current},onError:e=>errors.push(e)}),p=payload(),first=identity(1);
 grass.prepared(p,first);current={cx:0,cz:0,epoch:'e',revision:1};grass.published('0,0',first);grass.applied(p,1,metadata(1));grass.confirmed(1,new Set());
 return {grass,calls,errors,get suspended(){return suspended;},setCurrent(value){current=value;},retire(change=retirement()){current=null;return grass.confirmedRemoval(change);},dispose(){grass.dispose();}};
}

test('confirmed grass retirement holds neighboring occupancy until the matching state is confirmed',()=>{
 const f=grassFixture();try{
  assert.equal(f.suspended,false);assert.equal(f.retire(),true);assert.equal(f.suspended,true);assert.equal(f.grass.status().requiredSequence,2);assert.equal(f.grass.status().matcher.pending,0);
  f.grass.biome(retirement());assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==='remove').length,1);assert.equal(f.retire(),false);
  f.grass.confirmed(2,new Set());assert.equal(f.suspended,false);assert.equal(f.grass.status().fault,null);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('a retirement preserves newer grass preparation and cannot undo its later publication',()=>{
 const f=grassFixture();try{
  const p=payload(4),next=identity(3);f.grass.prepared(p,next);f.retire();f.grass.confirmed(2,new Set());
  f.setCurrent({cx:0,cz:0,epoch:'e',revision:3});f.grass.published('0,0',next);assert.equal(f.grass.applied(p,3,metadata(3)),true);f.grass.confirmed(3,new Set());assert.equal(f.suspended,false);
  assert.equal(f.grass.confirmedRemoval(retirement()),false);f.grass.biome(retirement());assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==='remove').length,1);assert.equal(f.grass.status().fault,null);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('retirement during recovery drops the chunk before grass resumes at the recovery cursor',()=>{
 const f=grassFixture();try{
  f.grass.beginRecovery();assert.equal(f.retire(),true);assert.equal(f.suspended,true);f.grass.finishRecovery(2);assert.equal(f.suspended,false);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('grass retirement fails closed on conflicting identity, missing sequence or still resident terrain',()=>{
 for(const kind of ['conflict','missing','resident']){
  const f=grassFixture();try{
   if(kind==='conflict'){f.retire();f.grass.confirmedRemoval({...retirement(),epoch:'wrong'});}
   else if(kind==='missing')f.retire({...retirement(),sequence:undefined});
   else f.grass.confirmedRemoval(retirement());
   assert.equal(f.errors.length,1);assert.equal(f.suspended,true);assert(f.grass.status().fault);
  }finally{f.dispose();}
 }
});
