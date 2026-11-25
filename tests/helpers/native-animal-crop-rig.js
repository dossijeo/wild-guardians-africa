import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Scene,MeshBasicMaterial} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {actorAsset} from './actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createWebGpuAnimalRoster} from '../../src/rendering/webgpu-animal-roster.js';
import {prepareAnimalClips} from '../../src/rendering/animal-actions.js';
import {createBakedWalkTexture} from '../../src/rendering/webgpu-baked-walk.js';
import {createConfirmedTerrainSupport} from '../../src/rendering/confirmed-terrain-support.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedHistoricalClock} from '../../src/rendering/confirmed-historical-clock.js';
export async function originalRig(state,manifest,{contention=null}={}){
 const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),chunks=new Map();
 const session=createSpatialGameSession(module,state,{loaded:()=>chunks,onData:d=>chunks.set(d.cx+','+d.cz,d)});
 const scene=new Scene(),mat=new MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material:mat,waterMaterial:mat}),terrain=createConfirmedTerrainSupport({residency});
 for(const c of manifest.chunks){session.core.addChunk(c.cx,c.cz);session.core.selectChunk(c.cx,c.cz);residency.replace(session.core.chunkPayload(),1,manifest.epoch);}
 const asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.warthog.url),model=asset.scene,original=[];
 model.traverse(n=>{if(n.isSkinnedMesh)original.push([n,n.geometry,n.geometry.attributes.position,n.geometry.attributes.normal]);});
 assert.equal(original.length,4);
 const animal=state.raid.animals[0],savedStatus=animal.status;
 const historical=contention==='historical'?createConfirmedHistoricalClock({initialElapsed:state.elapsed}):null;
 const holdWalking=contention==='locomotion';
 let releaseWalk,walkStarted,rootAdmitted=false,holdingWalk=false,lateHistory=null;
 const started=new Promise(resolve=>{walkStarted=resolve;});
 const walkGate=new Promise(resolve=>{releaseWalk=resolve;});
 if(holdWalking)animal.status='walking';
 const owned=new Map();
 function bank(prefix,attack=false){return {get:async(species,name)=>{
  if(holdWalking&&prefix==='gpu-animal-run')await new Promise(resolve=>setImmediate(resolve));
  const p='public/content/'+prefix+'/'+species+'/'+(attack?name+'/':'')+'walking';if(!owned.has(p)){
   const bytes=readFileSync(p+'.bin');owned.set(p,createBakedWalkTexture(JSON.parse(readFileSync(p+'.json')),bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));
  }return owned.get(p);}};}
 const pipelineAdmission={prepare:async()=>{},async prepareTicket(){
   if(holdWalking&&rootAdmitted&&!holdingWalk){holdingWalk=true;walkStarted();await walkGate;}
   rootAdmitted=true;return {valid:()=>true};
  },async prepareAndPublish(_root,{signal},publish){
   assert(historical);assert(!lateHistory||lateHistory.signal.aborted);
   await new Promise(resolve=>{lateHistory={signal,publish,resolve};});
   publish();
  },deferRelease(_root,op){op();}},
  renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}};
 const roster=createWebGpuAnimalRoster({scene,state,...(historical?{experimentalHistoricalMotion:{actorIds:[],clock:historical}}:{}),residency,renderer,bakedWalkBank:bank('gpu-walk'),bakedRunBank:bank('gpu-animal-run'),bakedAttackBank:bank('gpu-animal-attack',true),
   assetBank:{async acquire(){return {model,clips:prepareAnimalClips(asset.animations),release(){}};},tick(){},dispose(){}},pipelineAdmission,onError:e=>{throw e;},onBakedWalkError:(_s,e)=>{throw e;}});
 roster.sync();let part=null,age=0;
 const intact=()=>{for(const [mesh,g,p,n] of original){assert.equal(mesh.geometry,g);assert.equal(g.attributes.position,p);assert.equal(g.attributes.normal,n);}};
 return {async prepare(proposal){if(proposal.reference.kind===26)assert.equal(roster.nativeCropLease(),null);const support=terrain.prepareAnimalCrop(proposal,{terrainManifest:manifest});assert(support.valid());
   await assert.rejects(roster.prepareAnimalCrop(proposal,support,{signal:AbortSignal.abort(),getPickAge:()=>0}));
   if(proposal.reference.kind===26&&holdWalking){
    await started;animal.status=savedStatus;roster.sync();setImmediate(releaseWalk);
   }
   if(proposal.reference.kind===26&&historical){
    await new Promise(resolve=>setImmediate(resolve));roster.setHistoricalActors([animal.id]);
    await Promise.resolve();assert(lateHistory);assert.equal(lateHistory.signal.aborted,false);
   }
   part=await roster.prepareAnimalCrop(proposal,support,{signal:new AbortController().signal,getPickAge:()=>age});assert(part.valid());
   if(proposal.reference.kind===26&&historical){
    const first=lateHistory;
    assert.equal(first.signal.aborted,true);part.cancel();assert(!part.valid());
    await new Promise(resolve=>setImmediate(resolve));
    assert.notEqual(lateHistory,first);assert(!lateHistory.signal.aborted);
    first.resolve();await Promise.resolve();intact();
    part=await roster.prepareAnimalCrop(proposal,support,{signal:new AbortController().signal,getPickAge:()=>age});
    assert(lateHistory.signal.aborted);lateHistory.resolve();
    await new Promise(resolve=>setImmediate(resolve));assert(part.valid());
   }
   part.activate();assert(part.valid());part.rollback();assert(part.valid());part.activate();part.withSourcePresentation(()=>intact());assert(part.valid());},
  commit(proof,data){const field=proof.reference.kind===26?'nativeAnimalCropRouteBinding':'nativeAnimalCropStrikeBinding';
    const other=structuredClone(data);other[field].preparedReference.bodyId++;assert.throws(()=>part.validateCommit(other));
    assert(part.validateCommit(data));part.finalize(data);assert.deepEqual(roster.nativeCropLease(),{start:proof.reference.worldBoundary.effectiveTime,end:proof.reference.endTime});intact();age=0;part=null;
    const chunk=Math.floor((proof.reference.x+24)/48)+','+Math.floor((proof.reference.z+24)/48);
    assert.throws(()=>roster.prepareCropTerrainRetention({changedKeys:new Set([chunk]),get:()=>null}));
    const [retained]=roster.prepareCropTerrainRetention({changedKeys:new Set()});assert(retained.valid());retained.cancel();},
  presented(value){age=value;const restore=roster.get('animal-396').preparePick();assert.equal(typeof restore,'function');restore();intact();},
  update(s){Object.assign(state,s);roster.sync();intact();if(s.raid.animals[0]?.hitApplied&&s.raid.animals[0]?.status!=='attacking')assert.equal(roster.nativeCropLease(),null);},
  close(){releaseWalk();lateHistory?.resolve();part?.cancel();roster.dispose();terrain.dispose();residency.dispose();mat.dispose();for(const value of owned.values())value.dispose();session.dispose();}};
}
