import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Scene,Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {createConfirmedMotionFeed} from '../src/rendering/confirmed-motion-feed.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createActorTerrainSampler} from '../src/rendering/webgpu-actor-terrain.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
import {historicalInactiveActor} from '../src/simulation/historical-inactive-actors.js';

// Real saved raid, WASM authority, terrain, receiver, rosters and GPU buffers.
// Only model loading/admission is substituted. This is not a WebGPU draw test.
test('native raid publications reach the autonomous consumer without changing simulation',async()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];
 for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const scene=new Scene(),terrainMaterial=new MeshBasicMaterial(),geometry=new BoxGeometry(),material=new MeshBasicNodeMaterial(),chunks=new Map(),epoch='a6-native';
 const residency=createWebGpuTerrainResidency({scene,material:terrainMaterial,waterMaterial:terrainMaterial});
 const observed=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true,onTerrainChunk:payload=>{const key=`${payload.cx},${payload.cz}`,revision=(chunks.get(key)?.revision??0)+1;chunks.set(key,{cx:payload.cx,cz:payload.cz,revision});residency.replace(payload,revision,epoch);}}),baseline=createSimulationAuthority(module,snapshot,keys);
 const initial=observed.execute({kind:'snapshot',sequence:1});assert.equal(initial.snapshot,baseline.execute({kind:'snapshot',sequence:1}).snapshot);
 const state=deserializeConfirmedState(initial.snapshot),sampleTerrain=createActorTerrainSampler(residency),roots=new Map();let now=0,updates=0;
 const clock=createConfirmedHistoricalClock({initialElapsed:state.elapsed,initialSequence:1,now:()=>now}),renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:m=>m.clone()}},admission={prepare:async()=>{}};
 function rig({actorId,getEntity}){const root=new Group();root.add(new Mesh(geometry,material));scene.add(root);roots.set(actorId,root);const actor={root,update(){updates++;const e=getEntity();root.position.set(e.x,sampleTerrain(e.x,e.z)+(e.species?0:.025),e.z);root.rotation.y=e.path?.length?Math.atan2(e.path[0].x-e.x,e.path[0].z-e.z):e.heading??0;root.visible=true;},isBakedWalking:()=>false,isPhysical:()=>false,installBakedWalk:async()=>false,dispose(){root.removeFromParent();}};actor.update();return actor;}
 const animals=createWebGpuAnimalRoster({scene,residency,state,renderer,assetBank:{tick(){},dispose(){}},pipelineAdmission:admission,bakedWalkBank:{get:async species=>({meta:{species}})},experimentalHistoricalMotion:{clock,actorIds:state.raid.animals.map(a=>a.id)},createAnimal:rig}),workers=createWebGpuWorkerRoster({scene,residency,state,renderer,assetBank:{dispose(){}},pipelineAdmission:admission,bakedWalkBank:{get:async()=>({})},experimentalHistoricalMotion:{clock,actorIds:state.workers.map(a=>a.id)},createWorker:rig});
 const terrainSupport=createConfirmedTerrainSupport({residency}),feed=createConfirmedMotionFeed({prepareTerrainSupport:p=>terrainSupport.prepare(p,{actorIds:p.trace.actors.filter(a=>!historicalInactiveActor(a,p.trace.actorTickStates,p.start,p.end)).map(a=>a.actorId)})}),errors=[],acks=[],port={postMessage:m=>acks.push(m),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'a6',state,initialSequence:1,presentationClock:clock,timeline:{manualBoundaries:true,maxPublications:4,maxBytes:50000000},terrain:{ready:()=>true,confirm(){},matchesManifest:m=>residency.matchesManifest(m)},onError:e=>errors.push(e),onConfirmed(){animals.setHistoricalActors(state.raid.animals.map(a=>a.id));workers.setHistoricalActors(state.workers.map(a=>a.id));animals.sync();workers.sync();}});
 const group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:()=>feed.getPreviewSupport(),inputPolicy:'ordered-boundary'}),pump=createConfirmedTimelinePump({stream,onPreview:(p,b)=>feed.offerPreview(p,b),historicalPlayback:{clock,now:()=>now,certify:group.certify,canStart:group.canStart,start:(p)=>{const started=group.start(p);assert.equal(started,true,'group start at '+p.sequence);return started;},finish:group.finish,abort:group.abort,isCurrent:group.isCurrent}});
 try{animals.sync();workers.sync();await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));assert.equal(animals.status().ready,8);let played=0;
  for(let sequence=2;sequence<=9;sequence++){
   const command={kind:'advance',sequence,seconds:.025,steps:2,nightFastForward:false,captureClockSegments:true},a=baseline.execute(command),b=observed.execute(command);
   assert.equal(b.snapshot,a.snapshot);assert.deepEqual(b.events,a.events);assert.ok(b.worldMotionTrace.separationEvidence);
   b.worldMotionTrace.terrainManifest={epoch,chunks:[...chunks.values()]};port.onmessage({data:{kind:'publication',session:'a6',publication:{...b,session:'a6'}}});assert.deepEqual(errors,[]);
   const preview=stream.previewNextMotionBoundary();assert.deepEqual(preview.reasons,['visual-time-and-support-unverified']);feed.offerPreview(preview,stream.status());const support=feed.getPreviewSupport();assert.ok(support,'native terrain support');const aReady=animals.prepareHistoricalMotion(preview,support),wReady=workers.prepareHistoricalMotion(preview,support);assert.equal(aReady.ok,true,JSON.stringify(aReady));assert.equal(wReady.ok,true,JSON.stringify(wReady));
   assert.ok(group.certify(structuredClone(preview),stream.status()),'group certificate');
   const before=[...roots.values()].map(root=>root.position.toArray()),count=updates;
   assert.equal(pump.advance(),0,'the real interval must install instead of falling back');assert.equal(pump.status().historicalPending,sequence);now+=25;assert.equal(pump.advance(),0);assert.equal(updates,count);assert.deepEqual([...roots.values()].map(root=>root.position.toArray()),before);
   now+=26;assert.equal(pump.advance(1),1);assert.equal(stream.status().sequence,sequence);assert.equal(clock.status().active,null);assert.equal(acks.at(-1).kind,'publicationAck');played++;
  }
  assert.equal(played,8);assert.deepEqual(errors,[]);
 }finally{pump.dispose();stream.dispose();feed.dispose();animals.dispose();workers.dispose();terrainSupport.dispose();clock.dispose();observed.dispose();baseline.dispose();residency.dispose();geometry.dispose();material.dispose();terrainMaterial.dispose();}
});
