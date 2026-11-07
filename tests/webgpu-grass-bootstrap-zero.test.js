import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readFileSync} from 'node:fs';
import {promisify} from 'node:util';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {uniform,float} from 'three/tsl';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {estimateRetainedBytes} from '../src/simulation/retained-size.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {createWebGpuGrassOwner} from '../src/rendering/webgpu-grass-owner.js';
import {createGrassSurfaceTimeline} from '../src/rendering/webgpu-grass-timeline.js';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

const load=promisify(readFile);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('sequence zero bootstrap publishes terrain and grass without a later state tick',async()=>{
 const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),world=createSpatialWorld(wasm);
 world.generate(712,0,0,'savanna');const payload=world.chunkPayload();payload.instances=Array.from({length:20},()=>[]);
 const state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/manglares-123-d10-raid-state.json.gz',import.meta.url))).toString());
 state.biome='sabana';state.structures=[];state.villages=[];state.plants=[];state.suppressed=[];
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),material=new THREE.MeshBasicMaterial(),atlas=new THREE.Texture(),errors=[],events=[],jobs=[];
 const admission={async prepareManyAndPublish(){throw Error('unexpected non-batch publication');},async prepareTicket(){return {valid:()=>true,validAfterAttach:()=>true};},prepare(){},prepareAndPublish(candidate,{signal},publish){return new Promise((resolve,reject)=>jobs.push({candidate,signal,finish(){try{publish();resolve();}catch(error){reject(error);}}}));},deferRelease(_object,release){release();},deferCompilations(release){release();}};
 const coordinator=createChunkPublicationCoordinator({admission});let bridge;
 const residency=createWebGpuTerrainResidency({scene,material,waterMaterial:material,pipelineAdmission:admission,coordinator,onPublished(key,identity){events.push('terrain-published');bridge.published(key,identity);}});
 const pack=JSON.parse(await load(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const biome=createWebGpuBiomeProps({scene,state,biomePack:pack,initialSlots:[],pipelineAdmission:admission,coordinator,onGroundContactChange:event=>{events.push('biome');bridge.biome(event);},byteLoader:async url=>{const b=await load(new URL('../public'+url,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);},imageLoader:async()=>({close(){}})});
 const modules=JSON.parse(await load(new URL('../public/assets/visual-lab/continuous-grass/modules.json',import.meta.url),'utf8'));
 const ground={acquireGrassResources:()=>({atlas,seed:uniform(new THREE.Vector2()),scale:uniform(.1),night:uniform(0),nightLight:uniform(1),exposure:uniform(1),sunDirection:uniform(new THREE.Vector3(0,1,0)),shadowVisibility:float(1),release(){}})};
 const owner=createWebGpuGrassOwner({scene,camera,residency,biome:'sabana',state,ground,clock:uniform(0),admission,quality:'baja',requireTerrainRevision:true,fetchImpl:async()=>({ok:true,json:async()=>structuredClone(modules)}),onError:error=>errors.push(error.message)});
 bridge=createGrassSurfaceTimeline({owner,residency,initialSequence:0,onError:error=>errors.push(error.message)});owner.syncState();
 const port={postMessage(){},start(){},close(){}},streamPort={postMessage(){},start(){},close(){}},clock=createConfirmedPresentationClock(state.elapsed);let stream;
 const receiver=createConfirmedTerrainReceiver({port,session:'s',residency,confirmedElapsed:state.elapsed,retainRevisions:true,autoBootstrap:true,validateRevision:(p,r,e)=>residency.validateRevision(p,r,e),onError:error=>errors.push(error.message),onApplied:(p,r,m)=>{events.push('applied');bridge.applied(p,r,m);},onReady:()=>stream?.terrainReady(),prepareGraphicalBatch:(messages,{signal})=>prepareWebGpuTemporalTerrain(messages,{signal,scene,residency,biome,coordinator,publicationEpoch:epoch=>'visual:'+epoch,publicationOrder:()=>1,validateInstances(){},suppressed:[],onPreparedIdentity:bridge.prepared,onDiscardIdentity:bridge.discarded})});
 stream=createConfirmedPresentationStream({port:streamPort,session:'s',state,terrain:receiver,presentationClock:clock,initialSequence:0,timeline:{manualBoundaries:true,maxPublications:2,maxBytes:50000000},onConfirmed:(message,keys)=>bridge.confirmed(message.sequence,keys),onError:error=>errors.push(error.message)});
 try{
  await owner.ready;
  const send=data=>port.onmessage({data}),base={session:'s',epoch:'e',sequence:0};
  send({kind:'terrainHello',session:'s',epoch:'e',version:1});
  send({...base,kind:'terrainBatchBegin',id:1,count:1,bytes:estimateRetainedBytes(payload)});
  send({...base,kind:'terrain',id:2,revision:1,payload});send({...base,kind:'terrainBatchEnd',id:3});
  for(let i=0;i<1000&&!events.includes('applied')&&!errors.length;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.deepEqual(errors,[]);assert.equal(stream.status().sequence,0);assert.equal(receiver.status().confirmedSequence,0);
  assert.deepEqual(events,['terrain-published','biome','applied']);assert.equal(bridge.status().dirty,false);assert.equal(owner.status().suspended,false);
  assert.equal(jobs.length,1,'grass is prepared without requiring a subsequent state publication');jobs[0].finish();await flush();assert.equal(owner.status().visible,1);
 }finally{stream.dispose();receiver.dispose();clock.dispose();bridge.dispose();owner.dispose();biome.dispose();residency.dispose();coordinator.dispose();material.dispose();atlas.dispose();}
});
