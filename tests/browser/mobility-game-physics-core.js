import {Group,AnimationClip,AnimationMixer} from 'three';
import {createSimulation} from './mobility-worker-simulation-core.js';
import {loadTestRig} from './mobility-physics-rig.js';
import {loadTestClips} from './mobility-test-clips.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';
import {loadRecoveryClips} from '../../src/rendering/recovery-clips.js';
import {observeGameEvents} from '../../src/simulation/game.js';

export async function createGamePhysics({originalClips=false,initialAnimation=false,traceBones=false,referenceRig=false}={}){
 const chunkKeys=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)chunkKeys.push(`${x},${z}`);
 const simulation=await createSimulation({mangrove:true,chunkKeys}),{game,nav}=simulation.diagnosticWorld();let manager,stop;
 try{
  const animal=game.raid?.animals.find(a=>a.species==='hyena');if(!animal)throw Error('Hyena absent');
  const real=referenceRig?await (async()=>{const [{GLTFLoader},{ANIMAL_ACTIONS}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('../../src/simulation/animal-actions-data.js')]);return new GLTFLoader().loadAsync(ANIMAL_ACTIONS.animals.hyena.url);})():null;
  const [R,model,recoveries,clips]=await Promise.all([beastPhysicsRuntime(),real?real.scene:loadTestRig('hyena'),loadRecoveryClips(),originalClips?(real?prepareAnimalClips(real.animations):loadTestClips('hyena')):Promise.resolve([new AnimationClip('Walking',1,[]),new AnimationClip('Running',1,[])])]),root=new Group();root.add(model);root.position.set(animal.x,nav.field.surface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);
  const bones=[];model.traverse(node=>{if(node.isBone)bones.push(node);});const rig={model,mixer:new AnimationMixer(model),clips};let initialPoseChanges=0;if(initialAnimation){if(!originalClips)throw Error('Initial pose needs original clips');prepareAnimalModel(model,'hyena');rig.groundSamples=animalGroundSamples(model);root.rotation.y=animal.heading??0;root.updateMatrixWorld(true);const before=bones.map(b=>b.quaternion.toArray());applyAnimalPose(rig,animal,game.elapsed);root.updateMatrixWorld(true);initialPoseChanges=bones.filter((b,i)=>b.quaternion.toArray().some((v,j)=>v!==before[i][j])).length;if(!initialPoseChanges)throw Error('Original animation did not change pose');}
  const world={state:game,nav,objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,rig]]),onError:error=>{throw error;}};
  manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;const events=[];stop=observeGameEvents(game,e=>events.push(JSON.stringify(e)));let i=0,activeSteps=0;const phases=new Set();
  return {
   step(){
    if(i===0||i===30)animal.magicImpact={at:game.elapsed,direction:{x:i===0?1:-1,y:-.2,z:.2},point:{x:animal.x,y:1,z:animal.z},origin:{x:animal.x-2,y:1,z:animal.z},intensity:1};
    const start=performance.now();simulation.advanceTick(1/60);const tickMs=performance.now()-start;
    manager.before(animal.id);root.position.set(animal.x,nav.field.surface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);manager.render(animal.id);root.updateMatrixWorld(true);
    const entry=manager.entries.get(animal.id);if(entry)activeSteps++;phases.add(animal.magicDown?.phase??'released');i++;
    return {tickMs,sample:JSON.stringify({elapsed:game.elapsed,x:animal.x,z:animal.z,heading:animal.heading,status:animal.status,path:animal.path,magicDown:animal.magicDown??null,pose:entry?Array.from(entry.actor.pose):null,...(traceBones?{boneMatrices:bones.flatMap(b=>b.matrixWorld.toArray())}:{})})};
   },
   state(){return {snapshot:simulation.state().snapshot,events:[...events],phases:[...phases],activeSteps,animalId:animal.id,network:game.mangroveNetwork,initialPoseChanges,boneCount:bones.length};},
   dispose(){stop();manager.dispose();simulation.dispose();}
  };
 }catch(error){stop?.();manager?.dispose();simulation.dispose();throw error;}
}
export async function runGamePhysics(options={}){
 const session=await createGamePhysics(options);try{const samples=[],checkpoints=[];for(let i=0;i<900;i++){samples.push(session.step().sample);if(i===0||i===299||i===899)checkpoints.push(session.state().snapshot);}const {events,phases,activeSteps,animalId,network,initialPoseChanges,boneCount}=session.state();if(!['falling','rolling','recovering','released'].every(phase=>phases.includes(phase))||activeSteps<30)throw Error('Impact did not produce a physical fall');return {samples,checkpoints,events,phases,activeSteps,animalId,network,initialPoseChanges,boneCount};}finally{session.dispose();}
}
