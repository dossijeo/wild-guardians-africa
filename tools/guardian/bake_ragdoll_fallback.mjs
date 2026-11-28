// Offline articulated fallback clips from the same solver and current source rigs.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import R from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion,AnimationClip} from 'three';
import {AuthoredBeastRecovery} from '../../src/rendering/authored-beast-recovery.js';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRagdollSolver,RAGDOLL_CONFIG,RAGDOLL_ROLL,RAGDOLL_LINKS} from '../../src/simulation/beast-ragdoll.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {ATTACK} from '../../src/simulation/guardian-combat.js';
await R.init();
const output=process.argv[2];if(!output)throw Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const chunks=[],clips=[];let offset=0;
const position=new Vector3(),rotation=new Quaternion();
function boneFrame(binding,physical){binding.apply(physical);const values=[];for(const entry of binding.entries){entry.bone.getWorldPosition(position);entry.bone.getWorldQuaternion(rotation).normalize();values.push(position.x,position.y,position.z,rotation.x,rotation.y,rotation.z,rotation.w);}binding.restore();return values;}
for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
 const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[species].url),binding=new BeastRagdollBinding(model,{species}),pose=binding.capture(),colliders=binding.colliders();
 const recoveryData=JSON.parse(fs.readFileSync('content/source/animations/stand-up/'+species+'-candidate.json')),recoveryClip=AnimationClip.parse(recoveryData.clip);
 const source=fs.readFileSync('public'+ANIMAL_ACTIONS.animals[species].url),sourceSha256=createHash('sha256').update(source).digest('hex');
 for(const [directionName,direction] of [['front',{x:0,y:0,z:1}],['side',{x:1,y:0,z:0}],['back',{x:0,y:0,z:-1}],['left',{x:-1,y:0,z:0}],['down',{x:0,y:-.8,z:1}],['downBack',{x:0,y:-.8,z:-1}],['downSide',{x:1,y:-.8,z:0}],['downLeft',{x:-1,y:-.8,z:0}]]){
  const solver=new BeastRagdollSolver(R,{solverIterations:24});solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
  const actor=solver.add(species,{pose,colliders,mass:ATTACK.profiles[species].mass,direction}),frames=boneFrame(binding,actor.pose);let quiet=0,ended=false;
  for(let i=1;i<=480;i++){solver.step();quiet=actor.settled?quiet+1:0;if(i%3===0){frames.push(...boneFrame(binding,actor.pose));if(quiet>=18){ended=true;break;}}}
  if(!ended)throw Error('Unsettled fallback '+species+'/'+directionName);
  const rollStart=(frames.length/98-1)/20,preview=new AuthoredBeastRecovery(binding,actor.pose,{clip:recoveryClip,surface:()=>0}),target=new Float32Array(98);
  preview.apply(preview.entryDuration);binding.physicalSnapshot(target);preview.restore();
  const orientation=new Quaternion().fromArray(target,3).normalize(),fallenAxis=new Vector3(0,1,0).applyQuaternion(new Quaternion().fromArray(actor.pose,3)),targetAxis=new Vector3(0,1,0).applyQuaternion(orientation);
  const recoveryYaw=Math.hypot(fallenAxis.x,fallenAxis.z)>.25&&Math.hypot(targetAxis.x,targetAxis.z)>.25?Math.atan2(fallenAxis.x,fallenAxis.z)-Math.atan2(targetAxis.x,targetAxis.z):0;
  // Flat-ground baking retains the gentler contact-tested roll. Live uneven
  // terrain needs the higher default; baking it causes excessive wall offsets.
  orientation.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),recoveryYaw));solver.rollTo(species,orientation,{timeout:7,supportTorque:1.8});
  for(let i=1;i<=423;i++){solver.step();if(i%3===0){frames.push(...boneFrame(binding,actor.pose));if(actor.roll.done)break;}}
  if(!actor.roll.done||actor.roll.timedOut)throw Error('Failed supine roll '+species+'/'+directionName+' '+JSON.stringify({age:actor.roll.age,error:actor.roll.error,speed:actor.roll.speed,yaw:recoveryYaw}));

  const values=new Float32Array(frames);if(!values.every(Number.isFinite))throw Error('Invalid baked pose');
  const bytes=Buffer.from(values.buffer);chunks.push(bytes);
  clips.push({species,direction:directionName,sourceSha256,source:ANIMAL_ACTIONS.animals[species].url,byteOffset:offset,floatCount:values.length,frames:values.length/98,sampleRate:20,duration:(values.length/98-1)/20,parents:pose.parents,initialHip:frames.slice(0,3),settled:true,rollStart,recoveryYaw,recoverySourceSha256:recoveryData.sourceSha256,recoveryCandidateSha256:createHash('sha256').update(fs.readFileSync('content/source/animations/stand-up/'+species+'-candidate.json')).digest('hex')});offset+=bytes.length;solver.dispose();
 }
 model.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
}
const bytes=Buffer.concat(chunks);fs.writeFileSync(output+'/falls.bin',bytes);fs.writeFileSync(output+'/falls.json',JSON.stringify({version:2,snapshotKind:'bone-world',scope:'Offline flat-ground rest-pose falls followed by physical supine rolls. Runtime collision adaptation and visual acceptance still required.',frameStride:98,bones:RAGDOLL_LINKS.map(r=>r[0]),config:{...RAGDOLL_CONFIG,solverIterations:24},rollConfig:{...RAGDOLL_ROLL,timeout:7,supportTorque:1.8},contactMaskSha256:createHash('sha256').update(fs.readFileSync('src/rendering/actor-contact-masks.js')).digest('hex'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),clips},null,2)+'\n');console.log({clips:clips.length,bytes:bytes.length,durations:clips.map(c=>[c.species,c.direction,c.duration])});
