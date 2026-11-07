import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {Scene,Vector3} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {loadBakedWorkerWalkAsset,BAKED_WORKER_WALK_PROFILES} from '../src/rendering/baked-worker-walk-catalog.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
const fetcher=async url=>{const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
for(const profile of BAKED_WORKER_WALK_PROFILES)test(`${profile}: GPU alert follows the CPU watch phase and falls back on other poses`,async()=>{
 const bake=await loadBakedWorkerWalkAsset(profile,{clip:'Alert',fetcher,subtle:webcrypto.subtle}),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}};
 async function make(){const asset=await actorAsset(bake.meta.source),entity={id:'w',profile,status:'idle',idleState:{mode:'watch',elapsed:0},x:0,z:0},state={workers:[entity],tasks:[],elapsed:0},model=asset.scene,actor=await createWebGpuConfirmedWorker({scene:new Scene(),residency:{get:()=>null},state,actorId:'w',renderer,assetBank:{async acquire(){return {model,clips:prepareWorkerClips(asset.animations),library,release(){}};}}});return {actor,entity,state,model};}
 const gpu=await make(),cpu=await make();try{await gpu.actor.installBakedAlert(bake,{pipelineAdmission:{prepare:()=>Promise.resolve()}});let maximum=0;
 for(const t of Array.from({length:Math.floor(bake.meta.duration*60)},(_,i)=>i/60)){for(const item of [gpu,cpu]){item.entity.idleState.elapsed=t;item.state.elapsed=t+10;item.actor.update();item.actor.root.updateMatrixWorld(true);}assert.equal(gpu.actor.isBakedAlert(),true);const meshes=gpu.actor.admissionObjects().filter(node=>!node.isSkinnedMesh&&node.visible),restore=gpu.actor.preparePick(),sources=[];cpu.model.traverse(node=>{if(node.isSkinnedMesh)sources.push(node);});const proxies=meshes.map(mesh=>mesh.parent.children.find(node=>node!==mesh&&node.isMesh&&node.visible&&node.geometry!==mesh.geometry&&node.geometry.index===mesh.geometry.index));assert.equal(proxies.length,sources.length);assert.ok(proxies.every(Boolean));for(let j=0;j<sources.length;j++){const n=sources[j].geometry.attributes.position.count;for(let i=0;i<n;i+=Math.max(1,Math.floor(n/70))){const a=sources[j].getVertexPosition(i,new Vector3()).applyMatrix4(sources[j].matrixWorld),b=proxies[j].getVertexPosition(i,new Vector3()).applyMatrix4(proxies[j].matrixWorld);maximum=Math.max(maximum,a.distanceTo(b));}}restore();}
 assert.ok(maximum<.02,`max alert proxy error ${maximum}`);gpu.entity.idleState.mode='rest';gpu.actor.update();assert.equal(gpu.actor.isBakedAlert(),false);gpu.entity.idleState.mode='watch';gpu.entity.gateWaiting=true;gpu.actor.update();assert.equal(gpu.actor.isBakedAlert(),false);
 }finally{gpu.actor.dispose();cpu.actor.dispose();bake.dispose();}
});
