import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {uniform,float} from 'three/tsl';
import {createWebGpuGrassOwner} from '../src/rendering/webgpu-grass-owner.js';
import {createGrassTimelineCoordinator,createGrassTerrainMatcher,createGrassSurfaceTimeline} from '../src/rendering/webgpu-grass-timeline.js';
import {createTemporalSurfaceRecovery} from '../src/rendering/temporal-surface-recovery.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function bridgeFixture(){
 let suspended=true;const synced=[],removed=[],errors=[],revisions=new Map();
 const owner={suspend(){suspended=true;},resume(){suspended=false;},syncChunk(key){synced.push(key);},removeChunk(key){removed.push(key);}};
 const bridge=createGrassSurfaceTimeline({owner,residency:{revisionAt:(x,z)=>revisions.get(`${x},${z}`)},initialSequence:1,onError:error=>errors.push(error.message)});
 return {bridge,revisions,synced,removed,errors,isSuspended:()=>suspended};
}
const bridgeIdentity=(key,publicationOrder,sequence=2)=>({key,epoch:'e',revision:1,sequence,publicationOrder});
test('a stale biome removal preserves a newer prepared terrain publication',()=>{
 const f=bridgeFixture(),p={cx:0,cz:0},newer=bridgeIdentity('0,0',12);try{
  f.bridge.confirmed(1,new Set());f.bridge.prepared(p,newer);
  f.bridge.biome({kind:'remove',cx:0,cz:0,epoch:'e',revision:1,sequence:1,publicationOrder:11});
  f.bridge.published('0,0',newer);f.bridge.confirmed(2,new Set());
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:12}),true);assert.equal(f.isSuspended(),false);assert.deepEqual(f.errors,[]);
 }finally{f.bridge.dispose();}
});
test('a stale biome removal cannot remove coverage of a newer published terrain',()=>{
 const f=bridgeFixture(),p={cx:0,cz:0},newer=bridgeIdentity('0,0',12);try{
  f.bridge.confirmed(1,new Set());f.bridge.prepared(p,newer);f.bridge.published('0,0',newer);f.bridge.confirmed(2,new Set());assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:12}),true);
  f.bridge.biome({kind:'remove',cx:0,cz:0,epoch:'e',revision:1,sequence:1,publicationOrder:11});
  assert.deepEqual(f.removed,[]);assert.equal(f.isSuspended(),false);assert.deepEqual(f.errors,[]);
 }finally{f.bridge.dispose();}
});
test('surface bridge refuses ambiguous payload boundaries until exact discard',()=>{
 const f=bridgeFixture(),p={cx:0,cz:0},old=bridgeIdentity('0,0',1),current=bridgeIdentity('0,0',2);try{
  f.bridge.confirmed(1,new Set());f.bridge.prepared(p,old);f.bridge.prepared(p,current);f.bridge.published('0,0',current);f.bridge.confirmed(2,new Set());
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2}),false);assert.equal(f.isSuspended(),true);
  assert.equal(f.bridge.discarded(p,{...old,publicationOrder:3}),false);assert.equal(f.bridge.discarded(p,old),true);
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2}),false);assert.equal(f.isSuspended(),true);
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:1}),false);
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:2}),true);assert.equal(f.isSuspended(),false);assert.deepEqual(f.errors,[]);
 }finally{f.bridge.dispose();}
});
test('surface bridge settles the exact committed order even with another attempt alive',()=>{
 const f=bridgeFixture(),p={cx:0,cz:0},old=bridgeIdentity('0,0',1),current=bridgeIdentity('0,0',2);try{
  f.bridge.confirmed(1,new Set());f.bridge.prepared(p,old);f.bridge.prepared(p,current);f.bridge.published('0,0',current);f.bridge.confirmed(2,new Set());
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:1}),false);assert.equal(f.isSuspended(),true);
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:2}),true);assert.equal(f.isSuspended(),false);
  assert.equal(f.bridge.applied(p,1,{epoch:'e',sequence:2,publicationOrder:1}),false);assert.equal(f.bridge.discarded(p,old),true);assert.deepEqual(f.errors,[]);
 }finally{f.bridge.dispose();}
});
test('surface bridge eviction releases only its own pending terrain and rejects unregistered publications',()=>{
 const f=bridgeFixture(),a={cx:0,cz:0},b={cx:1,cz:0},ia=bridgeIdentity('0,0',1),ib=bridgeIdentity('1,0',2);try{
  f.bridge.confirmed(1,new Set());f.bridge.prepared(a,ia);f.bridge.prepared(b,ib);f.bridge.published('0,0',ia);f.bridge.published('1,0',ib);f.bridge.removed('0,0');
  assert.equal(f.isSuspended(),true);assert.equal(f.bridge.applied(a,1,{epoch:'e',sequence:2}),false);f.bridge.confirmed(2,new Set());assert.equal(f.isSuspended(),true);
  assert.equal(f.bridge.applied(b,1,{epoch:'e',sequence:2,publicationOrder:2}),true);assert.equal(f.isSuspended(),false);
  f.bridge.published('0,0',ia);assert.equal(f.isSuspended(),true);assert.match(f.errors[0],/Unregistered/);
 }finally{f.bridge.dispose();}
});
test('surface bridge recovery preserves newest biome identity and ignores stale callbacks',()=>{
 const f=bridgeFixture(),p={cx:0,cz:0},old=bridgeIdentity('0,0',1),current=bridgeIdentity('0,0',2);try{
  f.bridge.confirmed(1,new Set());f.bridge.beginRecovery();f.bridge.prepared(p,current);f.bridge.published('0,0',current);f.revisions.set('0,0',{epoch:'e',revision:1});f.bridge.finishRecovery(2);
  f.bridge.biome({kind:'replace',payload:p,epoch:'e',revision:1,sequence:2,publicationOrder:old.publicationOrder});assert.deepEqual(f.synced,[]);
  f.bridge.biome({kind:'replace',payload:p,epoch:'e',revision:1,sequence:2,publicationOrder:current.publicationOrder});assert.deepEqual(f.synced,['0,0']);assert.equal(f.isSuspended(),false);
  f.bridge.biome({kind:'replace',payload:p,epoch:'e',revision:1,sequence:3,publicationOrder:current.publicationOrder});assert.equal(f.isSuspended(),true);f.bridge.confirmed(3,new Set());assert.equal(f.isSuspended(),false);assert.deepEqual(f.errors,[]);
 }finally{f.bridge.dispose();}
});
test('recovery hides stale grass until confirmed state and terrain share the recovered boundary',async()=>{
 const modules=JSON.parse(await readFile(new URL('../public/assets/visual-lab/continuous-grass/modules.json',import.meta.url),'utf8')),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),atlas=new THREE.Texture(),mask=new Uint8Array(35*35*4),positions=new Float32Array(49*49*3);
 for(let i=0;i<mask.length;i+=4)mask.set([255,128,255,0],i);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;positions[i]=x-24;positions[i+2]=z-24;}
 const terrainGeometry=new THREE.BufferGeometry();terrainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const terrainMaterial=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(terrainGeometry,terrainMaterial),group=new THREE.Group();mesh.userData.checkpointGroundMask=mask;group.add(mesh);scene.add(group);
 let rev=1,sequence=1,releaseCheckpoint,releaseBoundary,closedLease=0;const terrainResidency={getVisible:(cx,cz)=>cx===0&&cz===0?mesh:null,forEachVisibleGround(visit){visit(mesh,'0,0');},revisionAt:(cx,cz)=>({cx,cz,epoch:'e',revision:rev})},jobs=[],errors=[],state={seed:123,structures:[],villages:[],plants:[]};
 const ground={acquireGrassResources:()=>({atlas,seed:uniform(new THREE.Vector2()),scale:uniform(.1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1),release(){closedLease++;}})},admission={prepareAndPublish(candidate,{signal},publish){return new Promise((resolve,reject)=>jobs.push({candidate,signal,finish(){try{publish();resolve();}catch(error){reject(error);}}}));},deferRelease(_object,dispose){dispose();},deferCompilations(dispose){dispose();}};
 const owner=createWebGpuGrassOwner({scene,camera,residency:terrainResidency,biome:'sabana',state,ground,clock:uniform(0),admission,quality:'baja',requireTerrainRevision:true,fetchImpl:async()=>({ok:true,json:async()=>structuredClone(modules)}),onError:e=>errors.push(e.message)});let coordinator;
 const terrain={beginReplay(){},stageReplayBoundary(){rev=3;const token=coordinator.terrainChanged();coordinator.terrainApplied(2,token);},waitForReplayBoundary(){return new Promise(resolve=>{releaseBoundary=resolve;});},finishReplay(){}},stream={queueReplayBoundary(){},advanceNextTimelineBoundary(){sequence=2;return true;},status:()=>({sequence}),finishTimelineReplay(){}};
 const recovery=createTemporalSurfaceRecovery({stream,terrain,validateCheckpoint(){},prepareCheckpoint:async()=>({sequence:1,epoch:'e',commit(){rev=2;const token=coordinator.terrainChanged();coordinator.terrainApplied(1,token);return true;},abort(){}}),onCheckpoint:async()=>{await new Promise(resolve=>{releaseCheckpoint=resolve;});state.plants.push({x:1,z:1,alive:true});},onBoundary:async()=>{state.plants.push({x:5,z:5,alive:true});coordinator.confirmed(2,new Set(['plants']));}});
 try{
  owner.syncState();owner.syncChunk('0,0');await owner.ready;await flush();assert.equal(jobs.length,1);coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});coordinator.beginRecovery();assert.equal(owner.status().suspended,true);const pending=recovery.restoreTimelineCheckpoint({sequence:1});await flush();assert.equal(rev,2);assert.equal(owner.status().visible,0);assert.equal(jobs[0].signal.aborted,true);jobs[0].finish();await flush();assert.equal(jobs.length,1);assert.equal(owner.status().visible,0);releaseCheckpoint();await pending;
  const boundary=recovery.applyTimelineRecoveryBoundary({sequence:2,publication:{},terrain:[]});await flush();assert.equal(rev,3);assert.equal(owner.status().visible,0);assert.equal(jobs.length,1);releaseBoundary();await boundary;assert.equal(owner.status().suspended,true);assert.equal(recovery.finishTimelineRecovery(),true);coordinator.finishRecovery(2);await flush();assert.equal(owner.status().suspended,false);assert.equal(jobs.length,2);const anchor=jobs[1].candidate.children[0].geometry.getAttribute('coverageAnchor');for(let i=0;i<anchor.count;i++)for(const plant of state.plants)assert.ok(Math.hypot(anchor.getX(i)-plant.x,anchor.getZ(i)-plant.z)>=2.19);jobs[1].finish();await flush();assert.equal(owner.status().visible,1);assert.deepEqual(errors,[]);
 }finally{releaseCheckpoint?.();releaseBoundary?.();coordinator?.dispose();owner.dispose();terrainGeometry.dispose();terrainMaterial.dispose();atlas.dispose();}assert.equal(closedLease,1);
});

test('real terrain history and confirmed stream keep grass suspended through checkpoint and replay',async()=>{
 const {readFileSync}=await import('node:fs'),{gunzipSync}=await import('node:zlib'),{deserialize,serialize}=await import('../src/persistence/snapshots.js'),{serializeConfirmedState}=await import('../src/simulation/confirmed-live-state.js'),{emit}=await import('../src/simulation/game.js'),{createConfirmedPresentationClock}=await import('../src/rendering/confirmed-presentation-clock.js'),{createConfirmedPresentationStream}=await import('../src/rendering/confirmed-presentation-stream.js'),{createConfirmedTerrainReceiver}=await import('../src/rendering/confirmed-terrain-receiver.js');
 const state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/manglares-123-d10-raid-state.json.gz',import.meta.url))).toString()),authority=deserialize(serialize(state)),clock=createConfirmedPresentationClock(state.elapsed),events=[],port=()=>({postMessage(){},start(){},close(){}});let suspended=false,stream,releaseCheckpoint,releaseBatch,terrainToken;
 const owner={suspend(){suspended=true;events.push('suspend');},resume(){suspended=false;events.push('resume');}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});
 const terrain=createConfirmedTerrainReceiver({port:port(),session:'s',confirmedSequence:1,confirmedElapsed:state.elapsed,retainRevisions:true,allowReplay:true,validateRevision(){},residency:{replace(){throw Error('unexpected legacy terrain');}},prepareGraphicalBatch:async messages=>{await stream.waitForTerrainSuppression(messages[0].sequence);await new Promise(resolve=>{releaseBatch=resolve;});return {commit(){events.push('terrain');terrainToken=coordinator.terrainChanged();return true;},abort(){}};},onApplied:(_payload,_revision,metadata)=>coordinator.terrainApplied(metadata.sequence,terrainToken)});
 stream=createConfirmedPresentationStream({port:port(),session:'s',state,terrain,initialSequence:1,presentationClock:clock,timeline:{maxPublications:2,maxBytes:50000000,manualBoundaries:true,replay:true},trackChangedKeys:['plants','structures','villages','culture'],onConfirmed:(message,keys)=>coordinator.confirmed(message.sequence,keys)});
 const recovery=createTemporalSurfaceRecovery({stream,terrain,validateCheckpoint(){},prepareCheckpoint:async()=>({sequence:1,epoch:'e',commit(){const token=coordinator.terrainChanged();coordinator.terrainApplied(1,token);return true;},abort(){}}),onCheckpoint:async()=>new Promise(resolve=>{releaseCheckpoint=resolve;})});
 try{coordinator.beginRecovery();const checkpoint=recovery.restoreTimelineCheckpoint({sequence:1});await flush();assert.equal(suspended,true);assert.equal(events.includes('resume'),false);releaseCheckpoint();await checkpoint;authority.elapsed++;emit(authority,'ReplayEvent');const boundary={sequence:2,publication:{session:'s',sequence:2,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)]},terrain:[{chunks:[{cx:0,cz:0}],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}}]};const replay=recovery.applyTimelineRecoveryBoundary(boundary);while(!releaseBatch)await flush();assert.equal(stream.status().sequence,1);assert.equal(suspended,true);releaseBatch();await replay;assert.equal(stream.status().sequence,2);assert.equal(suspended,true);assert.equal(events.includes('terrain'),true);assert.equal(events.includes('resume'),false);recovery.finishTimelineRecovery();coordinator.finishRecovery(2);assert.equal(suspended,false);assert.equal(events.filter(item=>item==='resume').length,1);}finally{releaseCheckpoint?.();releaseBatch?.();coordinator.dispose();stream.dispose();terrain.dispose();clock.dispose();}
});

test('a terrain boundary cannot resume grass before its matching state confirmation',async()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});
 try{const token=coordinator.terrainChanged();coordinator.terrainApplied(2,token);assert.equal(suspended,true);coordinator.confirmed(1,new Set(['plants']));await flush();assert.equal(suspended,true,'older state must not authorize a future terrain boundary');assert.equal(resumes,0);coordinator.confirmed(2,new Set(['plants']));assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('terrain arriving after its state confirmation and bootstrap zero resume without another tick',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:0});try{const initialToken=coordinator.terrainChanged();coordinator.terrainApplied(0,initialToken);assert.equal(suspended,false);assert.equal(resumes,1);coordinator.confirmed(3,new Set());const laterToken=coordinator.terrainChanged();assert.equal(suspended,true);coordinator.terrainApplied(3,laterToken);assert.equal(suspended,false);assert.equal(resumes,2);}finally{coordinator.dispose();}
});

test('an older confirmation cannot release a newer terrain boundary',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});try{const first=coordinator.terrainChanged();coordinator.terrainApplied(2,first);const second=coordinator.terrainChanged();coordinator.terrainApplied(3,second);coordinator.confirmed(2,new Set(['structures']));assert.equal(suspended,true);assert.equal(resumes,0);coordinator.confirmed(3,new Set(['plants']));assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('a delayed older terrain notification cannot lower the pending boundary',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});try{const token=coordinator.terrainChanged();coordinator.terrainApplied(3,token);coordinator.terrainApplied(2,token);coordinator.confirmed(2,new Set());assert.equal(suspended,true);assert.equal(resumes,0);coordinator.confirmed(3,new Set());assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('overlapping terrain notifications all settle before publication, regardless of arrival order',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});try{const first=coordinator.terrainChanged(),second=coordinator.terrainChanged();coordinator.terrainApplied(3,second);coordinator.confirmed(3,new Set());assert.equal(suspended,true);assert.equal(resumes,0);coordinator.terrainApplied(2,first);assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('actual biome batch delivers its historical boundary identity only on publication',async()=>{
 const {createWebGpuBiomeProps}=await import('../src/rendering/webgpu-biome-props.js'),pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8')),scene=new THREE.Scene(),events=[],owner=createWebGpuBiomeProps({scene,state:{biome:'sabana',suppressed:[]},biomePack:pack,initialSlots:[],pipelineAdmission:{prepare(){}},coordinator:{offer(){return ()=>{};}},onGroundContactChange:event=>events.push(event),byteLoader:async url=>{const bytes=await readFile(new URL('../public'+url,import.meta.url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},imageLoader:async()=>{throw Error('no assets expected');}});
 try{await owner.ready;const payload={cx:0,cz:0,instances:Array.from({length:20},()=>[])},token=owner.prepareRevision(payload,4,{sequence:7,epoch:'source-epoch'},{publicationEpoch:'render-epoch',publicationRevision:4,publicationOrder:1,suppressed:[]});assert.ok(token);const participant=token.participant();assert.equal(participant.activate(),true);participant.attach();const effects=participant.finalize();assert.deepEqual(events,[]);effects.retire();assert.deepEqual(events,[]);effects.notify();assert.equal(events.length,1);assert.equal(events[0].kind,'replace');assert.equal(events[0].sequence,7);assert.equal(events[0].epoch,'source-epoch');assert.equal(events[0].revision,4);}finally{owner.dispose();}
});

test('an unrelated or duplicate publication cannot settle another pending terrain change',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});try{const a=coordinator.terrainChanged(),b=coordinator.terrainChanged();coordinator.terrainApplied(2,b);coordinator.terrainApplied(2,b);coordinator.terrainApplied(2,{});coordinator.confirmed(2,new Set());assert.equal(suspended,true);assert.equal(resumes,0);coordinator.terrainApplied(2,a);assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('a publication token from before recovery cannot release a new epoch',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1});try{const stale=coordinator.terrainChanged();coordinator.beginRecovery();coordinator.finishRecovery(4);assert.equal(suspended,false);const current=coordinator.terrainChanged();coordinator.terrainApplied(5,stale);coordinator.confirmed(5,new Set());assert.equal(suspended,true);assert.equal(resumes,1);coordinator.terrainApplied(5,current);assert.equal(suspended,false);assert.equal(resumes,2);}finally{coordinator.dispose();}
});

test('historical intermediate occupancy cannot be released by an earlier terrain revision',()=>{
 let suspended=false,resumes=0;const owner={suspend(){suspended=true;},resume(){suspended=false;resumes++;}},coordinator=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:5});try{coordinator.historicalChanged(7,new Set(['plants']));const token=coordinator.terrainChanged();coordinator.terrainApplied(5,token);coordinator.confirmed(6,new Set());assert.equal(suspended,true);assert.equal(resumes,0);coordinator.confirmed(7,new Set());assert.equal(suspended,false);assert.equal(resumes,1);}finally{coordinator.dispose();}
});

test('a republished terrain revision requires its own publication order',()=>{
 const changes=[];const owner={suspend(){changes.push('suspend');},resume(){changes.push('resume');}},barrier=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:5}),matcher=createGrassTerrainMatcher({barrier});
 try{const old={epoch:'e',revision:3,publicationOrder:40},current={...old,publicationOrder:41};matcher.published('0,0',old);matcher.published('0,0',current);barrier.confirmed(6,new Set());assert.equal(matcher.applied('0,0',old,6),false);assert.equal(barrier.status().dirty,true);assert.deepEqual(changes,['suspend']);assert.equal(matcher.applied('0,0',current,6),true);assert.equal(barrier.status().dirty,false);assert.deepEqual(changes,['suspend','resume']);}finally{matcher.clear();barrier.dispose();}
});

test('evicting a chunk retires only its own pending publication',()=>{
 const owner={suspended:false,suspend(){this.suspended=true;},resume(){this.suspended=false;}},barrier=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1}),matcher=createGrassTerrainMatcher({barrier});
 try{const a={epoch:'e',revision:1,publicationOrder:3},b={epoch:'e',revision:2,publicationOrder:4};matcher.published('0,0',a);matcher.published('1,0',b);assert.equal(matcher.forget('0,0'),true);assert.equal(matcher.applied('0,0',a,2),false);barrier.confirmed(2,new Set());assert.equal(owner.suspended,true);assert.equal(matcher.applied('1,0',b,2),true);assert.equal(owner.suspended,false);}finally{matcher.clear();barrier.dispose();}
});

test('eviction of the last pending chunk resumes on the already confirmed boundary',()=>{
 const owner={suspended:false,suspend(){this.suspended=true;},resume(){this.suspended=false;}},barrier=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:1}),matcher=createGrassTerrainMatcher({barrier});
 try{matcher.published('0,0',{epoch:'e',revision:1,publicationOrder:3});barrier.confirmed(2,new Set());assert.equal(owner.suspended,true);assert.equal(matcher.forget('0,0'),true);assert.equal(owner.suspended,false);assert.equal(barrier.status().dirty,false);}finally{matcher.clear();barrier.dispose();}
});

test('an older published generation cannot displace a newer pending terrain revision',()=>{
 const owner={suspended:false,suspend(){this.suspended=true;},resume(){this.suspended=false;}},barrier=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:5}),matcher=createGrassTerrainMatcher({barrier});
 try{const old={epoch:'e',revision:3,publicationOrder:40},current={...old,publicationOrder:41};matcher.published('0,0',current);assert.equal(matcher.published('0,0',old),null);barrier.confirmed(6,new Set());assert.equal(matcher.applied('0,0',old,6),false);assert.equal(owner.suspended,true);assert.equal(matcher.applied('0,0',current,6),true);assert.equal(owner.suspended,false);}finally{matcher.clear();barrier.dispose();}
});

test('cancelling a stale chunk during replay cannot resume grass before recovery finishes',()=>{
 let resumes=0;const owner={suspend(){},resume(){resumes++;}},barrier=createGrassTimelineCoordinator({owner,initiallySuspended:false,initialSequence:2}),matcher=createGrassTerrainMatcher({barrier});
 try{matcher.published('0,0',{epoch:'e',revision:3,publicationOrder:40});barrier.beginRecovery();matcher.forget('0,0');barrier.confirmed(3,new Set());assert.equal(resumes,0);assert.equal(barrier.status().recovering,true);barrier.finishRecovery(3);assert.equal(resumes,1);}finally{matcher.clear();barrier.dispose();}
});
