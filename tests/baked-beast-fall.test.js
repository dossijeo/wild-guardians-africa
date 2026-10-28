import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Vector3,Quaternion} from 'three';
import {beastSkin} from './helpers/beast-skin.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BakedBeastFall} from '../src/rendering/baked-beast-fall.js';
import {BakedRagdollClip} from '../src/simulation/baked-ragdoll-clip.js';
const root=new URL('../public/content/guardian/ragdoll-fallback/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('falls.json',root))),bytes=fs.readFileSync(new URL('falls.bin',root)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
test('baked falls preserve the initial animated pose and bone lengths at translated rotated scale',()=>{
 assert.equal(meta.snapshotKind,'bone-world');
 for(const species of ['hyena','warthog','lion','buffalo','rhino']){
  const model=beastSkin(species);model.position.set(30,2,-20);model.rotation.y=.8;model.scale.setScalar(.9);
  const binding=new BeastRagdollBinding(model);binding.bones.get('LeftArm').rotation.x+=.3;model.updateMatrixWorld(true);
  const clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction==='side'),buffer);
  const initial=binding.entries.map(e=>({p:e.bone.getWorldPosition(new Vector3()),q:e.bone.getWorldQuaternion(new Quaternion()).normalize(),local:e.bone.position.clone()}));
  const fall=new BakedBeastFall(binding,clip,{surface:()=>2});fall.apply(0);
  for(let i=0;i<initial.length;i++){assert.ok(initial[i].p.distanceTo(binding.entries[i].bone.getWorldPosition(new Vector3()))<1e-6);assert.ok(initial[i].q.angleTo(binding.entries[i].bone.getWorldQuaternion(new Quaternion()).normalize())<1e-6);}
  for(const t of [.1,.5,1,clip.duration]){fall.apply(t);for(let i=1;i<initial.length;i++)assert.ok(initial[i].local.distanceTo(binding.entries[i].bone.position)<1e-9);assert.ok(Number.isFinite(fall.lift));}
  assert.ok(fall.hip.distanceTo(initial[0].p)>.2);fall.restore();
  for(let i=0;i<initial.length;i++)assert.ok(initial[i].p.distanceTo(binding.entries[i].bone.getWorldPosition(new Vector3()))<1e-6);
 }
});
test('caller can constrain horizontal trajectory without cancelling articulated playback',()=>{
 const model=beastSkin('hyena'),binding=new BeastRagdollBinding(model),clip=new BakedRagdollClip(meta.clips.find(c=>c.species==='hyena'&&c.direction==='side'),buffer);
 const fall=new BakedBeastFall(binding,clip,{clipPosition:(hip,start)=>{hip.x=start.x;hip.z=start.z;}});
 fall.apply(1);assert.ok(Math.abs(fall.hip.x-fall.initialHip.x)<1e-6);assert.ok(Math.abs(fall.hip.z-fall.initialHip.z)<1e-6);fall.restore();
});

test('all baked species reproduce clip bone rotations after entry and halfway through blend',()=>{
 for(const species of ['hyena','warthog','lion','buffalo','rhino']){
  const model=beastSkin(species);model.rotation.y=.8;model.updateMatrixWorld(true);
  const binding=new BeastRagdollBinding(model),clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction==='side'),buffer),fall=new BakedBeastFall(binding,clip);
  const values=new Float32Array(98),world=model.getWorldQuaternion(new Quaternion()).normalize();
  for(const time of [.09,.5,clip.duration]){
   clip.sample(time,values);fall.apply(time);const t=Math.min(1,time/.18),blend=t*t*(3-2*t);
   for(let i=0;i<binding.entries.length;i++){
    const target=new Quaternion().fromArray(values,i*7+3).premultiply(world).normalize();
    const expected=fall.entries[i].initialWorld.clone().slerp(target,blend),actual=binding.entries[i].bone.getWorldQuaternion(new Quaternion()).normalize();
    assert.ok(actual.angleTo(expected)<1e-5,`${species} bone ${i} at ${time}: rotation differs from baked clip`);
   }
  }
 }
});
