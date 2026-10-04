import test from 'node:test';
import assert from 'node:assert/strict';
import {AmbientAudio,ambientLayers,AMBIENT_SOUND_IDS} from '../src/audio/ambient-audio.js';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(play){const calls=[],stopped=[],levels=[];let now=0;
 const audio=new AmbientAudio(play??((id,options)=>{const source={id,onended(){}};calls.push({id,options,source});return source;}),source=>stopped.push(source),(source,value)=>levels.push({source,value}),()=>now);
 return {audio,calls,stopped,levels,setClock:t=>now=t};}
test('all connected ambience comes from original loop clips without introducing weather',()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));
 for(const id of AMBIENT_SOUND_IDS)assert.equal(bank.items.find(i=>i.id===id)?.loop,true,id);
 assert.ok(!AMBIENT_SOUND_IDS.includes('amb_rain'));assert.ok(!AMBIENT_SOUND_IDS.includes('amb_wind_strong'));
});
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: background follows actual day/night and never assumes water without evidence`,()=>{
 const state=newGame({biome,seed:712}),before=serialize(state),day=ambientLayers(state);assert.equal(serialize(state),before);
 assert.deepEqual(day.map(l=>l.id),['amb_wind_soft','amb_birds']);state.time=300;
 assert.deepEqual(ambientLayers(state).map(l=>l.id),['amb_wind_soft','amb_insects','amb_night']);
});
test('water needs a matching biome, active hydrology and a nearby measured shoreline',()=>{
 for(const biome of ['gran-rio','gran-canon','manglares']){
  const state={biome,time:0,pauses:[]},water={active:true,shore:0,inside:false},layers=ambientLayers(state,water);
  assert.equal(layers.at(-1).id,biome==='manglares'?'amb_coast_mangrove':'amb_river');assert.equal(layers.at(-1).gain,.3);
  assert.equal(ambientLayers(state,{...water,shore:12}).at(-1).gain,.15);
  assert.equal(ambientLayers(state,{...water,active:false}).length,2);assert.equal(ambientLayers(state,{...water,shore:Infinity}).length,2);
  assert.equal(ambientLayers(state,{...water,shore:100}).length,2);
 }
 assert.equal(ambientLayers({biome:'desierto',time:0},{active:true,shore:0}).length,2);
});
test('many identical frames share pending loads and water sampling is cached by listener cell/revision',async()=>{
 const f=fixture(),state={biome:'gran-rio',time:0,pauses:[]};let samples=0;const options={listener:{x:1,z:1},waterAt:()=>{samples++;return {active:true,shore:4};}};
 for(let i=0;i<200;i++)f.audio.update(state,options);await settle();assert.equal(f.calls.length,3);assert.equal(samples,1);
 f.audio.update(state,{...options,listener:{x:3,z:1}});assert.equal(samples,1);f.audio.update(state,{...options,waterRevision:1});assert.equal(samples,2);
 f.audio.update(state,{...options,waterRevision:1,listener:{x:4,z:1}});assert.equal(samples,3);assert.equal(f.calls.length,3);f.audio.dispose();assert.equal(f.stopped.length,3);
});
test('day/night crossfade releases old fauna, while a pause changes only ambient levels',async()=>{
 const f=fixture(),state={biome:'sabana',time:0,pauses:[]};f.audio.update(state);await settle();const bird=f.calls.find(c=>c.id==='amb_birds').source;
 state.time=300;f.audio.update(state);await settle();assert.equal(f.calls.length,4);assert.ok(f.levels.some(l=>l.source===bird&&l.value===0));assert.ok(!f.stopped.includes(bird));
 f.setClock(.4);f.audio.update(state);assert.ok(f.stopped.includes(bird));state.pauses=['menu'];f.audio.update(state);assert.equal(f.calls.length,4);assert.ok(f.levels.some(l=>l.value===.35*.25));
 f.audio.dispose();assert.equal(f.audio.entries.size,0);assert.equal(f.audio.fading.size,0);
});
test('a loading loop invalidated by scene change cannot survive late completion',async()=>{
 const pending=[];const f=fixture(()=>new Promise(done=>pending.push(done))),state={biome:'sabana',time:0,pauses:[]};
 f.audio.update(state);f.audio.dispose();const sources=pending.map(resolve=>{const source={};resolve(source);return source;});await settle();assert.equal(sources.length,2);assert.ok(sources.every(source=>f.stopped.includes(source)));assert.equal(f.audio.entries.size,0);
});
test('an evicted loop retries at most once per audio second and an unchanged scene never duplicates it',async()=>{
 let attempts=0;const f=fixture(()=>{attempts++;return null;}),state={biome:'sabana',time:0,pauses:[]};
 f.audio.update(state);await settle();assert.equal(attempts,2);for(let i=0;i<200;i++)f.audio.update(state);assert.equal(attempts,2);
 f.setClock(1);f.audio.update(state);await settle();assert.equal(attempts,4);f.audio.dispose();
});
test('result and replacement state stop ambience without altering simulation or resurrecting old voices',async()=>{
 const f=fixture(),state=newGame({seed:712}),before=serialize(state);f.audio.update(state);await settle();assert.equal(serialize(state),before);
 f.audio.update({...state});await settle();assert.equal(f.stopped.length,2);assert.equal(f.calls.length,4);
 state.result='defeat';f.audio.update(state);await settle();f.setClock(1);f.audio.update(state);assert.equal(f.audio.entries.size,0);f.audio.dispose();
});
