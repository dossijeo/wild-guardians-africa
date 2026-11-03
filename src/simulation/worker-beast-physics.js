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
import {BakedBeastFallbacks,loadBakedFalls} from '../rendering/baked-beast-fallbacks.js';

// Experimental registry; the shared Rapier world retains its existing capacity.
// Unknown bodies and missing obstacle data fail closed.
export async function createWorkerBeastPhysics(game,nav,{actorId,actorIds=actorId===undefined?[]:[actorId],structureTemplates=null,allowEmpty=false}={}){
 if(!Array.isArray(actorIds)||(!allowEmpty&&!actorIds.length)||new Set(actorIds).size!==actorIds.length)throw Error('Worker physics requires distinct initial animals');
 // Before the impact marker there is no Rapier body yet. Reconstruct the
 // required rigs from the checkpoint so the ordinary impact starts once.
 const pending=(game.raid?.animals??[]).filter(a=>a.magicImpact&&game.elapsed<guardianImpactTime(a.magicImpact));actorIds=[...new Set([...actorIds,...pending.map(a=>a.id)])];
 const animals=actorIds.map(id=>game.raid?.animals.find(a=>a.id===id));
 if(animals.some(a=>!a||!['hyena','lion','warthog','buffalo','rhino'].includes(a.species))||(game.raid?.animals??[]).some(a=>a.magicDown||a.magicImpact&&game.elapsed>=guardianImpactTime(a.magicImpact)&&game.elapsed-guardianImpactTime(a.magicImpact)<.5))throw Error('Worker physics requires supported animals without an active impact');
 async function loadAnimal(animal){const [model,clips]=await Promise.all([loadWorkerPhysicsRig(animal.species),loadWorkerPhysicsClips(animal.species)]);prepareAnimalModel(model,animal.species);const root=new Group();root.add(model);return {animal,root,rig:{model,mixer:new AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)}};}
 const [R,recoveries,falls,...loaded]=await Promise.all([beastPhysicsRuntime(),loadRecoveryClips(),loadBakedFalls(),...animals.map(loadAnimal)]);
 const ids=new Set(actorIds),world={state:game,nav,objects:new Map(loaded.map(x=>[x.animal.id,x.root])),mixers:new Map(loaded.map(x=>[x.animal.id,x.rig])),onError:error=>{throw error;}};
 const structures=structureTemplates===null?null:createWorkerStructureObjects(game,nav,structureTemplates);
 const manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;manager.baked=new BakedBeastFallbacks(world,falls,recoveries);
 let disposed=false,admitting=false;
 async function admit(id){
  if(disposed||admitting)throw Error('Worker physics admission unavailable');if(ids.has(id))return false;
  const animal=game.raid?.animals.find(a=>a.id===id);if(!animal||!['hyena','lion','warthog','buffalo','rhino'].includes(animal.species)||animal.magicDown||animal.magicImpact&&game.elapsed-guardianImpactTime(animal.magicImpact)<.5)throw Error('Cannot admit worker physics animal');
  admitting=true;try{const entry=await loadAnimal(animal);if(disposed){entry.rig.model.traverse(o=>{if(o.isSkinnedMesh){o.geometry.dispose();o.material.dispose();o.skeleton.dispose();}});throw Error('Worker physics disposed during admission');}loaded.push(entry);ids.add(id);world.objects.set(id,entry.root);world.mixers.set(id,entry.rig);return true;}finally{admitting=false;}
 }
 function assertEnvironment(targetId=null){
  for(const {animal} of loaded){
   const hit=animal.magicImpact;if(targetId!==animal.id&&!manager.entries.has(animal.id)&&!manager.baked.has(animal.id)&&!(hit&&game.elapsed-guardianImpactTime(hit)<.5))continue;
   if(structures)structures.sync(animal);
   else if(game.structures.some(s=>s.status==='intact'&&s.kind!=='wall'&&Math.hypot(s.x-animal.x,s.z-animal.z)<=10))throw Error('Worker physics lacks nearby structure geometry');
  }
  if(structures)for(const [id,object] of structures.objects)world.objects.set(id,object);
  if((game.raid?.animals??[]).some(a=>!ids.has(a.id)&&(a.magicDown||a.magicImpact&&game.elapsed-guardianImpactTime(a.magicImpact)<.5)))throw Error('Worker physics lacks another active ragdoll');
 }
 const rawStep=manager.step.bind(manager);manager.step=(state,dt)=>{
  if((state.raid?.animals??[]).some(a=>!ids.has(a.id)&&(a.magicDown||a.magicImpact&&state.elapsed-guardianImpactTime(a.magicImpact)<.5)))throw Error('Worker physics lacks another active ragdoll');
  if(loaded.some(({animal})=>{const hit=animal.magicImpact;return manager.entries.has(animal.id)||manager.baked.has(animal.id)||hit&&state.elapsed>=guardianImpactTime(hit)&&state.elapsed-guardianImpactTime(hit)<.5;}))assertEnvironment();
  for(const {animal,root,rig} of loaded)if(state.raid?.animals.includes(animal)){
   manager.before(animal.id);restoreAnimalImpact(rig);captureAnimalImpact(rig,animal,state.elapsed);root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);applyAnimalPose(rig,animal,state.elapsed);if(!animal.magicDown)applyAnimalImpact(rig,animal,state.elapsed);root.rotation.y=animal.heading??0;if(animal.downHeading!==undefined&&(animal.fallRemaining>0||animal.recovery))root.rotation.y=animal.downHeading;else if(animal.path?.length){const next=animal.path[0];root.rotation.y=Math.atan2(next.x-animal.x,next.z-animal.z);}root.updateMatrixWorld(true);manager.render(animal.id);if(!animal.magicDown)supportAnimalOnTerrain(rig,(x,z)=>nav.actorSurface(x,z));
  }
  return rawStep(state,dt);
 };
 function poses(){return loaded.map(({animal,root,rig})=>{
  const actorId=animal.id,model=rig.model,active=manager.entries.has(actorId)||manager.baked.has(actorId);if(active){manager.before(actorId);root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);manager.render(actorId);root.updateMatrixWorld(true);}const transform=node=>[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()],bones=[];model.traverse(node=>{if(node.isBone)bones.push({name:node.name,transform:transform(node)});});return {actorId,root:transform(root),model:transform(model),bones,active};
 });}
 return {get actorId(){return loaded[0]?.animal.id;},get actorIds(){return [...ids];},supports:id=>ids.has(id),admit,manager,assertEnvironment,pose:()=>poses()[0],poses,dispose(){disposed=true;manager.dispose();structures?.dispose();for(const {rig} of loaded)rig.model.traverse(o=>{if(o.isSkinnedMesh){o.geometry.dispose();o.material.dispose();o.skeleton.dispose();}});}};
}
