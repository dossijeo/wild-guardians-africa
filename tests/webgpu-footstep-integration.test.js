import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createWebGpuAgricultureVfx} from '../src/rendering/webgpu-agriculture-vfx.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';

test('actual remote proxy never fences a palette inside the open drawing transaction',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
 globalThis.fetch=async()=>({ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])});globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){}});
 const messages=[],errors=[],port={postMessage(message){messages.push(message);if(message.requestId)queueMicrotask(()=>port.onmessage({data:{type:'reply',requestId:message.requestId,result:null}}));if(message.type==='frame')queueMicrotask(()=>port.onmessage({data:{type:'presented',sequence:message.packet.sequence}}));}},remote=createRemoteWebGpuClient({port,capabilities:{width:16,height:16,format:'rgba8unorm'},onError:error=>errors.push(error)});
 const renderer={backend:{isWebGPUBackend:true,device:remote.device},initTexture(texture){const image=texture.image,resource=remote.device.createTexture({size:[image.width,image.height,1],format:'rgba32float',usage:6});remote.device.queue.writeTexture({texture:resource},image.data??new Uint8Array(4),{bytesPerRow:image.width*16},[image.width,image.height,1]);}},worker={id:'w',profile:'youngMale',status:'walking',walkPhase:0,x:0,z:0,heading:0},state={time:0,elapsed:0,spells:[],events:[],structures:[],plants:[],tasks:[],workers:[worker]},floor={},clock=createConfirmedPresentationClock(0),scene=new THREE.Scene();
 const vfx=createWebGpuAgricultureVfx({scene,state,residency:{get:()=>floor,getVisible:()=>floor,surface:()=>0,revisionAt:(cx,cz)=>({cx,cz,epoch:'test',revision:1})},includeLocomotion:true,confirmedClock:clock,renderer,onError:error=>errors.push(error)});
 try{await vfx.prepareAssets();vfx.sync();worker.x=.1;worker.walkPhase=4;state.elapsed=.1;clock.commit(.1);vfx.sync();
  const buffer=remote.device.createBuffer({size:4,usage:72});remote.beginFrame();remote.device.queue.writeBuffer(buffer,0,new Float32Array([1]));
  await assert.rejects(remote.device.queue.onSubmittedWorkDone(),/Cannot fence uncommitted remote frame/);
  vfx.prepare(new THREE.PerspectiveCamera());const receipt=remote.endFrame();await receipt;await new Promise(resolve=>setImmediate(resolve));vfx.prepare(new THREE.PerspectiveCamera());
  assert.deepEqual(errors,[]);assert.ok(vfx.status().footstepResources.gpu>0);
  const frame=messages.findIndex(message=>message.type==='frame');assert.ok(messages.slice(frame+1).some(message=>message.type==='fence'));
 }finally{vfx.dispose();clock.dispose();remote.dispose();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('reused footstep slots upload a fresh palette and publish its binding only after its fence',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
 globalThis.fetch=async()=>({ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])});globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){}});
 let controlled=false;const uploads=new Set(),fences=[],turn=()=>new Promise(resolve=>setImmediate(resolve));
 const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>controlled?new Promise(resolve=>fences.push(resolve)):Promise.resolve()}}},initTexture(texture){assert.equal(uploads.has(texture),false,'a previously uploaded palette must never be overwritten');uploads.add(texture);}};
 const worker={id:'w',profile:'youngMale',status:'walking',walkPhase:0,x:0,z:0,heading:0},state={time:0,elapsed:0,spells:[],events:[],structures:[],plants:[],tasks:[],workers:[worker]},floor={},scene=new THREE.Scene(),clock=createConfirmedPresentationClock(0),camera=new THREE.PerspectiveCamera();
 const vfx=createWebGpuAgricultureVfx({scene,state,residency:{get:()=>floor,getVisible:()=>floor,surface:()=>0,revisionAt:(cx,cz)=>({cx,cz,epoch:'test',revision:1})},includeLocomotion:true,confirmedClock:clock,renderer});
 const meshes=()=>{const found=[];scene.traverse(object=>{if(object._wgFootstepSamples)found.push(object);});return found;};
 try{await vfx.prepareAssets();vfx.sync();controlled=true;worker.x=.1;worker.walkPhase=4;state.elapsed=.1;clock.commit(.1);vfx.sync();const initial=meshes().map(mesh=>mesh._wgFootstepSamples);vfx.prepare(camera);await turn();assert.ok(fences.length);assert.deepEqual(meshes().map(mesh=>mesh._wgFootstepSamples),initial,'pending generations are not published');
  fences.splice(0).forEach(resolve=>resolve());await turn();vfx.prepare(camera);const active=new Set(meshes().map(mesh=>mesh._wgFootstepSamples)),pixels=new Map([...active].map(texture=>[texture,texture.image.data.slice()]));assert.ok(vfx.status().footstepResources.gpu>0);
  state.elapsed=3;clock.commit(3);worker.walkPhase=2*Math.PI;vfx.sync();worker.x=.2;worker.walkPhase=2*Math.PI+4;state.elapsed=3.1;clock.commit(3.1);vfx.sync();vfx.prepare(camera);await turn();assert.ok(vfx.status().footstepResources.reused>0);assert.ok(fences.length);for(const mesh of meshes())assert.ok(active.has(mesh._wgFootstepSamples),'old binding survives until new upload completes');for(const [texture,data] of pixels)assert.deepEqual(texture.image.data,data,'retained generation stays immutable');
  fences.splice(0).forEach(resolve=>resolve());await turn();vfx.prepare(camera);assert.ok(meshes().some(mesh=>!active.has(mesh._wgFootstepSamples)));
 }finally{fences.splice(0).forEach(resolve=>resolve());await turn();vfx.dispose();clock.dispose();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('real raid footsteps publish complete GPU lifetimes and stop CPU updates inside a certified interval',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
 globalThis.fetch=async()=>({ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])});globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){}});
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),state=JSON.parse(authority.execute({kind:'snapshot',sequence:1}).snapshot),clock=createConfirmedPresentationClock(state.elapsed),floor=new THREE.Mesh(new THREE.PlaneGeometry(48,48),new THREE.MeshBasicMaterial()),camera=new THREE.PerspectiveCamera(),scene=new THREE.Scene(),support={valid:()=>true};
 let terrain=floor,terrainRevision=1;
 const vfx=createWebGpuAgricultureVfx({scene,state,residency:{get:()=>terrain,getVisible:()=>terrain,surface:()=>0,revisionAt:(cx,cz)=>({cx,cz,epoch:'test',revision:terrainRevision})},includeLocomotion:true,locomotionWater:()=>({available:true,inside:false}),confirmedClock:clock});let certified=0,births=0;
 try{
  await vfx.prepareAssets();vfx.sync();
  for(let sequence=2;sequence<22;sequence++){
   const publication=authority.execute({kind:'advance',sequence,seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true}),next=JSON.parse(publication.snapshot),preview={sequence,start:state.elapsed,end:next.elapsed,trace:publication.worldMotionTrace};
   const prepared=vfx.prepareHistoricalMotion(preview,support);
   if(prepared.ok&&prepared.footsteps){assert.equal(prepared.remoteAutonomous,true);assert.equal(vfx.startHistoricalMotion(preview,support,prepared.token),true);certified++;
    const before=vfx.status().active.map(item=>item.time),textures=[];scene.traverse(object=>{if(object._wgFootstepSamples)textures.push([object._wgFootstepSamples,object._wgFootstepSamples.version,object.geometry.getAttribute('iPos')?.data.version??null]);});
    clock.commit((preview.start+preview.end)/2);assert.equal(vfx.prepare(camera),true);assert.deepEqual(vfx.status().active.map(item=>item.time),before,'no native simulation per render');
    for(const [texture,version] of textures)assert.equal(texture.version,version,'no sampled texture upload per render');
    clock.commit(preview.end);assert.equal(vfx.prepare(camera),true);assert.equal(vfx.finishHistoricalMotion(preview),true);births+=vfx.status().footstepResources.gpu;
   }else{if(prepared.ok){assert.equal(vfx.startHistoricalMotion(preview,support,prepared.token),true);clock.commit(preview.end);assert.equal(vfx.finishHistoricalMotion(preview),true);}else clock.commit(preview.end);}
   Object.assign(state,next);vfx.sync();vfx.prepare(camera);
  }
  assert.ok(certified>0);assert.ok(births>0);
  const before=JSON.stringify(state);assert.ok(vfx.status().footstepResources.gpu>0,'fresh revision descriptor objects do not invalidate equivalent terrain');terrainRevision++;vfx.prepare(camera);
  assert.equal(vfx.status().footstepResources.gpu,0,'a semantic revision change on the same mesh revokes sampled playback and restores original CPU presentation');assert.equal(JSON.stringify(state),before);
 }finally{vfx.dispose();clock.dispose();floor.geometry.dispose();floor.material.dispose();authority.dispose();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});

test('future footsteps remain hidden while admission is pending and become eligible after asynchronous compilation',async()=>{
 const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,catalogue=JSON.parse(readFileSync('public/content/vfx.json'));
 globalThis.fetch=async()=>({ok:true,json:async()=>catalogue,blob:async()=>new Blob(['x'])});globalThis.createImageBitmap=async()=>({width:4096,height:2048,close(){}});
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),state=JSON.parse(authority.execute({kind:'snapshot',sequence:1}).snapshot),clock=createConfirmedPresentationClock(state.elapsed),scene=new THREE.Scene(),floor={},support={valid:()=>true},compiles=[],turn=()=>new Promise(resolve=>setImmediate(resolve));
 const admission={prepare:object=>new Promise(resolve=>compiles.push({object,resolve})),deferCompilations:release=>release()};
 const vfx=createWebGpuAgricultureVfx({scene,state,residency:{get:()=>floor,getVisible:()=>floor,surface:()=>0,revisionAt:(cx,cz)=>({cx,cz,epoch:'stable',revision:1})},includeLocomotion:true,locomotionWater:()=>({available:true,inside:false}),confirmedClock:clock,pipelineAdmission:admission});
 try{await vfx.prepareAssets();vfx.sync();let preview,prepared;
  for(let sequence=2;sequence<62;sequence++){
   const publication=authority.execute({kind:'advance',sequence,seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true}),next=JSON.parse(publication.snapshot);preview={sequence,start:state.elapsed,end:next.elapsed,trace:publication.worldMotionTrace};prepared=vfx.prepareHistoricalMotion(preview,support);
   if(vfx.status().footstepResources.pending)break;
   if(prepared.ok){assert.equal(vfx.startHistoricalMotion(preview,support,prepared.token),true);clock.commit(preview.end);assert.equal(vfx.finishHistoricalMotion(preview),true);}else clock.commit(preview.end);Object.assign(state,next);vfx.sync();
  }
  assert.ok(vfx.status().footstepResources.pending>0);assert.equal(prepared.remoteAutonomous,false);await turn();assert.ok(compiles.length>0);
  const future=scene.children.filter(root=>root.children.some(object=>object._wgFootstepBirth>state.elapsed));assert.ok(future.length>0);assert.ok(future.every(root=>!root.visible),'pending future effects cannot enter the scene');
  for(const item of compiles.splice(0))item.resolve();await turn();
  prepared=vfx.prepareHistoricalMotion(preview,support);assert.equal(prepared.remoteAutonomous,true,'ready hidden meshes are offered again to the admission publisher');assert.ok(future.every(root=>!root.visible),'admission does not itself start a future effect');
  assert.equal(vfx.startHistoricalMotion(preview,support,prepared.token),true);assert.ok(future.every(root=>root.visible),'future draw commands are present before birth; shader time controls visibility');vfx.cancelHistoricalMotion();
 }finally{for(const item of compiles)item.resolve();await turn();vfx.dispose();clock.dispose();authority.dispose();globalThis.fetch=oldFetch;globalThis.createImageBitmap=oldBitmap;}
});
