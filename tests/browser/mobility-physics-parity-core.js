import {Group,AnimationClip,AnimationMixer} from 'three';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';
import {loadTestRig} from './mobility-physics-rig.js';

export async function runPhysics(){
 const start=performance.now(),[R,model]=await Promise.all([beastPhysicsRuntime(),loadTestRig('hyena')]);
 const root=new Group();root.add(model);root.position.set(20,0,30);root.updateMatrixWorld(true);
 const animal={id:'beast',species:'hyena',x:20,z:30,status:'attacking',hitsRemaining:8,heading:0,radius:.7,attackRemaining:1,path:[{x:21,z:30}],magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
 const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,{model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]}]]),onError:error=>{throw error;}};
 const manager=new BeastCombatPhysics(world,R),initializationMs=performance.now()-start,samples=[],phases=new Set();
 try{
  const started=performance.now();
  for(let i=0;i<480;i++){
   state.elapsed+=1/60;if(i===30)animal.magicImpact={at:state.elapsed,direction:{x:-1,y:-.2,z:.2},intensity:1};
   manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);
   const entry=manager.entries.get(animal.id);phases.add(animal.magicDown?.phase??'released');
   samples.push({elapsed:state.elapsed,x:animal.x,z:animal.z,heading:animal.heading,status:animal.status,path:animal.path,attackRemaining:animal.attackRemaining,magicDown:animal.magicDown?{...animal.magicDown}:null,pose:entry?Array.from(entry.actor.pose):null});
  }
  return {samples,phases:[...phases],initializationMs,runMs:performance.now()-started};
 }finally{manager.dispose();}
}
