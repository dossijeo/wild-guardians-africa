import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {actorAsset} from './helpers/actor-geometry.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
import {createBakedWorkerWalkTexture} from '../src/rendering/webgpu-baked-walk.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

async function fixture(){
 const f=createNativeRouteExecutionFixture(),scene=new THREE.Scene(),ground=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material:ground}),chunks=[];f.state.workers=f.state.workers.slice(0,1);const entity=f.state.workers[0];entity.running=false;entity.walkPhase=entity.runPhase=entity.carryPhase=0;
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'native-roster');chunks.push({cx:x,cz:z,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency}),manifest={epoch:'native-roster',chunks},handle=f.worker(1,f.point(-6,0),f.point(6,0)),packet=f.bridge.captureNativeRoutePresentation(handle),support=terrain.prepareNativeRoute(packet,{terrainManifest:manifest}),profile=entity.profile,meta=JSON.parse(await readFile(`public/content/gpu-worker-walk/${profile}/walking.json`)),bytes=await readFile(`public/content/gpu-worker-walk/${profile}/walking.bin`),bake=createBakedWorkerWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset(meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],retired=[],errors=[],registry=createWebGpuResourceRegistry();let hold=false,pending=null,acquires=0,releases=0,pickTime=packet.startTime;
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:material=>new MeshStandardNodeMaterial({color:material.color})}},admission={prepare:async()=>{},deferRelease(_root,release){retired.push(release);},prepareAndPublish(root,options,publish){if(hold&&options.materialAlternatives){return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Cancelled','AbortError'));options.signal?.addEventListener('abort',abort,{once:true});pending={root,options,finish(){options.signal?.removeEventListener('abort',abort);try{publish();resolve();}catch(error){reject(error);}}};});}publish();return Promise.resolve();}},bank={async acquire(){acquires++;const model=clone(asset.scene);return {model,clips:prepareWorkerClips(asset.animations),library,release(){releases++;const skeletons=new Set();model.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}};},dispose(){}},roster=createWebGpuWorkerRoster({scene,residency,state:f.state,renderer,assetBank:bank,bakedWalkBank:{get:async()=>bake},pipelineAdmission:admission,resourceRegistry:registry,onError:error=>errors.push(error),onBakedWalkError:(_profile,error)=>errors.push(error)});
 roster.sync();
 return {...f,scene,entity,residency,terrain,manifest,handle,packet,support,roster,registry,retired,errors,renderer,get acquires(){return acquires;},get releases(){return releases;},get pending(){return pending;},set hold(value){hold=value;},set pickTime(value){pickTime=value;},getPickTime:()=>pickTime,flush(){for(const release of retired.splice(0))release();},async start(){return roster.prepareNativeRoute(entity.id,support,{getPickTime:()=>pickTime});},next(){assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.4).status,'advanced');const origin=f.bridge.sampleNativeRoute(handle,10.4);const nextHandle=f.worker(1,origin,f.point(-6,0));const nextPacket=f.bridge.captureNativeRoutePresentation(nextHandle),nextSupport=terrain.prepareNativeRoute(nextPacket,{terrainManifest:manifest});assert(nextSupport);return {handle:nextHandle,packet:nextPacket,support:nextSupport};},close(){roster.dispose();for(const release of retired.splice(0))release();terrain.dispose();residency.dispose();ground.dispose();bake.dispose();registry.dispose();f.session.dispose();}};
}
function geometry(root){const result=[];root.traverse(node=>{if(node.isMesh&&!node.userData.wgCpuPickProxy)result.push({mesh:node,geometry:node.geometry,index:node.geometry.index,position:node.geometry.attributes.position});});return result;}
function sameGeometry(before){for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.geometry.index,item.index);assert.equal(item.geometry.attributes.position,item.position);}}

test('ordinary worker roster prepares a native graph on its existing rig and reuses an unchanged assignment',async()=>{
 const f=await fixture();try{const first=await f.start(),actor=f.roster.get(f.entity.id),root=actor.root,meshes=geometry(root),materials=meshes.map(item=>item.mesh.material),resources=f.registry.status().owned.length,anchor=root.position.clone();assert.equal(first.reused,undefined);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);f.entity.x+=.1;f.entity.walkPhase+=1;f.roster.sync();assert(root.position.equals(anchor));const again=await f.start();assert.equal(again.reused,true);assert.equal(f.registry.status().owned.length,resources);assert.equal(f.roster.get(f.entity.id),actor);sameGeometry(meshes);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('a native suffix replaces materials atomically while retaining rig, meshes, geometry and the original CPU anchor',async()=>{
 const f=await fixture();try{await f.start();const actor=f.roster.get(f.entity.id),root=actor.root,anchor=root.position.clone(),meshes=geometry(root),materials=meshes.map(item=>item.mesh.material),old=await f.start();f.pickTime=10.2;const restore=actor.preparePick();restore();const next=f.next();f.pickTime=next.packet.startTime+.1;f.hold=true;const preparing=f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});while(!f.pending)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.roster.status().nativePreparing,1);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert(root.position.equals(anchor));assert(f.pending.options.materialAlternatives.length);f.pending.finish();await preparing;assert.equal(f.roster.status().nativePreparing,0);assert.equal(f.roster.get(f.entity.id),actor);assert(root.position.equals(anchor));sameGeometry(meshes);assert.notDeepEqual(meshes.map(item=>item.mesh.material),materials);assert.equal(f.roster.releaseNativeRoute(f.entity.id,old.nativeRoute),false);assert.equal(f.acquires,1);const restoreNext=actor.preparePick();restoreNext();assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('cancelled native preparation retains the previous actor and retires only the unused alternatives after its fence',async()=>{
 const f=await fixture();try{await f.start();const actor=f.roster.get(f.entity.id),meshes=geometry(actor.root),materials=meshes.map(item=>item.mesh.material),next=f.next(),controller=new AbortController();f.hold=true;const preparing=f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime,signal:controller.signal});while(!f.pending)await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(preparing,{name:'AbortError'});assert.equal(f.roster.status().native,1);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert(f.retired.length>0);f.flush();assert.deepEqual(meshes.map(item=>item.mesh.material),materials);sameGeometry(meshes);}finally{f.close();}
});

test('root changes during preparation reject publication and preserve the old material owner',async()=>{
 const f=await fixture();try{await f.start();const actor=f.roster.get(f.entity.id),meshes=geometry(actor.root),materials=meshes.map(item=>item.mesh.material),next=f.next();f.hold=true;const preparing=f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});while(!f.pending)await new Promise(resolve=>setImmediate(resolve));actor.root.rotation.y+=.1;f.pending.finish();await assert.rejects(preparing,{name:'AbortError'});assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert.equal(f.roster.status().native,1);}finally{f.close();}
});

test('native release reconciles the confirmed endpoint once and keeps retired resources alive until the existing fence',async()=>{
 const f=await fixture();try{const admitted=await f.start(),actor=f.roster.get(f.entity.id),root=actor.root,start=root.position.clone(),owned=f.registry.status().owned.length;f.entity.x+=1;f.roster.sync();assert(root.position.equals(start));assert.equal(f.roster.releaseNativeRoute(f.entity.id,admitted.nativeRoute),true);assert.equal(root.position.x,f.entity.x);assert.equal(f.roster.status().native,0);assert.equal(f.registry.status().owned.length,owned);f.flush();assert(f.registry.status().owned.length<owned);assert.equal(f.roster.releaseNativeRoute(f.entity.id,admitted.nativeRoute),false);}finally{f.close();}
});

test('replacement shader bindings contain the new native clock and exclude CPU picking proxies',async()=>{
 const f=await fixture();try{await f.start();const actor=f.roster.get(f.entity.id);f.pickTime=10.2;const restore=actor.preparePick();restore();const next=f.next();f.pickTime=next.packet.startTime+.1;await f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});let mesh;actor.root.traverse(node=>{if(node.isMesh&&node.visible&&!mesh)mesh=node;});assert(mesh);const gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new THREE.PerspectiveCamera();builder.build();const refs=[];for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const uniform of binding.uniforms??[]){const value=uniform.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(value?.nativeRoute)refs.push(value.nativeRoute);}assert(refs.length>0);for(const ref of refs)assert.deepEqual(ref,next.packet.nativeRoute);assert.doesNotMatch(builder.vertexShader,/NaN/);}finally{f.close();}
});


test('reuse cannot bypass cancellation, caller validity or immutable assignment data',async()=>{
 const f=await fixture();try{await f.start();const controller=new AbortController();controller.abort();
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,f.support,{getPickTime:f.getPickTime,signal:controller.signal}),/unavailable/);
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,f.support,{getPickTime:f.getPickTime,isCurrent:()=>false}),/unavailable/);
 const rows=f.packet.rows.slice();rows[4]+=.1;const changed={...f.support,presentation:{...f.packet,rows}};
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,changed,{getPickTime:f.getPickTime}),/without a new identity/);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);
 }finally{f.close();}
});

test('unprepared running or held intervals are rejected before loading graphics',async()=>{
 const f=await fixture();try{for(const column of [14,15]){const rows=f.packet.rows.slice();rows[column]=column===14?1:0;const unsupported={...f.support,presentation:{...f.packet,rows}};
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,unsupported,{getPickTime:f.getPickTime}),/clip transition not prepared/);assert.equal(f.roster.status().native,0);}
 }finally{f.close();}
});
