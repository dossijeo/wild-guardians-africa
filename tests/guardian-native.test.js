import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {guardianPose,GESTURE_MIN_SECONDS,OrnamentPhysics} from '../src/ui/guardian-native.js';
const source=readFileSync(new URL('../references/extracted/Guardian_Tutorial_V8_Avatar_y_Manos_3D/script-0.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/guardian-native.json',import.meta.url),'utf8'));
test('Extracted renderer and native source retain their registered hashes',()=>{
  for(const [file,hash] of [[manifest.source,manifest.sourceSha256],['src/ui/guardian-native.js',manifest.moduleSha256]]){
    assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash);
  }
});
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const clamp ='),source.indexOf('const reducedMotion ='))+
  'let logicalTime=0,restIntensity=1;'+source.slice(source.indexOf('const hump='),source.indexOf('function advancePhases('))+
  'this.sample=(state,age,duration,time,rest)=>{logicalTime=time;restIntensity=rest;return enhancedPose(state,age,duration);};',context);
for(const gesture of manifest.gestures)test(`Native ${gesture} curves match the original V8 source at every sampled phase`,()=>{
  const duration=GESTURE_MIN_SECONDS[gesture];
  for(const rest of [0,.5,1])for(let i=0;i<=24;i++){
    const age=duration*i/24,time=age+17.3;
    const actual=guardianPose(gesture,age,duration,time,rest),expected=context.sample(gesture,age,duration,time,rest);
    assert.deepEqual(actual,{...expected});
    for(const [key,value] of Object.entries(actual))if(key!=='state')assert.ok(Number.isFinite(value));
  }
});
test('Native ornament springs remain finite across reading, rest and gesture changes',()=>{
  const physics=new OrnamentPhysics();
  for(let i=0;i<10000;i++){
    const t=i/60,q=guardianPose(manifest.gestures[Math.floor(i/600)%8],t%6.8,6.8,t);
    physics.step(t,1/60,q.roll,q.yaw,q.reveal,1,1);
    assert.ok([...physics.angles,...physics.offsets].every(Number.isFinite));
    assert.ok(physics.angles.every(a=>Math.abs(a)<=.155));
  }
  physics.reset();assert.deepEqual(physics.angles,[0,0,0,0]);assert.deepEqual(physics.offsets,[0,0,0,0]);
});
