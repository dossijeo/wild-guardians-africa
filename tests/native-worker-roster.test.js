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
import {createBakedWorkerWalkTexture,createBakedWorkerRunTexture,createBakedWorkerCarryTexture} from '../src/rendering/webgpu-baked-walk.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

async function fixture({nativeMotion={},withRunning=false,initialRunning=false,profile:requestedProfile=null,carrying=false,withCarry=false}={}){
 const f=createNativeRouteExecutionFixture(),scene=new THREE.Scene(),ground=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material:ground}),chunks=[];f.state.workers=f.state.workers.slice(0,1);const entity=f.state.workers[0];if(requestedProfile){entity.profile=requestedProfile;f.bridge.resetFromState(f.state);}entity.running=initialRunning;entity.walkPhase=entity.runPhase=entity.carryPhase=0;if(carrying){entity.status='carrying';entity.crateId='crate-900020';f.state.crates=[{id:entity.crateId,carrierId:entity.id,delivered:false}];}
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'native-roster');chunks.push({cx:x,cz:z,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency}),manifest={epoch:'native-roster',chunks},handle=f.worker(1,f.point(-6,0),f.point(6,0),{...nativeMotion,...(carrying?{carrying:true}:{})}),packet=f.bridge.captureNativeRoutePresentation(handle),support=terrain.prepareNativeRoute(packet,{terrainManifest:manifest}),profile=entity.profile,meta=JSON.parse(await readFile(`public/content/gpu-worker-walk/${profile}/walking.json`)),bytes=await readFile(`public/content/gpu-worker-walk/${profile}/walking.bin`),bake=createBakedWorkerWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset(meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],retired=[],errors=[],registry=createWebGpuResourceRegistry();let hold=false,pending=null,acquires=0,releases=0,pickTime=packet.startTime;
 const runMeta=withRunning?JSON.parse(await readFile(`public/content/gpu-worker-run/${profile}/walking.json`)):null,runBytes=withRunning?await readFile(`public/content/gpu-worker-run/${profile}/walking.bin`):null,runBake=withRunning?createBakedWorkerRunTexture(runMeta,runBytes.buffer.slice(runBytes.byteOffset,runBytes.byteOffset+runBytes.byteLength)):null;
 const carryMeta=withCarry?JSON.parse(await readFile(`public/content/gpu-worker-carry/${profile}/walking.json`)):null,carryBytes=withCarry?await readFile(`public/content/gpu-worker-carry/${profile}/walking.bin`):null,carryBake=withCarry?createBakedWorkerCarryTexture(carryMeta,carryBytes.buffer.slice(carryBytes.byteOffset,carryBytes.byteOffset+carryBytes.byteLength)):null;
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:material=>new MeshStandardNodeMaterial({color:material.color})}},admission={prepare:async()=>{},deferRelease(_root,release){retired.push(release);},prepareAndPublish(root,options,publish){if(hold&&options.materialAlternatives){return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Cancelled','AbortError'));options.signal?.addEventListener('abort',abort,{once:true});pending={root,options,finish(){options.signal?.removeEventListener('abort',abort);try{publish();resolve();}catch(error){reject(error);}}};});}publish();return Promise.resolve();}},bank={async acquire(){acquires++;const model=clone(asset.scene);return {model,clips:prepareWorkerClips(asset.animations),library,release(){releases++;const skeletons=new Set();model.traverse(node=>{if(node.isSkinnedMesh)skeletons.add(node.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}};},dispose(){}},roster=createWebGpuWorkerRoster({scene,residency,state:f.state,renderer,assetBank:bank,bakedWalkBank:{get:async()=>bake},bakedRunBank:runBake?{get:async()=>runBake}:null,bakedCarryBank:carryBake?{get:async()=>carryBake}:null,pipelineAdmission:admission,resourceRegistry:registry,onError:error=>errors.push(error),onBakedWalkError:(_profile,error)=>errors.push(error)});
 roster.sync();
 return {...f,scene,runBake,bake,carryBake,entity,residency,terrain,manifest,handle,packet,support,roster,registry,retired,errors,renderer,get acquires(){return acquires;},get releases(){return releases;},get pending(){return pending;},set hold(value){hold=value;},set pickTime(value){pickTime=value;},getPickTime:()=>pickTime,flush(){for(const release of retired.splice(0))release();},async start(){return roster.prepareNativeRoute(entity.id,support,{getPickTime:()=>pickTime});},next(motion={}){assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.4).status,'advanced');const origin=f.bridge.sampleNativeRoute(handle,10.4);const nextHandle=f.worker(1,origin,f.point(-6,0),motion);const nextPacket=f.bridge.captureNativeRoutePresentation(nextHandle),nextSupport=terrain.prepareNativeRoute(nextPacket,{terrainManifest:manifest});assert(nextSupport);return {handle:nextHandle,packet:nextPacket,support:nextSupport};},close(){roster.dispose();for(const release of retired.splice(0))release();terrain.dispose();residency.dispose();ground.dispose();bake.dispose();runBake?.dispose();carryBake?.dispose();registry.dispose();f.session.dispose();}};
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
 const f=await fixture();try{await f.start();const actor=f.roster.get(f.entity.id);f.pickTime=10.2;const restore=actor.preparePick();restore();const next=f.next();f.pickTime=next.packet.startTime+.1;await f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});let mesh;actor.root.traverse(node=>{if(node.isMesh&&node.visible&&node._wgWalkDuration!==undefined&&!mesh)mesh=node;});assert(mesh);const gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new THREE.PerspectiveCamera();builder.build();const refs=[];for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const uniform of binding.uniforms??[]){const value=uniform.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(value?.nativeRoute)refs.push(value.nativeRoute);}assert(refs.length>0);for(const ref of refs)assert.deepEqual(ref,next.packet.nativeRoute);assert.doesNotMatch(builder.vertexShader,/NaN/);}finally{f.close();}
});


test('reuse cannot bypass cancellation, caller validity or immutable assignment data',async()=>{
 const f=await fixture();try{await f.start();const controller=new AbortController();controller.abort();
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,f.support,{getPickTime:f.getPickTime,signal:controller.signal}),/unavailable/);
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,f.support,{getPickTime:f.getPickTime,isCurrent:()=>false}),/unavailable/);
 const rows=f.packet.rows.slice();rows[4]+=.1;const changed={...f.support,presentation:{...f.packet,rows}};
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,changed,{getPickTime:f.getPickTime}),/without a new identity/);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);
 }finally{f.close();}
});

test('missing running resources and unprepared held intervals reject native publication',async()=>{
 const f=await fixture();try{for(const column of [14,15]){const rows=f.packet.rows.slice();rows[column]=column===14?1:0;const unsupported={...f.support,presentation:{...f.packet,rows}};
 await assert.rejects(f.roster.prepareNativeRoute(f.entity.id,unsupported,{getPickTime:f.getPickTime}),/clip transition not prepared|running resource unavailable/);assert.equal(f.roster.status().native,0);}
 }finally{f.close();}
});


function buildNativeShader(f,actor){let mesh;actor.root.traverse(node=>{if(node.isMesh&&node.visible&&node._wgWalkDuration!==undefined&&!mesh)mesh=node;});assert(mesh);const gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new THREE.PerspectiveCamera();builder.build();return builder;}
function pickPositions(actor){const restore=actor.preparePick(),result=[];try{actor.root.traverse(node=>{if(node.isMesh&&node.visible&&node.userData.wgCpuPickProxy)result.push(...node.geometry.attributes.position.array);});return result;}finally{restore();}}

test('one native assignment changes Run to Walk in its GPU graph without replacing meshes or updating the CPU rig',async()=>{
 const f=await fixture({nativeMotion:{urgent:true,runRemaining:1},withRunning:true});try{
 const cut=Array.from({length:f.packet.rows.length/16},(_,i)=>i*16).find(i=>i>0&&f.packet.rows[i+14]===0&&f.packet.rows[i-2]===1);assert.notEqual(cut,undefined);const at=f.packet.rows[cut];
 await f.start();const actor=f.roster.get(f.entity.id),meshes=geometry(actor.root),anchor=actor.root.position.clone(),materials=meshes.map(item=>item.mesh.material),pose=[];actor.root.traverse(node=>{if(node.isBone)pose.push(...node.matrix.toArray());});
 f.pickTime=at-.1;const running=pickPositions(actor);f.entity.running=false;f.entity.walkPhase+=2;f.roster.sync();f.pickTime=at+.1;const walking=pickPositions(actor);assert(running.length>0);assert.equal(running.length,walking.length);assert.notDeepEqual(running,walking);
 assert(actor.root.position.equals(anchor));sameGeometry(meshes);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);const after=[];actor.root.traverse(node=>{if(node.isBone)after.push(...node.matrix.toArray());});assert.deepEqual(after,pose);
 const builder=buildNativeShader(f,actor),textures=builder.getBindings().flatMap(group=>group.bindings??[]).map(binding=>binding.texture).filter(Boolean);assert(textures.includes(f.bake.texture));assert(textures.includes(f.runBake.texture));assert.doesNotMatch(builder.vertexShader,/NaN/);assert.match(builder.vertexShader,/if \(/);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('native locomotion reuses an already running presentation as its static mesh owner',async()=>{
 const f=await fixture({nativeMotion:{urgent:true,runRemaining:1},withRunning:true,initialRunning:true});try{await f.start();const actor=f.roster.get(f.entity.id);assert.equal(actor.isBakedRunning(),true);const meshes=geometry(actor.root),materials=meshes.map(item=>item.mesh.material);f.entity.running=false;f.roster.sync();assert.equal(actor.isBakedRunning(),true);sameGeometry(meshes);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert(buildNativeShader(f,actor).vertexShader.length>100);assert.deepEqual(f.errors,[]);}finally{f.close();}
});


test('native Run/Walk uses compatible original matrices for every supported worker profile',async()=>{
 for(const profile of ['youngMale','youngFemale','olderMale','olderFemale']){
  const f=await fixture({profile,nativeMotion:{urgent:true,runRemaining:1},withRunning:true});try{await f.start();const actor=f.roster.get(f.entity.id);assert.equal(f.roster.status().native,1);const builder=buildNativeShader(f,actor),textures=builder.getBindings().flatMap(group=>group.bindings??[]).map(binding=>binding.texture);assert(textures.includes(f.bake.texture),profile);assert(textures.includes(f.runBake.texture),profile);assert.deepEqual(f.errors,[]);}finally{f.close();}
 }
});


function crateMeshes(root){const result=[];root.traverse(node=>{if(node.isMesh&&node._wgWalkAttachmentIndex!==undefined&&!node.userData.wgCpuPickProxy)result.push(node);});return result;}
async function pendingAfter(f,before=null){const deadline=performance.now()+5000;while((!f.pending||f.pending===before)&&performance.now()<deadline)await new Promise(resolve=>setImmediate(resolve));assert(f.pending&&f.pending!==before,'a bounded native material preparation must arrive');return f.pending;}

test('native Carry prepares the original nine crate attachments under the same worker route clock',async()=>{
 const f=await fixture({carrying:true,withCarry:true});try{const result=await f.start(),actor=f.roster.get(f.entity.id),attachments=crateMeshes(actor.root);assert.equal(f.packet.motionFlags&8,8);assert.equal(attachments.length,9);assert(attachments.every(mesh=>mesh.visible));assert.equal(actor.isBakedCarrying(),true);assert.equal(f.acquires,1);const anchor=actor.root.position.clone(),meshes=geometry(actor.root),materials=meshes.map(item=>item.mesh.material);
 f.pickTime=f.packet.startTime+.6;const restore=actor.preparePick();restore();f.entity.x+=.1;f.entity.carryPhase+=2;f.roster.sync();assert(actor.root.position.equals(anchor));sameGeometry(meshes);assert.deepEqual(meshes.map(item=>item.mesh.material),materials);
 const visible=attachments[0],gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;const builder=gpu.backend.createNodeBuilder(visible,gpu);builder.scene=f.scene;builder.camera=new THREE.PerspectiveCamera();builder.build();const refs=[];for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const uniform of binding.uniforms??[]){const ref=uniform.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')]?.nativeRoute;if(ref)refs.push(ref);}assert(refs.length>0);assert(refs.every(ref=>JSON.stringify(ref)===JSON.stringify(result.nativeRoute)));assert.match(builder.vertexShader,/textureLoad/);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('Walk to Carry prepares hidden attachments and publishes their native materials and visibility atomically',async()=>{
 const f=await fixture({withCarry:true});try{await f.start();const actor=f.roster.get(f.entity.id),root=actor.root,meshes=geometry(root),materials=meshes.map(item=>item.mesh.material),anchor=root.position.clone();f.entity.status='carrying';f.entity.crateId='crate-900020';f.state.crates=[{id:f.entity.crateId,carrierId:f.entity.id,delivered:false}];f.roster.sync();const next=f.next({carrying:true});f.hold=true;const preparing=f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});const resources=await pendingAfter(f);assert.equal(crateMeshes(root).length,9);assert(crateMeshes(root).every(mesh=>!mesh.visible));assert.deepEqual(meshes.map(item=>item.mesh.material),materials);resources.finish();const native=await pendingAfter(f,resources);assert(crateMeshes(root).every(mesh=>!mesh.visible));assert.deepEqual(meshes.map(item=>item.mesh.material),materials);native.finish();await preparing;assert(crateMeshes(root).every(mesh=>mesh.visible));assert.equal(actor.isBakedCarrying(),true);assert.equal(actor.isBakedWalking(),false);assert(root.position.equals(anchor));sameGeometry(meshes);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});


test('Carry to Walk retires GPU and original crate geometry visibility without replacing the worker rig',async()=>{
 const f=await fixture({carrying:true,withCarry:true});try{await f.start();const actor=f.roster.get(f.entity.id),root=actor.root,meshes=geometry(root),anchor=root.position.clone();f.entity.status='walking';f.entity.crateId=null;f.state.crates[0].carrierId=null;f.roster.sync();const next=f.next();await f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime});assert.equal(actor.isBakedWalking(),true);assert.equal(actor.isBakedCarrying(),false);assert(crateMeshes(root).every(mesh=>!mesh.visible));const originalCrates=[];root.traverse(node=>{if(f.carryBake.meta.attachments.some(item=>item.name===node.name))originalCrates.push(node);});assert.equal(originalCrates.length,9);assert(originalCrates.every(mesh=>!mesh.visible));assert(root.position.equals(anchor));sameGeometry(meshes);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});


test('carry ownership changing during native material preparation rejects publication and preserves the prior graph',async()=>{
 const f=await fixture({carrying:true,withCarry:true});try{await f.start();const actor=f.roster.get(f.entity.id),meshes=geometry(actor.root),materials=meshes.map(item=>item.mesh.material),next=f.next({carrying:true});f.hold=true;const preparing=f.roster.prepareNativeRoute(f.entity.id,next.support,{getPickTime:f.getPickTime}),pending=await pendingAfter(f);f.state.crates[0].carrierId=null;pending.finish();await assert.rejects(preparing,{name:'AbortError'});assert.deepEqual(meshes.map(item=>item.mesh.material),materials);assert.equal(actor.isBakedCarrying(),true);sameGeometry(meshes);assert.deepEqual(f.errors,[]);}finally{f.close();}
});
