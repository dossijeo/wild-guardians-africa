import {Group,AnimationClip,AnimationMixer} from 'three';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';
import {loadTestRig} from './mobility-physics-rig.js';
import {loadRecoveryClips} from '../../src/rendering/recovery-clips.js';

export async function runPhysics({crowd=false,reconstruct=false}={}){
 const start=performance.now(),[R,model,recoveries,secondModel]=await Promise.all([beastPhysicsRuntime(),loadTestRig('hyena'),loadRecoveryClips(),crowd?loadTestRig('hyena'):null]);
 const root=new Group();root.add(model);root.position.set(20,0,30);root.updateMatrixWorld(true);
 const animal={id:'beast',species:'hyena',x:20,z:30,status:'attacking',hitsRemaining:8,heading:0,radius:.7,attackRemaining:1,path:[{x:21,z:30}],magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
 const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,{model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]}]]),onError:error=>{throw error;}};
 const actors=[{animal,root,model}];
 if(crowd){
  const other={...animal,id:'beast-2',x:21,z:30,path:[{x:20,z:30}],magicImpact:{at:10,direction:{x:-1,y:-.2,z:0},intensity:1}},otherRoot=new Group();otherRoot.add(secondModel);otherRoot.position.set(other.x,0,other.z);otherRoot.updateMatrixWorld(true);
  state.raid.animals.push(other);actors.push({animal:other,root:otherRoot,model:secondModel});world.objects.set(other.id,otherRoot);world.mixers.set(other.id,{model:secondModel,mixer:new AnimationMixer(secondModel),clips:[new AnimationClip('Walking',1,[])]});world.nav.propsAt=()=>[{slot:0,x:22,z:30,radius:.3}];
 }
 const manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;
 const initializationMs=performance.now()-start,samples=[],phases=new Set(),recoveriesUsed=new Set(),bones=[];for(const a of actors)a.model.traverse(node=>{if(node.isBone)bones.push(node);});let peerContacts=0,barrierContacts=0;
 try{
  const started=performance.now();
  for(let i=0;i<900;i++){
   state.elapsed+=1/60;if(i===30)animal.magicImpact={at:state.elapsed,direction:{x:-1,y:-.2,z:.2},intensity:1};
   manager.step(state,1/60);
   if(crowd&&manager.solver){const entries=[...manager.entries.values()],otherHandles=new Set((entries[1]?.actor.parts??[]).map(p=>p.body.collider(0).handle)),wall=manager.environment?.colliders.get('prop:0:22:30');for(const p of entries[0]?.actor.parts??[])manager.solver.world.contactPairsWith(p.body.collider(0),c=>{if(otherHandles.has(c.handle))peerContacts++;if(c.handle===wall?.handle)barrierContacts++;});}
   for(const a of actors){manager.before(a.animal.id);a.root.position.set(a.animal.x,0,a.animal.z);a.root.updateMatrixWorld(true);manager.render(a.animal.id);a.root.updateMatrixWorld(true);}
   const snapshots=actors.map(a=>{const item=a.animal,entry=manager.entries.get(item.id);phases.add(item.magicDown?.phase??'released');if(entry?.recovery)recoveriesUsed.add(entry.recovery.constructor.name);return {x:item.x,z:item.z,heading:item.heading,status:item.status,path:item.path,attackRemaining:item.attackRemaining,magicDown:item.magicDown?{...item.magicDown}:null,pose:entry?Array.from(entry.actor.pose):null};});
   const sample={elapsed:state.elapsed,actors:snapshots,boneMatrices:bones.flatMap(b=>b.matrixWorld.toArray())};
   if(reconstruct)sample.localPose={root:[...root.position.toArray(),...root.quaternion.toArray(),...root.scale.toArray()],bones:bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()])};
   samples.push(sample);
  }
  return {samples,phases:[...phases],recoveriesUsed:[...recoveriesUsed],boneCount:bones.length,peerContacts,barrierContacts,initializationMs,runMs:performance.now()-started};
 }finally{manager.dispose();}
}
