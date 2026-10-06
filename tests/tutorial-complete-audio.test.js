import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {AudioSystem,eventAlertSound} from '../src/audio/audio.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url))),cue=bank.items.find(i=>i.id==='ui_objective_complete');
const flush=()=>new Promise(done=>setImmediate(done));
function farm(culture='mapungubwe',skipped=false){
 const s=Game.newGame({seed:712,culture});s.villages[0].center={x:10,z:0};Game.resume(s,'intro');s.tutorial.step='center';
 const nav=clearNavigation();Game.placeStructure(s,'center',{x:10,z:0},nav);Game.plant(s,'seed','mijo',18,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.tutorial.basicSkipped=skipped;
 return {s,nav};
}
function audioFixture(){
 const audio=new AudioSystem({sfx:1,music:0}),sources=[];
 audio.context={state:'running',currentTime:0,createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){}};sources.push(source);return source;},createGain(){return{gain:{value:0},connect(){},disconnect(){}};}};
 audio.sfxGain={};audio.musicGain={};audio.sfx=bank;audio.buffer=async url=>({url});return{audio,sources};
}
for(const culture of Game.CULTURES)test(culture+' completion follows paid physical watering, pickup and first delivery only',()=>{
 const {s,nav}=farm(culture);
 for(let i=0;i<3000&&!s.crates.some(c=>c.delivered);i++){
  Game.tick(s,.1,nav);
  if(!s.crates.some(c=>c.delivered))assert.equal(s.events.filter(e=>e.type==='TutorialCompleted').length,0);
 }
 assert.ok(s.plants[0].water[0].status==='manual');assert.ok(s.events.some(e=>e.type==='CropPicked'));
 const delivery=s.events.find(e=>e.type==='CrateDelivered'),completed=s.events.filter(e=>e.type==='TutorialCompleted');
 assert.ok(delivery);assert.equal(completed.length,1);assert.equal(completed[0].targetId,delivery.targetId);assert.equal(completed[0].workerId,delivery.workerId);assert.equal(s.events.indexOf(completed[0]),s.events.indexOf(delivery)+1);
 for(let i=0;i<20;i++)Game.tick(s,.1,nav);
 assert.equal(s.events.filter(e=>e.type==='TutorialCompleted').length,1);
});
test('skipping and already completed tutorial do not issue an objective cue on delivery',()=>{
 for(const mode of ['skipped','done']){
  const {s,nav}=farm('mapungubwe',mode==='skipped');if(mode==='done')s.tutorial.step='done';
  for(let i=0;i<3000&&!s.crates.some(c=>c.delivered);i++)Game.tick(s,.1,nav);
  assert.ok(s.crates.some(c=>c.delivered));assert.equal(s.events.filter(e=>e.type==='TutorialCompleted').length,0);
 }
});
test('completion audio is UI-only, deduplicated and does not replay saved history or mutate the farm',async()=>{
 const {s}=farm();Game.emit(s,'TutorialCompleted',{workerId:s.workers[0].id,targetId:'crate'});const event=s.events.at(-1),{audio,sources}=audioFixture();
 const before=serialize(s);audio.process([event,event],{state:s});audio.process([event],{state:s});await flush();
 assert.equal(eventAlertSound.TutorialCompleted,'ui_objective_complete');assert.equal(sources.filter(v=>v.buffer.url===cue.audio.url).length,1);assert.equal(serialize(s),before);
 const voice=[...audio.voices.values()][0];assert.equal(voice.bus,'ui');assert.equal(voice.family,'tutorial-complete');assert.equal(voice.emitter,'ui:tutorial');audio.stop();
 const saved=deserialize(before),loaded=audioFixture();loaded.audio.remember(saved.events);loaded.audio.process(saved.events,{state:saved});await flush();assert.equal(loaded.sources.length,0);loaded.audio.stop();
});
test('late decode, hidden/menu pause and scene disposal suppress a stale completion',async()=>{
 for(const mode of ['delay','hidden','menu','stop']){
  const {s}=farm();Game.emit(s,'TutorialCompleted');const event=s.events.at(-1),{audio,sources}=audioFixture();let release;audio.buffer=()=>new Promise(done=>release=done);
  audio.process([event],{state:s});await flush();assert.ok(release);
  if(mode==='delay')audio.context.currentTime=.6;else if(mode==='stop')audio.stop();else s.pauses.push(mode);
  release({url:cue.audio.url});await flush();assert.equal(sources.length,0,mode);audio.stop();
 }
});
