import {AnimationMixer} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from './animal-actions.js';
import {prepareSkinEnvelope,updateSkinEnvelopeSphere} from './skin-envelope.js';

export function releaseActorRig(rig){
  if(!rig)return;rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.model);
  const skeletons=new Set();rig.model.traverse(mesh=>{if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton);});
  for(const skeleton of skeletons)skeleton.dispose();
}

// Geometry and materials are borrowed from Assets; each rig owns its skeleton
// and mixer. Keep a baseline spare per species and reserves bounded by the
// upcoming group. New reserves are prepared one per frame, never in a burst.
export class AnimalPreload {
  constructor(assets,descriptors,{skinEnvelope=false}={}){this.assets=assets;this.descriptors=descriptors;this.skinEnvelope=skinEnvelope;this.entries=new Map();this.disposed=false;this.reserveGeneration=0;}
  async warm(species){
    if(this.disposed)return null;
    if(!this.entries.has(species)){
      const descriptor=this.descriptors(species);
      if(!descriptor)throw Error('Falta el modelo de '+species);
      const pending=this.assets.model(descriptor.url).then(gltf=>{
        const entry={gltf,clips:prepareAnimalClips(gltf.animations),spare:null,additional:[],target:1};
        if(!this.disposed)entry.spare=this.create(species,entry);
        return entry;
      });
      this.entries.set(species,pending);
      pending.catch(()=>{if(this.entries.get(species)===pending)this.entries.delete(species);});
    }
    return this.entries.get(species);
  }
  create(species,entry){
    const model=prepareAnimalModel(clone(entry.gltf.scene),species);
    model.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=mesh.receiveShadow=true;});
    const rig={model,mixer:new AnimationMixer(model),clips:entry.clips,groundSamples:animalGroundSamples(model),action:null,name:null,profile:null};
    // Bind every original animation now, rather than on the first attack.
    for(const clip of rig.clips)rig.mixer.clipAction(clip);
    applyAnimalPose(rig,{species,status:'entering',motionPhase:0},0);
    model.updateMatrixWorld(true);
    if(this.skinEnvelope)rig.skinEnvelopes=new Map();
    model.traverse(mesh=>{if(mesh.isSkinnedMesh){
      const envelope=this.skinEnvelope?prepareSkinEnvelope(mesh):null;
      if(envelope)rig.skinEnvelopes.set(mesh,envelope);
      if(!updateSkinEnvelopeSphere(mesh,envelope))mesh.computeBoundingSphere();
    }});
    return rig;
  }
  async take(species){
    if(this.disposed)return null;
    const entry=await this.warm(species);if(this.disposed)return null;
    entry.target=Math.max(0,entry.target-1);
    const rig=entry.spare??entry.additional.shift()??this.create(species,entry);entry.spare=null;return rig;
  }
  async reserveGroup(group,{nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),prepare=async()=>{}}={}){
    if(this.disposed)return false;
    const generation=++this.reserveGeneration,counts=new Map();for(const species of group)counts.set(species,(counts.get(species)??0)+1);
    await Promise.all([...counts.keys()].map(species=>this.warm(species)));
    const entries=await Promise.all([...this.entries].map(async([species,pending])=>({species,entry:await pending})));
    const stale=()=>this.disposed||generation!==this.reserveGeneration;
    if(stale())return false;
    const size=entry=>Number(!!entry.spare)+entry.additional.length;
    for(const {species,entry} of entries){entry.target=Math.max(1,counts.get(species)??0);while(size(entry)>entry.target)releaseActorRig(entry.additional.pop());}
    const missing=()=>entries.find(({entry})=>size(entry)<entry.target);
    while(!stale()&&missing()){
      await nextFrame();if(stale())return false;const next=missing();if(!next)break;
      const rig=this.create(next.species,next.entry);
      try{await prepare(rig);}catch(error){releaseActorRig(rig);if(stale())return false;throw error;}
      if(stale()||size(next.entry)>=next.entry.target){releaseActorRig(rig);continue;}
      if(!next.entry.spare)next.entry.spare=rig;else next.entry.additional.push(rig);
    }
    return !stale();
  }
  async spares(){return (await Promise.all(this.entries.values())).flatMap(entry=>[entry.spare,...entry.additional].filter(Boolean));}
  dispose(){this.disposed=true;this.reserveGeneration++;for(const pending of this.entries.values())pending.then(entry=>{releaseActorRig(entry.spare);for(const rig of entry.additional)releaseActorRig(rig);entry.spare=null;entry.additional=[];}).catch(()=>{});this.entries.clear();}
}
