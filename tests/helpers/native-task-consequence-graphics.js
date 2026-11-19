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
export async function nativeWorkerGraphicsFixture(f,{idle=false,alert=false,initialState=null,clips=null,initialClip=null,historicalMotion=null}={}){
 const scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material}),chunks=[];
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'consequence-graphics');chunks.push({cx:x,cz:z,revision:1});}
 const terrain=createConfirmedTerrainSupport({residency}),manifest={epoch:'consequence-graphics',chunks},state=structuredClone(initialState??f.state);state.workers=state.workers.filter(w=>w.id===f.actor);
 const profile=f.worker.profile,names=clips??['Walk_Skip','Harvest','Carry_Crate',...(idle?['Idle']:[]),...(alert?['Alert']:[])],values=await Promise.all(names.map(clip=>loadBakedWorkerWalkAsset(profile,{clip,fetcher,subtle:webcrypto.subtle}))),bakes=new Map(names.map((name,i)=>[name,values[i]])),asset=await actorAsset(bakes.get('Walk_Skip').meta.source),library=JSON.parse(await readFile('public/content/worker-actions.json'))[profile],registry=createWebGpuResourceRegistry(),retired=[],errors=[];let carries=0,acquires=0,pickTime=f.state.elapsed;
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}},admission={async prepare(){},async prepareAndPublish(_root,_options,publish){publish();},deferRelease(_root,release){retired.push(release);}},bank={async acquire(){acquires++;return {model:clone(asset.scene),clips:prepareWorkerClips(asset.animations),library,release(){}};},dispose(){}},roster=createWebGpuWorkerRoster({scene,residency,state,assetBank:bank,renderer,resourceRegistry:registry,pipelineAdmission:admission,experimentalHistoricalMotion:historicalMotion,bakedWalkBank:{get:async()=>bakes.get('Walk_Skip')},bakedRunBank:bakes.has('Run')?{get:async()=>bakes.get('Run')}:null,bakedHarvestBank:{get:async()=>bakes.get('Harvest')},bakedIdleBank:idle?{get:async()=>bakes.get('Idle')}:null,bakedAlertBank:alert?{get:async()=>bakes.get('Alert')}:null,bakedCarryBank:{get:async()=>{carries++;return bakes.get('Carry_Crate');}},createWorker:async options=>{const actor=await createWebGpuConfirmedWorker(options);await actor.installBakedWalk(bakes.get('Walk_Skip'),{pipelineAdmission:admission});if(initialClip==='Alert')await actor.installBakedAlert(bakes.get('Alert'),{pipelineAdmission:admission});else if(initialClip==='Idle')await actor.installBakedIdle(bakes.get('Idle'),{pipelineAdmission:admission});return actor;},onError:e=>errors.push(e),onBakedWalkError:(_profile,e)=>errors.push(e)});
 try{roster.sync();await new Promise(resolve=>setImmediate(resolve));
  return {...f,nativeState:f.state,scene,residency,terrain,manifest,state,roster,registry,renderer,bakes,errors,admission,get carries(){return carries;},get acquires(){return acquires;},setPickTime:at=>{pickTime=at;},getPickTime:()=>pickTime,
   flush(){for(const release of retired.splice(0))release();},close(){roster.dispose();for(const release of retired.splice(0))release();terrain.dispose();residency.dispose();material.dispose();registry.dispose();for(const bake of values)bake.dispose();f.close();}};
 }catch(error){roster.dispose();terrain.dispose();residency.dispose();material.dispose();registry.dispose();for(const bake of values)bake.dispose();f.close();throw error;}
}

// The preceding action is specific to this consequence fixture. Other native
// owners reuse the resident authored actor without inventing action history.
export async function nativeTaskConsequenceGraphicsFixture({idle=false}={}){
 const native=nativeTaskConsequenceFixture(),initialState=structuredClone(native.state);
 Object.assign(initialState.workers.find(w=>w.id===native.actor),{status:'waiting-task',nativeRouteAdmission:'pending-action-resources',path:null});
 const f=await nativeWorkerGraphicsFixture(native,{idle,initialState});
 try{
  const action=await f.roster.prepareNativeTaskActionProposal(f.terrain.prepareNativeTaskAction(f.source.reference),{getPickAge:()=>0,nativeTaskActionBinding:f.source});action.activate();action.finalize({nativeTaskActionBinding:f.source});f.state.workers[0]=structuredClone(f.worker);f.roster.sync();f.flush();
  const prepared=f.prepare();assert.equal(prepared.status,'proposed');const support=f.terrain.prepareNativeTaskConsequenceProposal(prepared.proposal,{terrainManifest:f.manifest});assert(support?.valid());
  return {...f,support,proposal:prepared.proposal,get carries(){return f.carries;},get acquires(){return f.acquires;},
   commit(){assert.equal(f.commitSourceOnly(prepared.proposal),1);return {nativeTaskConsequenceBinding:f.planner.nativeTaskConsequenceBinding(f.actor),resources:{kind:16,phase:'committed',presentation:f.planner.captureNativeRoutePresentation(prepared.proposal.expectedRouteHandle)}};}};
 }catch(error){f.close();throw error;}
}
