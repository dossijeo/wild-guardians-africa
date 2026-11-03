import {Group,AnimationMixer} from 'three';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../rendering/beast-combat-physics.js';
import {loadRecoveryClips} from '../rendering/recovery-clips.js';
import {prepareAnimalModel,animalGroundSamples,applyAnimalPose} from '../rendering/animal-actions.js';
import {restoreAnimalImpact,captureAnimalImpact,applyAnimalImpact} from '../rendering/animal-impact.js';
import {supportAnimalOnTerrain} from '../rendering/animal-terrain-support.js';
import {loadWorkerPhysicsRig} from './worker-physics-rig.js';
import {loadWorkerPhysicsClips} from './worker-physics-clips.js';
import {guardianImpactTime} from './guardian-timing.js';
import {createWorkerStructureObjects} from './worker-structure-geometry.js';

// Initial, explicitly constrained path for one real animal rig. It cannot be
// used as the general game physics owner until all obstacle models and actors
// are available in the worker. Missing collision data fails closed.
export async function createWorkerBeastPhysics(game,nav,{actorId,structureTemplates=null}={}){
 const animal=game.raid?.animals.find(a=>a.id===actorId);
 if(!animal||!['hyena','lion','warthog','buffalo','rhino'].includes(animal.species)||game.raid.animals.some(a=>a.magicDown||a.magicImpact&&game.elapsed-guardianImpactTime(a.magicImpact)<.5))throw Error('Worker physics requires one supported animal without an active impact');
 const species=animal.species;
 const [R,model,clips,recoveries]=await Promise.all([beastPhysicsRuntime(),loadWorkerPhysicsRig(species),loadWorkerPhysicsClips(species),loadRecoveryClips()]);
 prepareAnimalModel(model,species);const root=new Group();root.add(model);const rig={model,mixer:new AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)};
 const world={state:game,nav,objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,rig]]),onError:error=>{throw error;}};
 const structures=structureTemplates===null?null:createWorkerStructureObjects(game,nav,structureTemplates);
 const manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;
 function assertEnvironment(){
  if(structures){structures.sync(animal);for(const [id,object] of structures.objects)world.objects.set(id,object);}
  else if(game.structures.some(s=>s.status==='intact'&&s.kind!=='wall'&&Math.hypot(s.x-animal.x,s.z-animal.z)<=10))throw Error('Worker physics lacks nearby structure geometry');
  if((game.raid?.animals??[]).some(a=>a.id!==actorId&&a.magicDown))throw Error('Worker physics lacks another active ragdoll');
 }
 const rawStep=manager.step.bind(manager);manager.step=(state,dt)=>{
  const hit=animal.magicImpact;if(manager.entries.has(actorId)||hit&&state.elapsed>=guardianImpactTime(hit)&&state.elapsed-guardianImpactTime(hit)<.5)assertEnvironment();
  if(state.raid?.animals.includes(animal)){
   manager.before(actorId);restoreAnimalImpact(rig);captureAnimalImpact(rig,animal,state.elapsed);root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);applyAnimalPose(rig,animal,state.elapsed);if(!animal.magicDown)applyAnimalImpact(rig,animal,state.elapsed);root.rotation.y=animal.heading??0;if(animal.downHeading!==undefined&&(animal.fallRemaining>0||animal.recovery))root.rotation.y=animal.downHeading;else if(animal.path?.length){const next=animal.path[0];root.rotation.y=Math.atan2(next.x-animal.x,next.z-animal.z);}root.updateMatrixWorld(true);manager.render(actorId);if(!animal.magicDown)supportAnimalOnTerrain(rig,(x,z)=>nav.actorSurface(x,z));
  }
  return rawStep(state,dt);
 };
 return {actorId,manager,assertEnvironment,pose(){if(manager.entries.has(actorId)){manager.before(actorId);root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);manager.render(actorId);root.updateMatrixWorld(true);}const transform=node=>[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()],bones=[];model.traverse(node=>{if(node.isBone)bones.push({name:node.name,transform:transform(node)});});return {actorId,root:transform(root),model:transform(model),bones,active:manager.entries.has(actorId)};},dispose(){manager.dispose();structures?.dispose();model.traverse(o=>{if(o.isSkinnedMesh){o.geometry.dispose();o.material.dispose();o.skeleton.dispose();}});}};
}
