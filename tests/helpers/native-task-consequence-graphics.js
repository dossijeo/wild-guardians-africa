import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {Scene,MeshBasicMaterial,DoubleSide} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {nativeTaskConsequenceFixture} from './native-task-consequence.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../../src/rendering/confirmed-terrain-support.js';
import {createWebGpuWorkerRoster} from '../../src/rendering/webgpu-worker-roster.js';
import {createWebGpuConfirmedWorker} from '../../src/rendering/webgpu-confirmed-worker.js';
import {loadBakedWorkerWalkAsset} from '../../src/rendering/baked-worker-walk-catalog.js';
import {prepareWorkerClips} from '../../src/rendering/worker-clips.js';
import {actorAsset} from './actor-geometry.js';
import {createWebGpuResourceRegistry} from '../../src/rendering/webgpu-resource-registry.js';

const fetcher=async url=>{const bytes=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
// Actual authored assets/terrain and real native proposal; the renderer/admission
// services below are doubles. Source ABI setup is not hardware admission proof.
export async function nativeTaskConsequenceGraphicsFixture(){
 const f=nativeTaskConsequenceFixture(),scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material}),chunks=[];
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'consequence-graphics');chunks.push({cx:x,cz:z,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency}),manifest={epoch:'consequence-graphics',chunks},state=structuredClone(f.state);state.workers=state.workers.filter(w=>w.id===f.actor);
 // The retained presentation is the preceding restored-action publication; the
 // direct native binding has already committed at this same stationary boundary.
 Object.assign(state.workers[0],{status:'waiting-task',nativeRouteAdmission:'pending-action-resources',path:null});
 const profile=f.worker.profile,names=['Walk_Skip','Harvest','Carry_Crate'],values=await Promise.all(names.map(clip=>loadBakedWorkerWalkAsset(profile,{clip,fetcher,subtle:webcrypto.subtle}))),bakes=new Map(names.map((name,i)=>[name,values[i]])),asset=await actorAsset(bakes.get('Walk_Skip').meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],registry=createWebGpuResourceRegistry(),retired=[],errors=[];let carries=0,acquires=0,pickTime=f.state.elapsed;
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},admission={async prepare(){},async prepareAndPublish(_root,_options,publish){publish();},deferRelease(_root,release){retired.push(release);}},bank={async acquire(){acquires++;return {model:clone(asset.scene),clips:prepareWorkerClips(asset.animations),library,release(){}};},dispose(){}},roster=createWebGpuWorkerRoster({scene,residency,state,assetBank:bank,renderer,resourceRegistry:registry,pipelineAdmission:admission,bakedWalkBank:{get:async()=>bakes.get('Walk_Skip')},bakedHarvestBank:{get:async()=>bakes.get('Harvest')},bakedCarryBank:{get:async()=>{carries++;return bakes.get('Carry_Crate');}},createWorker:async options=>{const actor=await createWebGpuConfirmedWorker(options);await actor.installBakedWalk(bakes.get('Walk_Skip'),{pipelineAdmission:admission});return actor;},onError:e=>errors.push(e),onBakedWalkError:(_profile,e)=>errors.push(e)});
 try{roster.sync();const action=await roster.prepareNativeTaskActionProposal(terrain.prepareNativeTaskAction(f.source.reference),{getPickAge:()=>0,nativeTaskActionBinding:f.source});action.activate();action.finalize({nativeTaskActionBinding:f.source});state.workers[0]=structuredClone(f.worker);roster.sync();for(const release of retired.splice(0))release();
  const prepared=f.prepare();assert.equal(prepared.status,'proposed');const support=terrain.prepareNativeTaskConsequenceProposal(prepared.proposal,{terrainManifest:manifest});assert(support?.valid());
  return {...f,scene,residency,terrain,state,roster,registry,renderer,bakes,support,proposal:prepared.proposal,errors,get carries(){return carries;},get acquires(){return acquires;},setPickTime:at=>{pickTime=at;},getPickTime:()=>pickTime,
   commit(){assert.equal(f.commitSourceOnly(prepared.proposal),1);return {nativeTaskConsequenceBinding:f.planner.nativeTaskConsequenceBinding(f.actor),resources:{kind:16,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(prepared.proposal.expectedRouteHandle)}};},
   flush(){for(const release of retired.splice(0))release();},close(){roster.dispose();for(const release of retired.splice(0))release();terrain.dispose();residency.dispose();material.dispose();registry.dispose();for(const bake of values)bake.dispose();f.close();}};
 }catch(error){roster.dispose();terrain.dispose();residency.dispose();material.dispose();registry.dispose();for(const bake of values)bake.dispose();f.close();throw error;}
}
