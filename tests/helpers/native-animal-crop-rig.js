import assert from 'node:assert/strict';
import {createChunkPublicationCoordinator} from '../../src/rendering/webgpu-chunk-publication.js';
import {actorTickState} from '../../src/simulation/worker-actor-tick-states.js';
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
export async function originalRig(state,manifest,{contention=null,onNativeCropStrikeRetired}={}){
 const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),chunks=new Map();
 const session=createSpatialGameSession(module,state,{loaded:()=>chunks,onData:d=>chunks.set(d.cx+','+d.cz,d)});
 const scene=new Scene(),mat=new MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material:mat,waterMaterial:mat}),terrain=createConfirmedTerrainSupport({residency});
 for(const c of manifest.chunks){session.core.addChunk(c.cx,c.cz);session.core.selectChunk(c.cx,c.cz);residency.replace(session.core.chunkPayload(),1,manifest.epoch);}
 const asset=await actorAsset('public'+ANIMAL_ACTIONS.animals.warthog.url),model=asset.scene,original=[];
 model.traverse(n=>{if(n.isSkinnedMesh)original.push([n,n.geometry,n.geometry.attributes.position,n.geometry.attributes.normal]);});
 assert.equal(original.length,4);
 const animal=state.raid.animals[0],savedStatus=animal.status;
 const postStrike=contention==='post-strike';let historicalAdmissions=0;
 const historical=contention==='historical'||postStrike||contention==='successor-history'?createConfirmedHistoricalClock({initialElapsed:state.elapsed}):null;
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
   assert(historical);if(postStrike){historicalAdmissions++;publish();return;}assert(!lateHistory||lateHistory.signal.aborted);
   await new Promise(resolve=>{lateHistory={signal,publish,resolve};});
   publish();
  },deferRelease(_root,op){op();}},
  renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:()=>new MeshStandardNodeMaterial()}};
 const roster=createWebGpuAnimalRoster({scene,state,onNativeCropStrikeRetired,...(historical?{experimentalHistoricalMotion:{actorIds:[],clock:historical}}:{}),residency,renderer,bakedWalkBank:bank('gpu-walk'),bakedRunBank:bank('gpu-animal-run'),bakedAttackBank:bank('gpu-animal-attack',true),
   assetBank:{async acquire(){return {model,clips:prepareAnimalClips(asset.animations),release(){}};},tick(){},dispose(){}},pipelineAdmission,onError:e=>{throw e;},onBakedWalkError:(_s,e)=>{throw e;}});
 roster.sync();let part=null,age=0,lastProof=null;
 const intact=()=>{for(const [mesh,g,p,n] of original){assert.equal(mesh.geometry,g);assert.equal(g.attributes.position,p);assert.equal(g.attributes.normal,n);}};
 let preparedReturn=null,centerReturns=0,runningReturns=0;
 function historicalObservation(displacement,validSupport=true){
   const entity=state.raid.animals[0],root=roster.get(animal.id).root;
   const start=state.elapsed,end=start+.05,y=root.position.y;
    const p={actorId:entity.id,startStatus:entity.status,endStatus:entity.status,continuous:true,timed:true,
     start:{at:start,x:entity.x,z:entity.z},end:{at:end,x:entity.x+displacement,z:entity.z}};
    p.segments=[{t0:start,t1:end,x0:p.start.x,z0:p.start.z,x1:p.end.x,z1:p.end.z}];
    const first={...actorTickState(entity,start),yaw:root.rotation.y},last={...first,at:end,x:p.end.x,motionPhase:entity.motionPhase+displacement};
    const clockSegments={version:1,start,end,startPauses:[],endPauses:[],complete:true,segments:[{start,end,realDuration:end-start,rate:1}]};
    const preview={sequence:1,start,end,clockSegments,trace:{actors:[p],actorTickStates:{complete:true,actors:[{actorId:entity.id,samples:[first,last]}]}},certificates:{}};
    const support={sequence:1,valid:()=>validSupport,actors:[{actorId:entity.id,startHeight:y,endHeight:y,segments:p.segments.map(s=>({...s,y0:y,y1:y}))}]};
    return {preview,support};
   }

 async function prepareStop(resources){
    const stop=resources.nativeShieldCropStop??resources.nativeShieldCropExpiry;
    const support=terrain.prepareShieldCropStop(stop),root=roster.get(animal.id).root;
    const signal=new AbortController().signal;
    await assert.rejects(roster.prepareShieldCropStop({...stop,bodyId:stop.bodyId+1},support,{signal}));
    const batcher=createChunkPublicationCoordinator({admission:{...pipelineAdmission,prepareManyAndPublish:async()=>{}}});
    const prepare=async()=>{const part=await roster.prepareShieldCropStop(stop,support,{signal});return {
     part,batch:await batcher.prepareBatch([],{scene,signal,dependents:[part]})};};
    const visible=()=>{const meshes=[];root.traverseVisible(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)meshes.push(mesh);});
     return meshes.map(mesh=>[mesh,mesh.material,mesh.geometry]);};
    const original=visible();assert.equal(original.length,4);
    const first=await prepare();
    assert.throws(()=>first.batch.capturePresentation(()=>{throw Error('cancelled recording');}),/cancelled recording/);
    assert.deepEqual(visible(),original);
    const {part,batch}=await prepare();let selected;
    batch.capturePresentation(()=>{selected=visible();
     assert.equal(selected.length,4);for(let i=0;i<selected.length;i++){
      assert.equal(selected[i][0],original[i][0]);assert.equal(selected[i][2],original[i][2]);assert.notEqual(selected[i][1],original[i][1]);
     }
    });
    assert.deepEqual(visible(),original);intact();
    const commit=data=>{
     assert.equal(data.worldBoundary.ticket,stop.worldBoundary.ticket);
     assert.throws(()=>part.accept({...stop,phase:stop.phase+.001}));
     part.accept(data.resources.nativeShieldCropStop??data.resources.nativeShieldCropExpiry);assert(batch.commit());batcher.dispose();
     assert.deepEqual(visible(),selected);assert.equal(roster.nativeCropLease(),null);
     const restore=roster.get(animal.id).preparePick();restore();intact();
    };
    return {commit,abort:()=>batcher.dispose()};
   }
   return {prepareStop,nativeCropLease:roster.nativeCropLease,async prepare(proposal,signal=new AbortController().signal){if(proposal.reference.kind===26)assert.equal(roster.nativeCropLease(),null);const support=terrain.prepareAnimalCrop(proposal,{terrainManifest:manifest});assert(support.valid());
   await assert.rejects(roster.prepareAnimalCrop(proposal,support,{signal:AbortSignal.abort(),getPickAge:()=>0}));
   if(contention==='successor-history'&&proposal.reference.kind===26&&lastProof?.reference.kind===27){
    // Same owner and target as the next admission, but the stationary
    // historical interval already owns the original rig.
    roster.setHistoricalActors([animal.id]);
    const sample=historicalObservation(0),{preview}=sample;
    preview.safeForAutonomousPlayback=true;
    preview.certificates={sequence:preview.sequence,actorId:animal.id,animationSynchronized:true,
     otherActorsSynchronized:true,effectsSynchronized:true,continuousCollision:true,inputSynchronized:true};
    assert(roster.startHistoricalMotion(preview,sample.support));
    assert(roster.historicalMotionCurrent(preview));
    await assert.rejects(roster.prepareAnimalCrop(proposal,support,{signal:new AbortController().signal,getPickAge:()=>0}),
     /Animal crop source or original clip bank unavailable/);
    roster.finishHistoricalMotion(preview);assert(!roster.historicalMotionCurrent(preview));intact();
   }
   if(proposal.reference.kind===26&&holdWalking){
    await started;animal.status=savedStatus;roster.sync();setImmediate(releaseWalk);
   }
   if(proposal.reference.kind===26&&contention==='historical'){
    await new Promise(resolve=>setImmediate(resolve));roster.setHistoricalActors([animal.id]);
    await Promise.resolve();assert(lateHistory);assert.equal(lateHistory.signal.aborted,false);
   }
   part=await roster.prepareAnimalCrop(proposal,support,{signal,getPickAge:()=>age});assert(part.valid());
   if(proposal.reference.kind===26&&contention==='historical'){
    const first=lateHistory;
    assert.equal(first.signal.aborted,true);part.cancel();assert(!part.valid());
    await new Promise(resolve=>setImmediate(resolve));
    assert.notEqual(lateHistory,first);assert(!lateHistory.signal.aborted);
    first.resolve();await Promise.resolve();intact();
    part=await roster.prepareAnimalCrop(proposal,support,{signal:new AbortController().signal,getPickAge:()=>age});
    assert(lateHistory.signal.aborted);lateHistory.resolve();
    await new Promise(resolve=>setImmediate(resolve));assert(part.valid());
   }
   if(proposal.reference.kind===27&&proposal.reference.purpose==='center'){
    const requests=part.requests??[part.request],root=roster.get(animal.id).root;
    preparedReturn=new Map();
    for(const request of requests){
     const {object,options}=request;
     assert.equal(object,root);
     if(request!==part.request){
      for(const mesh of options.include){
       const alternate=options.materialAlternatives.find(item=>item.mesh===mesh);
       if(!alternate)assert.equal(state.raid.animals[0].hitsRemaining,1,'only the terminal strike may prepare another clip');
       preparedReturn.set(mesh,alternate?.material??mesh.material);
      }
     }
     for(const {mesh,material} of options.materialAlternatives){
      assert(options.include.includes(mesh));
      assert.notEqual(mesh.material,material,'preparation must leave the route visible');
     }
    }
   }else assert.equal(part.requests,undefined);
   part.activate();assert(part.valid());part.rollback();assert(part.valid());part.activate();part.withSourcePresentation(()=>intact());assert(part.valid());},
  commit(proof,data){const field=proof.reference.kind===26?'nativeAnimalCropRouteBinding':'nativeAnimalCropStrikeBinding';
    const other=structuredClone(data);other[field].preparedReference.bodyId++;assert.throws(()=>part.validateCommit(other));
    assert(part.validateCommit(data));part.finalize(data);lastProof=proof;if(postStrike&&proof.reference.kind===26)roster.setHistoricalActors([animal.id]);assert.deepEqual(roster.nativeCropLease(),{start:proof.reference.worldBoundary.effectiveTime,end:proof.reference.endTime});intact();age=0;part=null;
    const chunk=Math.floor((proof.reference.x+24)/48)+','+Math.floor((proof.reference.z+24)/48);
    assert.throws(()=>roster.prepareCropTerrainRetention({changedKeys:new Set([chunk]),get:()=>null}));
    const [retained]=roster.prepareCropTerrainRetention({changedKeys:new Set()});assert(retained.valid());retained.cancel();},
  async checkHistoricalDemand(){
   assert(postStrike);assert.equal(roster.nativeCropLease(),null);
   for(let i=0;i<3;i++){roster.sync();roster.setHistoricalActors([animal.id]);}
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(historicalAdmissions,0,'release and repeated roster selection must not compile a historical rig');
   function observe(displacement,{validSupport=true}={}){
    const {preview,support}=historicalObservation(displacement,validSupport);
    return roster.prepareHistoricalMotion(preview,support);
   }
   const stationary=observe(0);assert(stationary.ok,JSON.stringify(stationary));assert.equal(historicalAdmissions,0);
   assert.equal(observe(.05,{validSupport:false}).reason,'support-unavailable');
   await new Promise(resolve=>setImmediate(resolve));assert.equal(historicalAdmissions,0);
   assert(!observe(.05).ok);assert(!observe(.05).ok);
   await new Promise(resolve=>setImmediate(resolve));assert.equal(historicalAdmissions,1);
   assert(observe(.05).ok);assert.equal(historicalAdmissions,1);intact();
  },
  presented(value){age=value;const restore=roster.get(animal.id).preparePick();assert.equal(typeof restore,'function');restore();intact();},
  get centerReturns(){return centerReturns;},get runningReturns(){return runningReturns;},
  update(s){const lease=roster.nativeCropLease();Object.assign(state,s);roster.sync();
   if(preparedReturn&&lease&&!roster.nativeCropLease()&&s.raid){
    const actor=roster.get(animal.id),visible=[];
    actor.root.traverseVisible(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)visible.push(mesh);});
    if(actor.isBakedRunning()){
     assert.equal(s.raid.animals[0].status,'retreating');assert.equal(s.raid.animals[0].hitsRemaining,0);runningReturns++;
    }else assert(actor.isBakedWalking());
    assert.equal(visible.length,4);
    for(const mesh of visible)assert(preparedReturn.get(mesh)===mesh.material,'first ordinary draw needs the exact prepared return material');
    preparedReturn=null;centerReturns++;
   }if(!s.raid){assert.equal(roster.get(animal.id),null);assert.equal(roster.nativeCropLease(),null);return;}intact();if(lastProof?.reference.kind===27&&s.raid.animals[0]?.hitApplied&&s.raid.animals[0]?.status!=='attacking')assert.equal(roster.nativeCropLease(),null);},
  close(){releaseWalk();lateHistory?.resolve();part?.cancel();roster.dispose();terrain.dispose();residency.dispose();mat.dispose();for(const value of owned.values())value.dispose();session.dispose();}};
}
