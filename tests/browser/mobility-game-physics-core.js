import {Group,AnimationClip,AnimationMixer} from 'three';
import {createSimulation} from './mobility-worker-simulation-core.js';
import {loadTestRig} from './mobility-physics-rig.js';
import {loadTestClips} from './mobility-test-clips.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';
import {loadRecoveryClips} from '../../src/rendering/recovery-clips.js';
import {observeGameEvents} from '../../src/simulation/game.js';

export async function createGamePhysics({originalClips=false}={}){
 const chunkKeys=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)chunkKeys.push(`${x},${z}`);
 const simulation=await createSimulation({mangrove:true,chunkKeys}),{game,nav}=simulation.diagnosticWorld();let manager,stop;
 try{
  const animal=game.raid?.animals.find(a=>a.species==='hyena');if(!animal)throw Error('Hyena absent');
  const [R,model,recoveries,clips]=await Promise.all([beastPhysicsRuntime(),loadTestRig('hyena'),loadRecoveryClips(),originalClips?loadTestClips('hyena'):Promise.resolve([new AnimationClip('Walking',1,[]),new AnimationClip('Running',1,[])])]),root=new Group();root.add(model);root.position.set(animal.x,nav.field.surface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);
  const world={state:game,nav,objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,{model,mixer:new AnimationMixer(model),clips}]]),onError:error=>{throw error;}};
  manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;const events=[];stop=observeGameEvents(game,e=>events.push(JSON.stringify(e)));let i=0,activeSteps=0;const phases=new Set();
  return {
   step(){
    if(i===0||i===30)animal.magicImpact={at:game.elapsed,direction:{x:i===0?1:-1,y:-.2,z:.2},point:{x:animal.x,y:1,z:animal.z},origin:{x:animal.x-2,y:1,z:animal.z},intensity:1};
    const start=performance.now();simulation.advanceTick(1/60);const tickMs=performance.now()-start;
    manager.before(animal.id);root.position.set(animal.x,nav.field.surface(animal.x,animal.z),animal.z);root.updateMatrixWorld(true);manager.render(animal.id);root.updateMatrixWorld(true);
    const entry=manager.entries.get(animal.id);if(entry)activeSteps++;phases.add(animal.magicDown?.phase??'released');i++;
    return {tickMs,sample:JSON.stringify({elapsed:game.elapsed,x:animal.x,z:animal.z,heading:animal.heading,status:animal.status,path:animal.path,magicDown:animal.magicDown??null,pose:entry?Array.from(entry.actor.pose):null})};
   },
   state(){return {snapshot:simulation.state().snapshot,events:[...events],phases:[...phases],activeSteps,animalId:animal.id,network:game.mangroveNetwork};},
   dispose(){stop();manager.dispose();simulation.dispose();}
  };
 }catch(error){stop?.();manager?.dispose();simulation.dispose();throw error;}
}
export async function runGamePhysics(options={}){
 const session=await createGamePhysics(options);try{const samples=[],checkpoints=[];for(let i=0;i<900;i++){samples.push(session.step().sample);if(i===0||i===299||i===899)checkpoints.push(session.state().snapshot);}const {events,phases,activeSteps,animalId,network}=session.state();if(!['falling','rolling','recovering','released'].every(phase=>phases.includes(phase))||activeSteps<30)throw Error('Impact did not produce a physical fall');return {samples,checkpoints,events,phases,activeSteps,animalId,network};}finally{session.dispose();}
}
