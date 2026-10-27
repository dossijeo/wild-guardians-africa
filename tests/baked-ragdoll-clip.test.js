import {RAGDOLL_CONFIG,RAGDOLL_ROLL} from '../src/simulation/beast-ragdoll.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BakedRagdollClip} from '../src/simulation/baked-ragdoll-clip.js';
const root=new URL('../public/content/guardian/ragdoll-fallback/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('falls.json',root))),bytes=fs.readFileSync(new URL('falls.bin',root)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
test('all five current species have finite settled clips tied to exact source assets',()=>{
 assert.deepEqual(meta.config,{...RAGDOLL_CONFIG,solverIterations:24});assert.deepEqual(meta.rollConfig,{...RAGDOLL_ROLL,timeout:7});assert.equal(meta.contactMaskSha256,createHash('sha256').update(fs.readFileSync(new URL('../src/rendering/actor-contact-masks.js',import.meta.url))).digest('hex'));
 assert.equal(meta.clips.length,40);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
 for(const species of new Set(meta.clips.map(c=>c.species)))assert.deepEqual(meta.clips.filter(c=>c.species===species).map(c=>c.direction),['front','side','back','left','down','downBack','downSide','downLeft']);
 for(const clip of meta.clips){const source=fs.readFileSync(new URL("../public"+clip.source,import.meta.url));assert.equal(createHash("sha256").update(source).digest("hex"),clip.sourceSha256);assert.equal(clip.recoveryCandidateSha256,createHash('sha256').update(fs.readFileSync(new URL('../content/source/animations/stand-up/'+clip.species+'-candidate.json',import.meta.url))).digest('hex'));assert.equal(clip.settled,true);assert.ok(clip.rollStart>0&&clip.rollStart<clip.duration);assert.ok(Number.isFinite(clip.recoveryYaw));const instance=new BakedRagdollClip(clip,buffer);assert.ok(instance.values.every(Number.isFinite));assert.ok(instance.duration>1&&instance.duration<15);}
});
test('playback follows time at low FPS, clamps endpoints and maintains unit quaternions',()=>{
 for(const metadata of meta.clips){const clip=new BakedRagdollClip(metadata,buffer),out=new Float32Array(98),other=new Float32Array(98);
  for(const time of [-1,0,.013,.21,1.37,clip.duration,100]){
   assert.equal(clip.sample(time,out),out);assert.ok(out.every(Number.isFinite));for(let i=0;i<98;i+=7)assert.ok(Math.abs(Math.hypot(...out.subarray(i+3,i+7))-1)<1e-6);
   clip.sample(time,other);assert.deepEqual(out,other);
  }
  clip.sample(0,out);clip.sample(-1,other);assert.deepEqual(out,other);clip.sample(clip.duration,out);clip.sample(100,other);assert.deepEqual(out,other);
 }
});
test('truncated buffers and malformed outputs fail explicitly',()=>{
 assert.throws(()=>new BakedRagdollClip(meta.clips[0],new ArrayBuffer(4)),/Invalid/);
 const clip=new BakedRagdollClip(meta.clips[0],buffer);assert.throws(()=>clip.sample(NaN,new Float32Array(98)),/Invalid/);assert.throws(()=>clip.sample(0,new Float32Array(7)),/Invalid/);
});
