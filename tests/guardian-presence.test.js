import test from 'node:test';
import assert from 'node:assert/strict';
import {playGuardianPresence,playGuardianWorldCue} from '../src/audio/guardian-presence.js';
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){const voices=new Set(),stopped=[];return {voices,stopped,stopVoice(source){voices.delete(source);stopped.push(source);},async sound(id,options){if(!options.isCurrent()||voices.size>=2)return null;const source={id,onended(){voices.delete(source);}};voices.add(source);return source;}};}
test('dissolution replaces arrival while preserving spell voice within the two-voice limit',async()=>{
 const audio=fixture(),arrival=await playGuardianPresence(audio,'spirit_appear'),spell={id:'spell'};audio.voices.add(spell);
 const outro=await playGuardianPresence(audio,'spirit_disappear');assert.ok(outro);assert.deepEqual([...audio.voices],[spell,outro]);assert.deepEqual(audio.stopped,[arrival]);outro.onended();assert.deepEqual([...audio.voices],[spell]);
});
test('new arrival replaces dissolution and stale async requests cannot return later',async()=>{
 const audio=fixture(),pending=[];audio.sound=(id,options)=>new Promise(resolve=>pending.push({id,options,resolve}));
 const first=playGuardianPresence(audio,'spirit_appear'),second=playGuardianPresence(audio,'spirit_disappear');
 assert.equal(pending[0].options.isCurrent(),false);const stale={};pending[0].resolve(stale);assert.equal(await first,null);assert.ok(audio.stopped.includes(stale));
 const outro={};pending[1].resolve(outro);assert.equal(await second,outro);
 const third=playGuardianPresence(audio,'spirit_appear');assert.ok(audio.stopped.includes(outro));pending[2].resolve({});await third;
});
test('caller scene freshness remains authoritative',async()=>{
 const audio=fixture();assert.equal(await playGuardianPresence(audio,'spirit_appear',{isCurrent:()=>false}),null);assert.equal(audio.voices.size,0);
 await assert.rejects(playGuardianPresence(audio,'unknown'),/Invalid/);await flush();
});

test('rapid casts retain only latest launch and presence so final dissolution is admitted',async()=>{
 const audio=fixture();
 for(let i=0;i<6;i++){
  assert.ok(await playGuardianPresence(audio,'spirit_appear'));
  assert.ok(await playGuardianWorldCue(audio,'spirit_power_activate'));
  assert.equal(audio.voices.size,2);
 }
 assert.ok(await playGuardianPresence(audio,'spirit_disappear'));assert.equal(audio.voices.size,2);
 assert.deepEqual([...audio.voices].map(v=>v.id),['spirit_power_activate','spirit_disappear']);
});
