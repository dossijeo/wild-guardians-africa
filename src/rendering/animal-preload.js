import {AnimationMixer} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from './animal-actions.js';

export function releaseActorRig(rig){
  if(!rig)return;rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.model);
  const skeletons=new Set();rig.model.traverse(mesh=>{if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton);});
  for(const skeleton of skeletons)skeleton.dispose();
}

// Geometry and materials are borrowed from Assets; each rig owns its skeleton
// and mixer. Keep one prepared spare per species, not an unbounded actor pool.
export class AnimalPreload {
  constructor(assets,descriptors){this.assets=assets;this.descriptors=descriptors;this.entries=new Map();this.disposed=false;}
  async warm(species){
    if(!this.entries.has(species)){
      const descriptor=this.descriptors(species);
      if(!descriptor)throw Error('Falta el modelo de '+species);
      const pending=this.assets.model(descriptor.url).then(gltf=>{
        const entry={gltf,clips:prepareAnimalClips(gltf.animations),spare:null};
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
    model.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.computeBoundingSphere();});
    return rig;
  }
  async take(species){
    const entry=await this.warm(species);if(this.disposed)return null;
    const rig=entry.spare??this.create(species,entry);entry.spare=null;return rig;
  }
  async spares(){return (await Promise.all(this.entries.values())).map(entry=>entry.spare).filter(Boolean);}
  dispose(){this.disposed=true;for(const pending of this.entries.values())pending.then(entry=>{releaseActorRig(entry.spare);entry.spare=null;}).catch(()=>{});this.entries.clear();}
}
