import {Vector3} from 'three';
import {BeastRecovery} from './beast-recovery.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// Samples an offline-retargeted clip without taking ownership of the native
// mixer. The physical manager retains collider ownership during this transition.
export class AuthoredBeastRecovery{
 constructor(binding,snapshot,{clip,surface,entryDuration=.65,playDuration=3.1,exitDuration=.3}){
  this.binding=binding;this.surface=surface;this.age=0;this.entryDuration=entryDuration;this.playDuration=playDuration;this.exitDuration=exitDuration;this.duration=entryDuration+playDuration+exitDuration;this.clipDuration=clip.duration;this.arms=[];this.v=new Vector3();this.lift=0;
  this.entries=[];binding.model.traverse(bone=>{if(bone.isBone)this.entries.push({bone,standingP:bone.position.clone(),standingQ:bone.quaternion.clone()});});
  this.samples=BeastRecovery.contactSamples(binding.model);
  binding.apply(snapshot);for(const e of this.entries){e.fallenP=e.bone.position.clone();e.fallenQ=e.bone.quaternion.clone();}
  this.entryClearance=Infinity;if(surface)for(const {mesh,index}of this.samples){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);this.entryClearance=Math.min(this.entryClearance,this.v.y-surface(this.v.x,this.v.z));}
  binding.restore();
  const byName=new Map(this.entries.map(e=>[e.bone.name,e]));this.tracks=clip.tracks.map(track=>{const split=track.name.lastIndexOf('.'),name=track.name.slice(0,split),property=track.name.slice(split+1),entry=byName.get(name);if(!entry||!['position','quaternion'].includes(property))throw Error('Invalid recovery channel '+track.name);return {entry,property,interpolant:track.createInterpolant()};});
  this.hip=binding.bones.get('Hips');const hipTrack=this.tracks.find(t=>t.entry.bone===this.hip&&t.property==='position');if(!hipTrack)throw Error('Recovery clip lacks hips');
  this.hipOffset=byName.get(this.hip.name).standingP.clone().sub(new Vector3().fromArray(hipTrack.interpolant.evaluate(clip.duration)));
 }
 apply(dt){
  this.age=Math.min(this.duration,this.age+Math.max(0,dt));const entry=smooth(this.age/this.entryDuration),exit=smooth((this.age-this.entryDuration-this.playDuration)/this.exitDuration),time=Math.max(0,Math.min(1,(this.age-this.entryDuration)/this.playDuration))*this.clipDuration;
  for(const e of this.entries){e.bone.position.copy(e.standingP);e.bone.quaternion.copy(e.standingQ);}
  for(const t of this.tracks){const value=t.interpolant.evaluate(time);t.entry.bone[t.property].fromArray(value);if(t.entry.bone===this.hip&&t.property==='position')this.hip.position.add(this.hipOffset);}
  for(const e of this.entries){e.bone.position.lerp(e.fallenP,1-entry).lerp(e.standingP,exit);e.bone.quaternion.slerp(e.fallenQ,1-entry).slerp(e.standingQ,exit);}
  const model=this.binding.model;model.updateMatrixWorld(true);let clearance=Infinity,correction=0;
  if(this.surface&&this.age>0){
   for(const {mesh,index}of this.samples){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);clearance=Math.min(clearance,this.v.y-this.surface(this.v.x,this.v.z));}
   // Interpolating two supported poses can lift their shared support away from
   // the ground. Correct both signs, retaining the exact physical entry pose
   // and smoothly settling its original clearance onto the authored floor.
   const target=Number.isFinite(this.entryClearance)?this.entryClearance*(1-entry)+.01*entry:.01;
   if(Number.isFinite(clearance))correction=target-clearance;
  }
  this.lift=correction;this.hip.getWorldPosition(this.v);this.v.y+=correction;this.hip.position.copy(this.hip.parent.worldToLocal(this.v));model.updateMatrixWorld(true);this.done=this.age>=this.duration;return this.done;
 }
 restore(){for(const e of this.entries){e.bone.position.copy(e.standingP);e.bone.quaternion.copy(e.standingQ);}this.binding.model.updateMatrixWorld(true);}
}
