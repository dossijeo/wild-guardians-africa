import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workerPose} from '../src/rendering/worker-actions.js';
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url),'utf8'));
for(const [profile,library] of Object.entries(libraries))test(`${profile}: native action tracks are finite and preserve their last key`,()=>{
  const buffer=readFileSync(new URL('../public'+library.url,import.meta.url)),size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size));
  const binary=buffer.subarray(28+size);
  assert.equal(doc.animations.length,12);assert.equal(doc.skins[0].joints.length,28);
  for(const animation of doc.animations)for(const sampler of animation.samplers){
    const times=doc.accessors[sampler.input],values=doc.accessors[sampler.output],view=doc.bufferViews[times.bufferView];
    assert.equal(times.count,values.count);
    const offset=(view.byteOffset??0)+(times.byteOffset??0);let last=-Infinity;
    for(let i=0;i<times.count;i++){const t=binary.readFloatLE(offset+i*4);assert.ok(Number.isFinite(t)&&t>last);last=t;}
    assert.ok(Math.abs(last-library.actions[animation.name].duration)<1e-5);
    const valueView=doc.bufferViews[values.bufferView],n={VEC3:3,VEC4:4}[values.type];
    const start=(valueView.byteOffset??0)+(values.byteOffset??0);
    for(let i=0;i<values.count*n;i++)assert.ok(Number.isFinite(binary.readFloatLE(start+i*4)));
  }
});
test('Combined initial work shows planting followed by first watering for both age speeds',()=>{
  for(const profile of ['olderMale','youngFemale']){
    const speed=profile==='youngFemale'?1.5:1,library=libraries[profile];
    const worker={profile,status:'acting',actionRemaining:(7.2-3)/speed};
    assert.equal(workerPose(worker,{kind:'initial'},0,library).name,'Plant');
    worker.actionRemaining=(7.2-4.8)/speed;
    const pose=workerPose(worker,{kind:'initial'},0,library);assert.equal(pose.name,'Water');assert.ok(Math.abs(pose.time-1)<1e-5);
  }
});
test('Incapacitation retreats using slowed Run; first hit holds the native Fall instead',()=>{
  const library=libraries.olderMale;
  assert.equal(workerPose({profile:'olderMale',status:'incapacitated',incapacitated:true},null,1,library).name,'Run');
  assert.equal(workerPose({profile:'olderMale',status:'fleeing',fallRemaining:2},null,1,library).name,'Fall');
});
test('Carrying uses the original crate and idle uses the supplied resting pose',()=>{
  const library=libraries.olderFemale;
  assert.equal(workerPose({profile:'olderFemale',status:'carrying'},null,0,library).name,'Carry_Crate');
  assert.equal(workerPose({profile:'olderFemale',status:'idle'},null,0,library).name,'Idle');
});
