import {Group,AnimationMixer} from 'three';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../rendering/beast-combat-physics.js';
import {loadRecoveryClips} from '../rendering/recovery-clips.js';
import {prepareAnimalModel,animalGroundSamples,applyAnimalPose} from '../rendering/animal-actions.js';
import {restoreAnimalImpact,captureAnimalImpact,applyAnimalImpact} from '../rendering/animal-impact.js';
import {supportAnimalOnTerrain} from '../rendering/animal-terrain-support.js';
import {loadWorkerPhysicsRig} from './worker-physics-rig.js';
import {loadWorkerPhysicsGlb} from './worker-physics-glb.js';
import {createWorkerPhysicsRigBank} from './worker-physics-rig-bank.js';
import {loadWorkerPhysicsClips} from './worker-physics-clips.js';
import {guardianImpactTime} from './guardian-timing.js';
import {createWorkerStructureObjects} from './worker-structure-geometry.js';
import {BakedBeastFallbacks,loadBakedFalls} from '../rendering/baked-beast-fallbacks.js';

// Experimental registry; the shared Rapier world retains its existing capacity.
// Unknown bodies and missing obstacle data fail closed.
export async function createWorkerBeastPhysics(game,nav,{actorId,actorIds=actorId===undefined?[]:[actorId],structureTemplates=null,allowEmpty=false,checkpoint=null,shareSpeciesClips=false,shareSpeciesRigs=false,shareAdmissionSource=false}={}){
 if(checkpoint!==null){if(checkpoint.version!==1||!Array.isArray(checkpoint.actorIds)||!checkpoint.fall)throw Error('Invalid Worker physics checkpoint');actorIds=checkpoint.actorIds;}
 if(!Array.isArray(actorIds)||(!allowEmpty&&!actorIds.length)||new Set(actorIds).size!==actorIds.length)throw Error('Worker physics requires distinct initial animals');
 // Before the impact marker there is no Rapier body yet. Reconstruct the
 // required rigs from the checkpoint so the ordinary impact starts once.
 const pending=(game.raid?.animals??[]).filter(a=>a.magicImpact&&game.elapsed<guardianImpactTime(a.magicImpact));actorIds=[...new Set([...actorIds,...pending.map(a=>a.id)])];
 const animals=actorIds.map(id=>game.raid?.animals.find(a=>a.id===id));
 const checkpointIds=new Set(checkpoint?.fall?.entries?.map(e=>e.id)??[]);
 if(animals.some(a=>!a||!['hyena','lion','warthog','buffalo','rhino'].includes(a.species))||(game.raid?.animals??[]).some(a=>!checkpointIds.has(a.id)&&(a.magicDown||a.magicImpact&&game.elapsed>=guardianImpactTime(a.magicImpact)&&game.elapsed-guardianImpactTime(a.magicImpact)<.5)))throw Error('Worker physics requires supported animals without an active impact');
 const speciesClips=new Map(),rigBank=shareSpeciesRigs?createWorkerPhysicsRigBank():null;
 function clipsFor(species,glb=null){if(!shareSpeciesClips)return loadWorkerPhysicsClips(species,glb);let promise=speciesClips.get(species);if(!promise){promise=loadWorkerPhysicsClips(species,glb).catch(error=>{speciesClips.delete(species);throw error;});speciesClips.set(species,promise);}return promise;}
 async function loadAnimal(animal){if(!rigBank){const glb=shareAdmissionSource?await loadWorkerPhysicsGlb(animal.species):null,[modelResult,clipResult]=await Promise.allSettled([loadWorkerPhysicsRig(animal.species,glb),clipsFor(animal.species,glb)]);if(modelResult.status==='rejected')throw modelResult.reason;const model=modelResult.value;try{if(clipResult.status==='rejected')throw clipResult.reason;prepareAnimalModel(model,animal.species);const root=new Group();root.add(model);return {animal,root,rig:{model,mixer:new AnimationMixer(model),clips:clipResult.value,groundSamples:animalGroundSamples(model)}};}catch(error){try{releaseEntries([{rig:{model}}]);}catch{}throw error;}}const lease=await rigBank.acquire(animal.species),model=lease.model;try{const clips=await clipsFor(animal.species);prepareAnimalModel(model,animal.species);const root=new Group();root.add(model);return {animal,root,release:lease.release,rig:{model,mixer:new AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)}};}catch(error){try{lease.release();}catch{}throw error;}}
 function releaseEntries(entries){const resources=new Set();let failure=null;const attempt=fn=>{try{fn();}catch(error){failure??=error;}};for(const {rig,release} of entries)if(release)attempt(release);else rig.model.traverse(o=>{if(o.isSkinnedMesh){resources.add(o.geometry);resources.add(o.skeleton);for(const material of Array.isArray(o.material)?o.material:[o.material])resources.add(material);}});for(const resource of resources)if(resource)attempt(()=>resource.dispose());if(failure)throw failure;}
 const pendingLoads=[beastPhysicsRuntime(),loadRecoveryClips(),loadBakedFalls(),...animals.map(loadAnimal)];let results;
 const settled=await Promise.allSettled(pendingLoads),failure=settled.find(item=>item.status==='rejected');if(failure){try{releaseEntries(settled.slice(3).filter(item=>item.status==='fulfilled').map(item=>item.value));}catch{}try{rigBank?.dispose();}catch{}throw failure.reason;}results=settled.map(item=>item.value);
 const [R,recoveries,falls,...loaded]=results;
 const ids=new Set(actorIds),world={state:game,nav,objects:new Map(loaded.map(x=>[x.animal.id,x.root])),mixers:new Map(loaded.map(x=>[x.animal.id,x.rig])),onError:error=>{throw error;}};
 let structures=null,manager=null,loadedReleased=false;
 function releaseLoaded(){if(loadedReleased)return;loadedReleased=true;try{releaseEntries(loaded);}finally{rigBank?.dispose();}}
 try{
 structures=structureTemplates===null?null:createWorkerStructureObjects(game,nav,structureTemplates);
 manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;manager.baked=new BakedBeastFallbacks(world,falls,recoveries);
 if(checkpoint&&structures){for(const animal of animals)structures.sync(animal);for(const [id,object] of structures.objects)world.objects.set(id,object);}
 if(checkpoint)manager.restoreFall(checkpoint.fall);
 let disposed=false,admitting=false;
 async function admit(id){
  if(disposed||admitting)throw Error('Worker physics admission unavailable');if(ids.has(id))return false;
  const animal=game.raid?.animals.find(a=>a.id===id);if(!animal||!['hyena','lion','warthog','buffalo','rhino'].includes(animal.species)||animal.magicDown||animal.magicImpact&&game.elapsed-guardianImpactTime(animal.magicImpact)<.5)throw Error('Cannot admit worker physics animal');
  admitting=true;try{const entry=await loadAnimal(animal);if(disposed){try{releaseEntries([entry]);}catch{}throw Error('Worker physics disposed during admission');}loaded.push(entry);ids.add(id);world.objects.set(id,entry.root);world.mixers.set(id,entry.rig);return true;}finally{admitting=false;}
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
 function poses({activeOnly=false}={}){const result=[];for(const {animal,root,rig} of loaded){
  const actorId=animal.id,model=rig.model,physical=manager.entries.has(actorId)||manager.baked.has(actorId);let transition=!physical&&!!rig.recoveryExit;if(activeOnly&&!physical&&!transition)continue;if(physical||transition){manager.before(actorId);root.position.set(animal.x,nav.actorSurface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);manager.render(actorId);root.updateMatrixWorld(true);transition=!physical&&!!rig.recoveryExit;if(activeOnly&&!physical&&!transition)continue;}const transform=node=>[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()],bones=[];model.traverse(node=>{if(node.isBone)bones.push({name:node.name,transform:transform(node)});});result.push({actorId,root:transform(root),model:transform(model),bones,active:physical||transition,...(transition?{visualTransition:'recovery-exit'}:{})});
 }return result;}
 return {get actorId(){return loaded[0]?.animal.id;},get actorIds(){return [...ids];},supports:id=>ids.has(id),admit,manager,hasVisualTransition:()=>loaded.some(({animal,rig})=>game.raid?.animals?.includes(animal)&&!!rig.recoveryExit),assertEnvironment,checkpointFall(){if(!manager.canCheckpointFall())return null;return {version:1,actorIds:[...ids],fall:manager.checkpointFall()};},pose:()=>poses()[0],poses,dispose(){if(disposed)return;disposed=true;try{manager.dispose();}finally{try{structures?.dispose();}finally{releaseLoaded();}}}};
 }catch(error){try{manager?.dispose();}catch{}try{structures?.dispose();}catch{}try{releaseLoaded();}catch{}throw error;}
}
