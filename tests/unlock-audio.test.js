import test from 'node:test';
import assert from 'node:assert/strict';
import {UnlockAudio} from '../src/audio/unlock-audio.js';
import {AudioSystem} from '../src/audio/audio.js';
import {spellUnlocked} from '../src/simulation/rules.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(){let clock=0;const calls=[],stopped=[],audio=new UnlockAudio((id,options)=>{const source={};calls.push({id,options,source});return source;},source=>stopped.push(source),()=>clock);return {audio,calls,stopped,clock:dt=>clock+=dt};}
const state=()=>({day:1,time:0,elapsed:0,pauses:[],result:null});

test('shared calendar predicate preserves the approved exact boundaries',()=>{
  for(const [day,time,expected] of [[1,299.999,[]],[1,300,['shield']],[2,0,['shield']],[3,0,['shield','growth']],[4,599,['shield','growth']],[5,0,['shield','growth','multiply']]]){
    const s={day,time};assert.deepEqual(['shield','growth','multiply'].filter(id=>spellUnlocked(s,id)),expected);assert.equal(spellUnlocked(s,'unknown'),false);
  }
});
test('live milestones play once, tolerate a dropped frame and never mutate the simulation',async()=>{
  const f=fixture(),s=state();f.audio.update(s);
  for(const [day,time] of [[1,299],[1,305],[3,0],[5,0]]){
    s.day=day;s.time=time;s.elapsed++;const before=JSON.stringify(s);f.audio.update(s);await flush();assert.equal(JSON.stringify(s),before);for(let i=0;i<100;i++)f.audio.update(s);
  }
  assert.equal(f.calls.length,3);assert.ok(f.calls.every(c=>c.id==='ui_unlock'&&c.options.bus==='ui'&&c.options.emitter==='ui:unlock'));assert.equal(f.stopped.length,2);
  f.audio.voice.onended();assert.equal(f.audio.voice,null);
});
test('saved unlocks, replaced snapshots, backwards clocks and disposal seed silently',()=>{
  const f=fixture();let s={...state(),day:5};f.audio.update(s);f.audio.update(s);s={...s};f.audio.update(s);s.elapsed=-1;f.audio.update(s);s.day=1;f.audio.update(s);f.audio.dispose();s.day=5;f.audio.update(s);assert.equal(f.calls.length,0);
});
test('simultaneous new milestones coalesce and hiring defers only the live cue',async()=>{
  const f=fixture(),s=state();f.audio.update(s);s.day=5;s.elapsed=2400;s.pauses=['hiring'];f.audio.update(s);for(let i=0;i<100;i++)f.audio.update(s);assert.equal(f.calls.length,0);
  s.pauses=[];f.audio.update(s);await flush();assert.equal(f.calls.length,1);assert.equal(f.audio.pending.size,0);
  s.pauses=['menu'];f.audio.update(s);assert.ok(f.stopped.includes(f.calls[0].source));s.pauses=[];f.audio.update(s);assert.equal(f.calls.length,1);
});
for(const reason of ['pause','result','replacement','dispose','expiry'])test('pending decode is cancelled on '+reason,async()=>{
  const f=fixture(),s=state();f.audio.update(s);let resolve,options;f.audio.play=(_id,o)=>{options=o;return new Promise(done=>resolve=done);};s.day=3;s.elapsed=1200;f.audio.update(s);
  if(reason==='pause'){s.pauses=['menu'];f.audio.update(s);}if(reason==='result'){s.result='defeat';f.audio.update(s);}if(reason==='replacement')f.audio.update({...s});if(reason==='dispose')f.audio.dispose();if(reason==='expiry')f.clock(.501);
  assert.equal(options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));assert.equal(f.audio.voice,null);
});
test('defeat discards deferred milestones and playback failures do not retry every frame',()=>{
  const f=fixture(),s=state();f.audio.update(s);s.day=3;s.pauses=['hiring'];f.audio.update(s);s.result='defeat';f.audio.update(s);s.pauses=[];f.audio.update(s);assert.equal(f.calls.length,0);
  const g=fixture(),live=state();g.audio.update(live);let calls=0;g.audio.play=()=>{calls++;throw Error('unavailable');};live.day=3;g.audio.update(live);for(let i=0;i<100;i++)g.audio.update(live);assert.equal(calls,1);
});
test('actual paid calendar through day five produces three unlocks without changing money or RNG',async()=>{
  const f=fixture(),s=Game.newGame({slotId:'unlock-calendar',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);Game.openInitialHiring(s);Game.hire(s,'hire-1',{olderMale:1});f.audio.update(s);
  let loops=0;
  while(s.day<5){assert.ok(++loops<2000);Game.tick(s,2,nav);assert.equal(s.result,null);const before=serialize(s);f.audio.update(s);assert.equal(serialize(s),before);if(s.pauses.includes('hiring')){Game.hire(s,'hire-'+s.day,{olderMale:1});f.audio.update(s);}await flush();}
  assert.equal(f.calls.length,3);assert.equal(numberOf(s.ledger.balance),562);assert.equal(spellUnlocked(s,'multiply'),true);
});
test('postgame unlock dispatches once and loading its saved event is silent',()=>{
  const audio=new AudioSystem({sfx:1,music:0}),calls=[];audio.sound=async(id,options)=>calls.push({id,options});const history=[{id:'postgame',type:'PostgameStarted'}];audio.remember(history);audio.process(history);assert.equal(calls.length,0);history.push({id:'next',type:'PostgameStarted'});audio.process(history);audio.process(history);assert.equal(calls.length,1);assert.equal(calls[0].id,'ui_unlock');assert.equal(calls[0].options.emitter,'ui:unlock');
});
