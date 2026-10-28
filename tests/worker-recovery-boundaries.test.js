import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,AnimationMixer,LoopOnce,Vector3,Quaternion} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../tools/prepare_watering_emitters.mjs';
import {decodeRecoveryClips} from '../src/rendering/recovery-clips.js';
const libraries=JSON.parse(fs.readFileSync('public/content/worker-actions.json'));
const metadata=JSON.parse(fs.readFileSync('content/manifests/worker-recovery.json'));
const packed=fs.readFileSync('public/content/guardian/worker-recovery/recovery.bin');
const clips=decodeRecoveryClips(JSON.parse(fs.readFileSync('public/content/guardian/worker-recovery/recovery.json')),packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
for(const [profile,library] of Object.entries(libraries))test(profile+': recovery joins Fall and translated Idle without bone jumps',async()=>{
 const g=await new GLTFLoader().parseAsync(rigForSampling(fs.readFileSync('public'+library.url)),'');
 const mixer=new AnimationMixer(g.scene),clip=clips.get(profile),spec=metadata.profiles[profile];
 assert.equal(spec.targetSha256,library.sha256);
 const bones=[];g.scene.traverse(n=>{if(n.isBone)bones.push(n);});
 function pose(c,t){mixer.stopAllAction();const action=mixer.clipAction(c).reset().setLoop(LoopOnce,1).play();action.paused=true;action.clampWhenFinished=true;action.time=t;mixer.update(0);g.scene.updateMatrixWorld(true);return bones.map(n=>({p:n.getWorldPosition(new Vector3()),q:n.getWorldQuaternion(new Quaternion()).normalize()}));}
 function compare(a,b,offset=new Vector3()){for(let i=0;i<a.length;i++){assert.ok(a[i].p.distanceTo(b[i].p.clone().add(offset))<2e-5,bones[i].name+' position');assert.ok(a[i].q.angleTo(b[i].q)<2e-5,bones[i].name+' rotation');}}
 const fall=g.animations.find(c=>c.name==='Fall');compare(pose(clip,0),pose(fall,fall.duration));
 compare(pose(clip,clip.duration),pose(g.animations.find(c=>c.name==='Idle'),0),new Vector3().fromArray(spec.finalOffset));
 assert.equal(clip.duration,spec.duration);assert.ok(clip.tracks.every(t=>t.values.every(Number.isFinite)));
});
