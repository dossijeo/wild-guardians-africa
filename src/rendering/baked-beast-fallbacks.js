import {BakedSolidContacts} from './baked-solid-contacts.js';
import {AuthoredBeastRecovery} from './authored-beast-recovery.js';
import {Vector3} from 'three';
import {BakedRagdollClip} from '../simulation/baked-ragdoll-clip.js';
import {BakedBeastFall} from './baked-beast-fall.js';
import {BeastRagdollBinding} from './beast-ragdoll-binding.js';
import {BeastRecovery} from './beast-recovery.js';
import {applyAnimalPose} from './animal-actions.js';
export async function loadBakedFalls(){const [manifest,response]=await Promise.all([fetch('/content/guardian/ragdoll-fallback/falls.json').then(r=>{if(!r.ok)throw Error('Fallback manifest unavailable');return r.json();}),fetch('/content/guardian/ragdoll-fallback/falls.bin')]);if(manifest.snapshotKind!=='bone-world'||!response.ok)throw Error('Invalid fallback bank');const bytes=await response.arrayBuffer();return new Map(manifest.clips.map(c=>[c.species+':'+c.direction,new BakedRagdollClip(c,bytes)]));}
export class BakedBeastFallbacks {
 constructor(world,clips,recoveryClips=new Map()){this.world=world;this.clips=clips;this.recoveryClips=recoveryClips;this.entries=new Map();this.v=new Vector3();}
 has(id){return this.entries.has(id);}
 start(animal){
  const w=this.world,data=w.mixers.get(animal.id),root=w.objects.get(animal.id);if(!data||!root||this.entries.size>=8&&!this.has(animal.id))return false;
  const d=animal.magicImpact.direction,h=animal.heading??0,dx=d.x*Math.cos(h)-d.z*Math.sin(h),dz=d.x*Math.sin(h)+d.z*Math.cos(h);
  const axis=Math.abs(dx)>Math.abs(dz)?(dx<0?'left':'side'):(dz<0?'back':'front'),direction=d.y<-.5?({front:'down',back:'downBack',side:'downSide',left:'downLeft'}[axis]):axis,clip=this.clips.get(animal.species+':'+direction);if(!clip)return false;
  const binding=new BeastRagdollBinding(data.model),previous=this.entries.get(animal.id);if(previous){if(previous.recovery){previous.recovery.age=0;previous.recovery.apply(previous.recoveryAge);}else previous.fall.apply(Math.max(0,w.state.elapsed-previous.at));}
  root.updateMatrixWorld(true);binding.capture();const hip=binding.entries[0].bone.getWorldPosition(new Vector3()),offset={x:hip.x-animal.x,z:hip.z-animal.z},last=hip.clone();
  const fall=new BakedBeastFall(binding,clip,{solidContacts:BakedSolidContacts.forAnimal(w,animal,binding,{peers:true}),surface:(x,z)=>w.nav.field.surface(x,z),clipPosition:point=>{if(w.nav.segmentClear&&!w.nav.segmentClear(last,point,Math.max(.8,animal.radius??.8))){point.x=last.x;point.z=last.z;}last.copy(point);}});
  this.entries.set(animal.id,{animal,data,root,binding,fall,offset,at:animal.magicImpact.impactAt??w.state.elapsed,recovery:null,recoveryAge:0,snapshot:new Float32Array(98)});
  animal.magicDown={phase:'falling',mode:'baked',since:w.state.elapsed,until:w.state.elapsed+clip.duration+3};animal.path=null;animal.attackRemaining=0;animal.hitApplied=true;if(animal.status==='attacking')animal.status='walking';return true;
 }
 step(state,dt){for(const [id,e] of this.entries){const a=e.animal;if(state.result||!state.raid?.animals.includes(a)||a.status==='gone'){this.release(id);continue;}
  if(a.magicDown)a.magicDown.until=Math.max(a.magicDown.until,state.elapsed+.5);
  if(e.recovery){e.recoveryAge+=dt;if(e.recoveryAge>=e.recovery.duration){e.recovery.age=0;e.recovery.apply(e.recovery.duration);const shift=e.recovery.horizontalCorrection;if(shift){a.x+=shift.x;a.z+=shift.z;}this.release(id);a.path=null;a.approach=null;a.destinationId=null;}continue;}
  const done=e.fall.apply(Math.max(0,state.elapsed-e.at));a.x=e.fall.hip.x-e.offset.x;a.z=e.fall.hip.z-e.offset.z;
  if(!done&&e.fall.clip.metadata.rollStart!==undefined&&state.elapsed-e.at>=e.fall.clip.metadata.rollStart)a.magicDown.phase='rolling';
  if(done){
   const clip=this.recoveryClips.get(a.species),authored=clip&&Number.isFinite(e.fall.clip.metadata.recoveryYaw);
   if(authored)e.binding.physicalSnapshot(e.snapshot);else e.fall.snapshot(e.snapshot);
   e.fall.restore();e.root.position.set(a.x,this.world.nav.field.surface(a.x,a.z),a.z);
   if(authored){const yaw=e.fall.clip.metadata.recoveryYaw;a.heading=(a.heading??0)+yaw;e.root.rotation.y+=yaw;}
   e.root.updateMatrixWorld(true);e.data.key=null;applyAnimalPose(e.data,a,state.elapsed);
   const options={surface:(x,z)=>this.world.nav.field.surface(x,z),solidContacts:e.fall.solidContacts};
   e.recovery=authored?new AuthoredBeastRecovery(e.binding,e.snapshot,{...options,clip}):new BeastRecovery(e.binding,null,{...options,fallenWorldPose:e.snapshot});a.magicDown.phase='recovering';
  }
 }}
 before(id){const e=this.entries.get(id);if(e?.recovery)e.recovery.restore();else e?.fall.restore();}
 render(id){const e=this.entries.get(id);if(!e)return;if(e.recovery){e.recovery.age=0;e.recovery.apply(e.recoveryAge);}else e.fall.apply(Math.max(0,this.world.state.elapsed-e.at));}
 release(id){const e=this.entries.get(id);if(!e)return;if(e.recovery)e.recovery.restore();else e.fall.restore();delete e.animal.magicDown;this.entries.delete(id);}
 dispose(){for(const id of this.entries.keys())this.release(id);}
}
