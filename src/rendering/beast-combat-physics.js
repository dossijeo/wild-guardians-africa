import {BakedSolidContacts} from './baked-solid-contacts.js';
import {loadRecoveryClips} from './recovery-clips.js';
import {BakedBeastFallbacks,loadBakedFalls} from './baked-beast-fallbacks.js';
import {guardianImpactTime} from '../simulation/guardian-timing.js';
import {Vector3,Quaternion} from 'three';
import {BeastPhysicsEnvironment} from './beast-physics-environment.js';
import {BeastRagdollSolver} from '../simulation/beast-ragdoll.js';
import {BeastRagdollBinding} from './beast-ragdoll-binding.js';
import {BeastRecovery} from './beast-recovery.js';
import {AuthoredBeastRecovery} from './authored-beast-recovery.js';
import {applyAnimalPose} from './animal-actions.js';
import {ATTACK} from '../simulation/guardian-combat.js';
let initialization;
export async function beastPhysicsRuntime(){initialization??=import('@dimforge/rapier3d-compat').then(async({default:R})=>{await R.init();return R;});return initialization;}

// Simulation calls step before raid/worker AI; rendering only samples the poses.
// Bounded to three articulated actors, with no physical world while inactive.
export class BeastCombatPhysics{
 constructor(world,R){this.world=world;this.R=R;this.entries=new Map();this.solver=null;this.environment=null;this.accumulator=0;this.seen=new Map();this.v=new Vector3();this.stats={active:0,physicsMs:0,recoveryMs:0,rejected:0,startMs:0,maxStepMs:0,solverMs:0,solverSteps:0,bindingMs:0,recoverySetupMs:0,creationMs:0,lastCreation:null};world.nav.beastPhysics=this;}
 static async create(world){
  const R=await beastPhysicsRuntime();
  // Compile the articulated/contact path and select skin support vertices during
  // loading, before an input-triggered hit can pay the cold WASM cost.
  for(const rig of await world.animalPreload?.spares()??[]){
   BeastRecovery.prewarm(rig.model);
   const binding=new BeastRagdollBinding(rig.model),pose=binding.capture(),colliders=binding.colliders(),solver=new BeastRagdollSolver(R);
   try{solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});solver.add('warm',{pose,colliders,scale:rig.model.scale.x});for(let i=0;i<120;i++){solver.step();if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));}}finally{solver.dispose();}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const [clips,recoveries]=await Promise.all([loadBakedFalls(),loadRecoveryClips()]),manager=new BeastCombatPhysics(world,R);manager.recoveryClips=recoveries;manager.baked=new BakedBeastFallbacks(world,clips,recoveries);return manager;
 }
 start(animal){
  const started=performance.now();const w=this.world,data=w.mixers.get(animal.id),root=w.objects.get(animal.id);if(!data||!root)return false;
  if(this.baked?.has(animal.id))return this.baked.start(animal);
  const previous=this.entries.get(animal.id);
  if(previous&&!previous.recovery){
   previous.actor.roll=null;previous.rolling=false;previous.settledAt=null;animal.magicDown.phase='falling';
   previous.solver.impulse(animal.id,{direction:animal.magicImpact.direction,intensity:animal.magicImpact.intensity,mass:ATTACK.profiles[animal.species].mass});
   previous.hitAt=animal.magicImpact.impactAt??-Infinity;previous.actor.age=0;previous.settledAt=null;animal.magicDown.since=w.state.elapsed;animal.magicDown.until=w.state.elapsed+9;return true;
  }
  if(previous?.recovery){
   // Sample get-up at simulation time, even when no frame was rendered between
   // two ticks. Capture before restoring the authored pose: otherwise a hit
   // during get-up visibly snaps the animal upright before launching it again.
   const recovery=previous.recovery;recovery.age=0;recovery.apply(previous.recoveryAge);
   try{
    const binding=new BeastRagdollBinding(data.model),pose=binding.capture(),colliders=binding.colliders();
    const hip=binding.entries[0].bone.getWorldPosition(this.v),offset={x:hip.x-animal.x,z:hip.z-animal.z};
    const actor=previous.solver.add(animal.id,{pose,colliders,scale:data.model.scale.x,mass:ATTACK.profiles[animal.species].mass,direction:animal.magicImpact.direction,intensity:animal.magicImpact.intensity,heading:animal.heading??0});
    Object.assign(previous,{binding,actor,offset,recovery:null,recoveryAge:0,accumulator:0,hitAt:animal.magicImpact.impactAt??-Infinity,settledAt:null});
    animal.magicDown={phase:'falling',since:w.state.elapsed,until:w.state.elapsed+9};
    this.stats.startMs=performance.now()-started;return true;
   }finally{recovery.restore();}
  }
  if(this.entries.size>=3){this.stats.rejected++;return this.baked?.start(animal)??false;}
  root.updateMatrixWorld(true);const binding=new BeastRagdollBinding(data.model),pose=binding.capture(),captured=performance.now(),colliders=binding.colliders(),fitted=performance.now(),solver=this.solver??=new BeastRagdollSolver(this.R);
  this.environment??=new BeastPhysicsEnvironment(w,solver);
  try{
   this.environment.sync([...this.entries.values()].map(e=>e.animal).concat(animal));
   const environmentReady=performance.now(),hit=animal.magicImpact,actor=solver.add(animal.id,{pose,colliders,scale:data.model.scale.x,mass:ATTACK.profiles[animal.species].mass,direction:hit.direction,intensity:hit.intensity,heading:animal.heading??0});
   const bodiesReady=performance.now();this.stats.lastCreation={species:animal.species,captureMs:captured-started,colliderFitMs:fitted-captured,environmentMs:environmentReady-fitted,bodiesMs:bodiesReady-environmentReady};
   const hip=binding.entries[0].bone.getWorldPosition(new Vector3()),offset={x:hip.x-animal.x,z:hip.z-animal.z};
   animal.magicDown={phase:'falling',since:w.state.elapsed,until:w.state.elapsed+9};animal.path=null;animal.attackRemaining=0;animal.hitApplied=true;if(animal.status==='attacking')animal.status='walking';
   this.entries.set(animal.id,{animal,data,root,binding,solver,actor,offset,accumulator:0,hitAt:animal.magicImpact.impactAt??-Infinity,settledAt:null,recovery:null});this.stats.startMs=performance.now()-started;return true;
  }catch(error){solver.remove(animal.id);if(!this.entries.size){solver.dispose();this.solver=null;this.environment=null;}throw error;}
 }
 step(state,dt){
  const started=performance.now();this.stats.recoveryFollowMs=0;this.stats.solverMs=this.stats.solverSteps=this.stats.bindingMs=this.stats.recoverySetupMs=this.stats.creationMs=0;
  for(const id of this.seen.keys())if(!state.raid?.animals.some(a=>a.id===id))this.seen.delete(id);
  for(const animal of state.raid?.animals??[]){
   if(animal.magicDown&&!this.entries.has(animal.id)&&!this.baked?.has(animal.id))delete animal.magicDown;
   const hit=animal.magicImpact;if(hit&&state.elapsed>=guardianImpactTime(hit)&&state.elapsed-guardianImpactTime(hit)<.5&&this.seen.get(animal.id)!==hit.at){if(!this.world.mixers.has(animal.id))continue;this.seen.set(animal.id,hit.at);try{const creation=performance.now();this.start(animal);this.stats.creationMs+=performance.now()-creation;}catch(error){this.world.onError?.(error);}}
  }
  // All live actors advance once on the same clock and exchange contact forces.
  if(this.solver?.actors.size){
   let firstHit=Infinity;for(const e of this.entries.values())firstHit=Math.min(firstHit,e.hitAt);
   this.accumulator+=Math.min(dt,Math.max(0,state.elapsed-firstHit));
   const followStarted=performance.now();
   for(const e of this.entries.values())if(e.recovery){e.kinematicStart.set(e.actor.pose);e.recovery.age=0;e.recovery.apply(Math.min(e.recovery.duration,e.recoveryAge+dt));e.binding.physicalSnapshot(e.kinematicPose);e.recovery.restore();}
   this.stats.recoveryFollowMs+=performance.now()-followStarted;
   while(this.accumulator>=1/60){
    const followStep=performance.now(),weight=dt>0?Math.max(0,Math.min(1,(dt-this.accumulator+1/60)/dt)):1;
    for(const [id,e] of this.entries)if(e.recovery)this.solver.follow(id,e.kinematicPose,e.kinematicStart,weight);
    this.stats.recoveryFollowMs+=performance.now()-followStep;
    this.solver.step();this.stats.solverMs+=this.solver.stats.stepMs;this.stats.solverSteps++;this.accumulator-=1/60;
   }
  }
  for(const [id,e] of this.entries){
   if(!state.raid?.animals.includes(e.animal)||e.animal.status==='gone'||state.result){this.release(id);continue;}
   const a=e.animal;
   // Physical roll + authored recovery can outlast the initial impact timeout.
   // Refresh the watchdog while this manager still owns the body, so raid AI
   // never resumes navigation or attacks underneath an active simulation.
   if(a.magicDown)a.magicDown.until=Math.max(a.magicDown.until,state.elapsed+.5);
   if(e.recovery){e.recoveryAge=Math.min(e.recovery.duration,e.recoveryAge+dt);if(e.recoveryAge>=e.recovery.duration){e.recovery.age=0;e.recovery.apply(e.recovery.duration);const shift=e.recovery.horizontalCorrection;if(shift){a.x+=shift.x;a.z+=shift.z;}e.recovery.restore();this.release(id);a.path=null;a.approach=null;a.destinationId=null;}continue;}
   const bindingStarted=performance.now();
   e.binding.restore();e.binding.apply(e.actor.pose);const hip=e.binding.entries[0].bone.getWorldPosition(this.v);a.x=hip.x-e.offset.x;a.z=hip.z-e.offset.z;this.stats.bindingMs+=performance.now()-bindingStarted;
   if(e.actor.settled){e.settledAt??=e.actor.age;}else e.settledAt=null;
   if(e.rolling&&!e.actor.roll.done)continue;
   if(e.rolling||e.actor.age>5||e.settledAt!==null&&e.actor.age-e.settledAt>.3){
    const recoveryStarted=performance.now();
    e.binding.restore();e.root.position.set(a.x,this.world.nav.field.surface(a.x,a.z),a.z);e.root.updateMatrixWorld(true);e.data.key=null;applyAnimalPose(e.data,a,state.elapsed);
    const clip=this.recoveryClips?.get(a.species),options={surface:(x,z)=>this.world.nav.field.surface(x,z)};
    if(clip&&!e.rolling){
     const preview=new AuthoredBeastRecovery(e.binding,e.actor.pose,{...options,clip}),target=new Float32Array(98);preview.apply(preview.entryDuration);e.binding.physicalSnapshot(target);preview.restore();
     const orientation=new Quaternion().fromArray(target,3).normalize(),fallenAxis=new Vector3(0,1,0).applyQuaternion(new Quaternion().fromArray(e.actor.pose,3)),targetAxis=new Vector3(0,1,0).applyQuaternion(orientation);
     // Preserve the fallen head-to-feet direction. Reorient the future standing
     // heading, rather than somersaulting the body to match its pre-hit heading.
     if(Math.hypot(fallenAxis.x,fallenAxis.z)>.25&&Math.hypot(targetAxis.x,targetAxis.z)>.25){const yaw=Math.atan2(fallenAxis.x,fallenAxis.z)-Math.atan2(targetAxis.x,targetAxis.z);a.heading=(a.heading??0)+yaw;e.root.rotation.y+=yaw;e.root.updateMatrixWorld(true);orientation.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw));}
     e.solver.rollTo(id,orientation);e.rolling=true;a.magicDown.phase='rolling';continue;
    }
    const rollFailed=e.rolling&&e.actor.roll.timedOut;this.stats.rollFailures=(this.stats.rollFailures??0)+(rollFailed?1:0);this.stats.lastRoll=e.actor.roll?{seconds:e.actor.roll.age,error:e.actor.roll.error,speed:e.actor.roll.speed,timedOut:rollFailed}:null;
    e.recovery=clip&&!rollFailed?new AuthoredBeastRecovery(e.binding,e.actor.pose,{...options,clip,solidContacts:BakedSolidContacts.forAnimal(this.world,a,e.binding)}):new BeastRecovery(e.binding,e.actor.pose,options);e.rolling=false;e.recoveryAge=0;e.kinematicPose=new Float32Array(98);e.kinematicStart=new Float32Array(98);e.solver.makeKinematic(id);a.magicDown.phase='recovering';this.stats.recoverySetupMs+=performance.now()-recoveryStarted;
   }
  }
  this.baked?.step(state,dt);this.stats.bakedActive=this.baked?.entries.size??0;
  this.stats.kinematic=0;for(const e of this.entries.values())if(e.recovery)this.stats.kinematic++;this.stats.active=this.entries.size;this.stats.physicsMs=performance.now()-started;this.stats.maxStepMs=Math.max(this.stats.maxStepMs,this.stats.physicsMs);
 }
 before(id){this.baked?.before(id);const e=this.entries.get(id);if(e?.recovery)e.recovery.restore();else e?.binding.restore();}
 render(id){this.baked?.render(id);const e=this.entries.get(id);if(!e)return;if(e.recovery){const start=performance.now();e.recovery.age=0;e.recovery.apply(e.recoveryAge);this.stats.recoveryMs+=performance.now()-start;}else e.binding.apply(e.actor.pose);}
 release(id){const e=this.entries.get(id);if(!e)return;e.recovery?.restore();e.binding.restore();e.solver.remove(id);delete e.animal.magicDown;this.entries.delete(id);if(!this.entries.size){this.solver.dispose();this.solver=null;this.environment=null;this.accumulator=0;}else this.environment.sync([...this.entries.values()].map(e=>e.animal));}
 dispose(){this.baked?.dispose();for(const id of this.entries.keys())this.release(id);if(this.world.nav.beastPhysics===this)delete this.world.nav.beastPhysics;this.seen.clear();}
}
