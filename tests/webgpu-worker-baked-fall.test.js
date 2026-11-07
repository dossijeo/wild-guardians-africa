import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {Scene} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './helpers/actor-geometry.js';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
import {decodeRecoveryClips} from '../src/rendering/recovery-clips.js';
import {loadBakedWorkerWalkAsset} from '../src/rendering/baked-worker-walk-catalog.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
const fetcher=async url=>{const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
test('fall bake follows confirmed time and hands off to recovery',async()=>{
 const recoveryMeta=JSON.parse(await readFile('public/content/guardian/worker-recovery/recovery.json')),recoveryBytes=await readFile('public/content/guardian/worker-recovery/recovery.bin'),recovery=decodeRecoveryClips(recoveryMeta,recoveryBytes.buffer.slice(recoveryBytes.byteOffset,recoveryBytes.byteOffset+recoveryBytes.byteLength));const profile='youngMale',bake=await loadBakedWorkerWalkAsset(profile,{clip:'Fall',fetcher,subtle:webcrypto.subtle}),asset=await actorAsset(bake.meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],entity={id:'w',profile,status:'fleeing',fallRemaining:2,incapacitated:true,x:0,z:0},state={workers:[entity],tasks:[],elapsed:0},renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},actor=await createWebGpuConfirmedWorker({scene:new Scene(),residency:{get:()=>null},state,actorId:'w',renderer,assetBank:{async acquire(){return {model:asset.scene,clips:[...prepareWorkerClips(asset.animations),recovery.get(profile)],library,release(){}};}}});
 try{assert.equal(bake.meta.attachments?.length??0,0);await actor.installBakedFall(bake,{pipelineAdmission:{prepare:async()=>{}}});assert.equal(actor.isBakedFalling(),true);const visible=()=>{let mesh;actor.root.traverse(node=>{if(node.isMesh&&node.visible&&node._wgWalkPhaseOffset!==undefined)mesh=node});return mesh;};const before=visible()._wgWalkPhaseOffset;assert.equal(visible()._wgWalkClockWeight,0);state.elapsed=10;actor.update();assert.equal(visible()._wgWalkPhaseOffset,before);entity.fallRemaining=1.5;actor.update();assert.notEqual(visible()._wgWalkPhaseOffset,before);entity.fallRemaining=0;entity.recovery={elapsed:0,duration:2,heading:0,dx:0,dz:0,fraction:0};actor.update();assert.equal(actor.isBakedFalling(),false);entity.recovery=null;entity.status='walking';entity.incapacitated=false;actor.update();assert.equal(actor.isBakedFalling(),false);}finally{actor.dispose();bake.dispose();}
});
test('all fall bakes load against their authored worker rig',async()=>{for(const profile of ['youngMale','olderMale','olderFemale','youngFemale']){const bake=await loadBakedWorkerWalkAsset(profile,{clip:'Fall',fetcher,subtle:webcrypto.subtle});assert.equal(bake.meta.attachments?.length??0,0);bake.dispose();}});
