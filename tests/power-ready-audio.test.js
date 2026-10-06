import test from 'node:test';
import assert from 'node:assert/strict';
import {PowerReadyAudio} from '../src/audio/power-ready-audio.js';
import {AudioSystem} from '../src/audio/audio.js';
import * as Game from '../src/simulation/game.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const state=()=>({day:5,time:100,elapsed:100,pauses:[],result:null,cooldowns:{shield:2,growth:2,multiply:2}});
function fixture(){let clock=0;const calls=[],stopped=[];const audio=new PowerReadyAudio((id,opts)=>{const source={};calls.push({id,opts,source});return source;},source=>stopped.push(source),()=>clock);return {audio,calls,stopped,clock:t=>clock=t};}
test('real positive cooldown transitions group simultaneously ready spells into one UI cue',async()=>{
 const f=fixture(),s=state();f.audio.update(s);assert.equal(f.calls.length,0);
 s.elapsed+=2;s.cooldowns={shield:0,growth:0,multiply:0};const before=JSON.stringify(s);f.audio.update(s);await flush();
 assert.equal(JSON.stringify(s),before);assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'spirit_power_charge');assert.equal(f.calls[0].opts.bus,'ui');assert.ok(f.calls[0].opts.isCurrent());
 for(let i=0;i<100;i++)f.audio.update(s);assert.equal(f.calls.length,1);
 s.cooldowns.growth=90;f.audio.update(s);s.elapsed+=90;s.cooldowns.growth=0;f.audio.update(s);assert.equal(f.calls.length,2);f.audio.dispose();
});
test('load, replacement, rollback, locked spells and unchanged simulated time seed silently',()=>{
 const f=fixture(),s=state();s.cooldowns={shield:0,growth:0,multiply:0};f.audio.update(s);f.audio.update({...s});
 s.elapsed=1;f.audio.update(s);s.cooldowns.growth=1;f.audio.update(s);s.cooldowns.growth=0;f.audio.update(s);
 s.day=1;s.time=100;s.cooldowns={shield:1,growth:1,multiply:1};f.audio.update(s);s.elapsed+=1;s.cooldowns={shield:0,growth:0,multiply:0};f.audio.update(s);assert.equal(f.calls.length,0);
});
test('pauses, result, disposal, elapsed loading and recasting reject obsolete requests',async()=>{
 for(const invalid of [f=>f.s.pauses.push('hiring'),f=>f.s.result='defeat',f=>f.audio.dispose(),f=>f.clock(1),f=>f.s.cooldowns.growth=90]){
  const f=fixture();f.s=state();f.s.cooldowns={growth:1};f.audio.update(f.s);f.s.elapsed++;f.s.cooldowns.growth=0;f.audio.update(f.s);invalid(f);await flush();
  assert.equal(f.calls[0].opts.isCurrent(),false);assert.deepEqual(f.stopped,[f.calls[0].source]);
 }
});
test('native simulated Growth duration ending does not count as cooldown completion',()=>{
 const s=Game.newGame({seed:712});Game.resume(s,'intro');
 const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};Game.placeStructure(s,'center',{x:12,z:8},nav);s.day=5;s.time=100;const f=fixture();f.audio.update(s);
 Game.cast(s,'grow','growth',40,40,nav);f.audio.update(s);Game.tick(s,30,nav);f.audio.update(s);assert.equal(f.calls.length,0);assert.ok(Math.abs(s.cooldowns.growth-60)<1e-8);
 Game.tick(s,60.1,nav);f.audio.update(s);assert.equal(f.calls.length,1);assert.equal(s.cooldowns.growth,0);
});
test('AudioSystem stop/suspend and a suspended context release the observer',()=>{
 for(const method of ['stop','suspend','updateUnlocks']){
  const audio=new AudioSystem({sfx:1,music:0});let disposed=0;audio.powerReady={dispose(){disposed++;}};audio.context={state:'suspended',suspend(){}};
  audio[method](state());assert.equal(disposed,1);
 }
});
test('cooldown preparation shares one cold download/decode without playing or mutating gameplay',async()=>{
 let requests=0,decodes=0,resolveBytes;const bytes=new Promise(resolve=>resolveBytes=resolve),decoded={};
 const audio=new AudioSystem({sfx:0,music:0},{json:async()=>({items:[{id:'spirit_power_charge',audio:{url:'ready.opus'}}]}),bytes:()=>{requests++;return bytes;}});
 audio.context={state:'running',currentTime:0,decodeAudioData:async()=>{decodes++;return decoded;}};
 const s=state(),before=JSON.stringify(s);audio.updateUnlocks(s);await flush();
 for(let i=0;i<100;i++)audio.updateUnlocks(s);
 assert.equal(requests,1);assert.equal(decodes,0);assert.equal(audio.active.length,0);assert.equal(JSON.stringify(s),before);
 // A slow first fetch is completed during the cooldown, not at its edge.
 audio.context.currentTime=3;resolveBytes(new ArrayBuffer(1));await audio.powerReadyPreparation;
 assert.equal(decodes,1);assert.equal(await audio.buffer('ready.opus'),decoded);
 const ready=[];audio.sound=async(id,options)=>{ready.push({id,options,buffer:await audio.buffer('ready.opus')});return null;};
 s.elapsed+=2;s.cooldowns={shield:0,growth:0,multiply:0};audio.updateUnlocks(s);await flush();
 assert.equal(ready.length,1);assert.ok(ready[0].options.isCurrent());assert.equal(ready[0].buffer,decoded);assert.equal(requests,1);assert.equal(decodes,1);
});
test('preparation is lazy, cancels stale bank requests and throttles failed downloads',async()=>{
 let requests=0,resolveBank;const bank=new Promise(resolve=>resolveBank=resolve);
 const audio=new AudioSystem({sfx:0,music:0},{json:()=>bank,bytes:async()=>{requests++;throw Error('offline');}});
 audio.context={state:'running',currentTime:0,decodeAudioData:async()=>assert.fail('Unexpected decode')};
 const s=state();for(const blocked of [{...s,result:'defeat'},{...s,pauses:['hiring']},{...s,cooldowns:{}}])audio.preparePowerReadySound(blocked);
 assert.equal(audio.powerReadyPreparation,undefined);
 audio.preparePowerReadySound(s);const pending=audio.powerReadyPreparation;audio.stop();resolveBank({items:[{id:'spirit_power_charge',audio:{url:'ready.opus'}}]});await pending;assert.equal(requests,0);
 audio.preparePowerReadySound(s);await flush();assert.equal(requests,1);
 for(let i=0;i<100;i++)audio.preparePowerReadySound(s);await flush();assert.equal(requests,1);
 audio.context.currentTime=5;audio.preparePowerReadySound(s);await flush();assert.equal(requests,2);
 audio.context.state='suspended';audio.context.currentTime=10;audio.preparePowerReadySound(s);await flush();assert.equal(requests,2);
});
test('leaving during the cold download prevents decoding and clears its cache entry',async()=>{
 let resolveBytes,decodes=0;const bytes=new Promise(resolve=>resolveBytes=resolve);
 const audio=new AudioSystem({sfx:0,music:0},{json:async()=>({items:[{id:'spirit_power_charge',audio:{url:'ready.opus'}}]}),bytes:()=>bytes});
 audio.context={state:'running',currentTime:0,decodeAudioData:async()=>{decodes++;return {};}};
 audio.preparePowerReadySound(state());const pending=audio.powerReadyPreparation;await flush();assert.equal(audio.buffers.size,1);
 audio.stop();resolveBytes(new ArrayBuffer(1));await pending;await flush();assert.equal(decodes,0);assert.equal(audio.buffers.size,0);assert.equal(audio.powerReadyPreparation,null);assert.equal(audio.active.length,0);
});
