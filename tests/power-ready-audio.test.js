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
