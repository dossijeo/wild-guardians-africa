import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene, Vector3} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {createBakedWorkerWalkTexture} from '../src/rendering/webgpu-baked-walk.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
import {BAKED_WORKER_WALK_PROFILES} from '../src/rendering/baked-worker-walk-catalog.js';

 for(const profile of BAKED_WORKER_WALK_PROFILES) test(`${profile} walk admission preserves morphs and returns to the live rig`,async()=>{
 const meta=JSON.parse(await readFile(`public/content/gpu-worker-walk/${profile}/walking.json`)),bytes=await readFile(`public/content/gpu-worker-walk/${profile}/walking.bin`),bake=createBakedWorkerWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),asset=await actorAsset(meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],model=asset.scene,scene=new Scene(),originals=[];model.traverse(o=>{if(o.isSkinnedMesh)originals.push(o)});
 const worker={id:'w',profile,status:'walking',walkPhase:.25,x:0,z:0},state={workers:[worker],tasks:[],elapsed:.25},renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},assetBank={async acquire(){return {model,clips:prepareWorkerClips(asset.animations),library,release(){}}}},actor=await createWebGpuConfirmedWorker({scene,residency:{get:()=>null},state,actorId:'w',assetBank,renderer});
 let publish;const pending=actor.installBakedWalk(bake,{pipelineAdmission:{prepare(){throw Error('not atomic');},prepareAndPublish(_root,{include},fn){assert.equal(include.length,originals.length*2);return new Promise(resolve=>publish=()=>{fn();resolve()})}}});assert.equal(actor.isBakedWalking(),false);publish();assert.equal(await pending,true);assert.equal(actor.isBakedWalking(),true);
 const replicas=actor.admissionObjects().filter(o=>!o.isSkinnedMesh);assert.equal(replicas.length,originals.length);for(let i=0;i<originals.length;i++){assert.equal(replicas[i].morphTargetInfluences,originals[i].morphTargetInfluences);assert.equal(originals[i].visible,false)}
 const before=originals[0].skeleton.bones.map(b=>b.quaternion.toArray());let sawBlink=false;for(let i=1;i<=100;i++){worker.walkPhase=(i*.05)%meta.duration;state.elapsed=i*.05;actor.update();for(let j=0;j<originals.length;j++){const influences=originals[j].morphTargetInfluences;if(influences?.some(value=>value>.05))sawBlink=true;assert.equal(replicas[j].morphTargetInfluences,influences);}}assert.ok(sawBlink,'worker facial expression must continue while GPU walking');assert.deepEqual(originals[0].skeleton.bones.map(b=>b.quaternion.toArray()),before);
 worker.status='carrying';actor.update();assert.equal(actor.isBakedWalking(),false);assert.ok(originals.every(o=>o.visible));worker.status='walking';worker.walkPhase=1;actor.update();assert.equal(actor.isBakedWalking(),true);
 for(const [flag,value] of [['running',true],['gateWaiting',true],['fallRemaining',.1],['incapacitated',true],['recoveryExitRemaining',.1]]){worker[flag]=value;actor.update();assert.equal(actor.isBakedWalking(),false,`${profile}: ${flag} uses the live rig`);delete worker[flag];actor.update();assert.equal(actor.isBakedWalking(),true,`${profile}: resumes after ${flag}`);}
 actor.dispose();bake.dispose();
 });

for(const profile of BAKED_WORKER_WALK_PROFILES) test(`${profile} baked vertices match CPU at sample times across transition`,async()=>{
 const meta=JSON.parse(await readFile(`public/content/gpu-worker-walk/${profile}/walking.json`)),bytes=await readFile(`public/content/gpu-worker-walk/${profile}/walking.bin`),bake=createBakedWorkerWalkTexture(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}};
 async function make(id){const asset=await actorAsset(meta.source),worker={id,profile,status:'walking',walkPhase:0,x:0,z:0},state={workers:[worker],tasks:[],elapsed:0},actor=await createWebGpuConfirmedWorker({scene:new Scene(),residency:{get:()=>null},state,actorId:id,assetBank:{async acquire(){return {model:asset.scene,clips:prepareWorkerClips(asset.animations),library,release(){}}}},renderer});return {actor,worker,state,model:asset.scene};}
 const gpu=await make('w'),cpu=await make('w');for(const item of [gpu,cpu]){item.worker.status='carrying';item.actor.update();}await gpu.actor.installBakedWalk(bake,{pipelineAdmission:{prepare(){return Promise.resolve()}}});let max=0;
 for(const time of [0,.25,.7,1,1.5,2.5]){for(const item of [gpu,cpu]){item.worker.status='walking';item.worker.walkPhase=time;item.state.elapsed=time;item.actor.update();item.actor.root.updateMatrixWorld(true);}const restore=gpu.actor.preparePick(),reference=[];cpu.model.traverse(o=>{if(o.isSkinnedMesh)reference.push(o)});const clones=gpu.actor.admissionObjects().filter(o=>!o.isSkinnedMesh),proxies=clones.map(mesh=>mesh.parent.children.find(o=>o!==mesh&&o.isMesh&&o.visible&&o.geometry!==mesh.geometry&&o.geometry.index===mesh.geometry.index));assert.ok(proxies.every(Boolean));
 for(let j=0;j<reference.length;j++){const source=reference[j],proxy=proxies[j],n=source.geometry.attributes.position.count;for(let i=0;i<n;i+=Math.max(1,Math.floor(n/70))){const a=source.getVertexPosition(i,new Vector3()).applyMatrix4(source.matrixWorld),b=new Vector3().fromBufferAttribute(proxy.geometry.attributes.position,i).applyMatrix4(proxy.matrixWorld);max=Math.max(max,a.distanceTo(b));}}restore();}
 gpu.actor.dispose();cpu.actor.dispose();bake.dispose();assert.ok(max<.015,`maximum world-space error ${max}`);
});


