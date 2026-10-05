import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {animalSpec,collapseThreshold} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {structureAlertSound,WALL_HIT_SOUNDS} from '../src/audio/structure-audio.js';
import {AudioSystem,soundPriority} from '../src/audio/audio.js';
import {clearNavigation} from './clear-navigation.js';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url)));
const nav=clearNavigation();
const flush=()=>new Promise(done=>setImmediate(done));
function fixture(culture='mapungubwe',deferRaid=false){
 const state=Game.newGame({seed:712,culture,slotId:'alert-'+culture});Game.resume(state,'intro');state.ledger.balance=rational(10000);state.day=3;state.initialPreparation=false;state.tutorial.step='done';
 Game.placeStructure(state,'center',{x:4,z:0},nav);if(!deferRaid)spawnRaid(state,{group:['warthog']},nav);
 return state;
}
function hit(state,target,animalIndex=0){
 const animal=state.raid.animals[animalIndex];Object.assign(animal,{status:'attacking',animation:'Right_Hand_Sword_Slash',targetId:target.id,attackRemaining:.01,hitsRemaining:3,hitApplied:false,approachShieldId:null});
 updateRaid(state,.02,nav);return state.events.filter(e=>e.type==='StructureHit').at(-1);
}
function audioFixture(){
 const audio=new AudioSystem({sfx:1,music:1}),sources=[];
 audio.context={state:'running',currentTime:0,createBufferSource(){const source={playbackRate:{value:7},connect(){},disconnect(){},start(){},stop(){}};sources.push(source);return source;},createGain(){return {gain:{value:0},connect(){},disconnect(){}};}};
 audio.sfxGain={};audio.musicGain={};audio.sfx=bank;audio.buffer=async url=>({url});return {audio,sources};
}
for(const culture of Game.CULTURES)test(culture+' first paid center hit alerts once per raid and remains suppressed after reload',async()=>{
 let state=fixture(culture),center=state.structures[0],first=hit(state,center);assert.equal(structureAlertSound(first),'game_building_attacked');
 assert.equal(first.structureHit.previousHp-first.structureHit.hp,animalSpec('warthog').structure_hit_damage);
 const {audio,sources}=audioFixture(),before=serialize(state);audio.process([first],{state});audio.process([first],{state});await flush();
 assert.equal(serialize(state),before);assert.equal(sources.filter(s=>s.buffer.url===bank.items.find(i=>i.id==='game_building_attacked').audio.url).length,1);
 assert.ok(sources.every(s=>s.playbackRate.value===1));audio.stop();
 state=deserialize(before);center=state.structures[0];const fresh=audioFixture();fresh.audio.remember(state.events);
 const second=hit(state,center);assert.equal(structureAlertSound(second),null);fresh.audio.process(state.events,{state});await flush();
 assert.equal(fresh.sources.length,1);assert.equal(fresh.sources[0].buffer.url,bank.items.find(i=>i.id==='beast_hit_structure').audio.url);fresh.audio.stop();
});
for(const material of Object.keys(WALL_HIT_SOUNDS))for(const gate of [false,true])test(material+'/'+gate+' critical crossing uses captured damage and does not repeat below the threshold',async()=>{
 const state=fixture('mapungubwe',true);Game.placeStructure(state,'wall',{kind:'wall',material,gate,x:10,z:0},nav);const wall=state.structures[1];spawnRaid(state,{group:['warthog']},nav);
 const threshold=collapseThreshold(wall)*2;wall.hp=threshold+animalSpec('warthog').structure_hit_damage/2;
 const first=hit(state,wall);assert.equal(structureAlertSound(first),'game_wall_critical');assert.equal(first.structureHit.criticalThreshold,threshold);
 const second=hit(state,wall);assert.equal(structureAlertSound(second),null);
 // Dispatch after repair/removal: the threshold crossing remains a captured fact.
 state.structures=[];const {audio,sources}=audioFixture();audio.process([first,second],{state});audio.process([first,second],{state});await flush();
 assert.equal(sources.filter(s=>s.buffer.url===bank.items.find(i=>i.id==='game_wall_critical').audio.url).length,1);audio.stop();
});
test('legacy, shielded/no-damage and non-crossing hits have no new structure alert',()=>{
 assert.equal(structureAlertSound({type:'StructureHit'}),null);
 for(const structureHit of [{kind:'center',firstHitThisRaid:true,previousHp:100,hp:100},{kind:'wall',previousHp:100,hp:80,criticalThreshold:40},{kind:'wall',previousHp:30,hp:20,criticalThreshold:40}])
  assert.equal(structureAlertSound({structureHit}),null);
});
test('an actual shielded center hit cannot issue a building-damage warning',async()=>{
 const state=fixture(),center=state.structures[0],hp=center.hp;Game.cast(state,'shield','shield',center.x,center.z,nav);
 const beforeEvents=state.events.length;hit(state,center);const events=state.events.slice(beforeEvents);
 assert.equal(center.hp,hp);assert.ok(!events.some(event=>event.type==='StructureHit'));
 assert.equal(state.raid.attackedStructureIds,undefined);
 const {audio,sources}=audioFixture();audio.process(events,{state});await flush();assert.equal(sources.length,0);audio.stop();
});
test('late decode and scene disposal prevent stale danger sources',async()=>{
 for(const action of ['delay','stop','hidden']){
  const state=fixture(),event=hit(state,state.structures[0]),{audio,sources}=audioFixture();let release;audio.buffer=()=>new Promise(done=>release=done);
  // Isolate the danger cue so the test does not overwrite two decode promises.
  const play=audio.sound.bind(audio);audio.sound=(id,options)=>id==='game_building_attacked'?play(id,options):Promise.resolve(null);
  audio.process([event],{state});await flush();
  if(action==='delay')audio.context.currentTime=.75;else if(action==='stop')audio.stop();else state.pauses.push('hidden');
  release({url:'danger'});await flush();assert.equal(sources.length,0);audio.stop();
 }
 assert.equal(soundPriority('game_building_attacked'),3);assert.equal(soundPriority('game_wall_critical'),3);
});
test('simultaneous critical crossings group one warning while preserving each material contact',async()=>{
 const state=fixture('mapungubwe',true),walls=[];
 for(let i=0;i<3;i++){Game.placeStructure(state,'wall-'+i,{kind:'wall',material:'zarzas',x:10+i*5,z:0},nav);walls.push(state.structures.at(-1));}
 spawnRaid(state,{group:['warthog','warthog','warthog']},nav);const hits=[];
 for(const [index,wall] of walls.entries()){wall.hp=collapseThreshold(wall)*2+10;hits.push(hit(state,wall,index));}
 const {audio,sources}=audioFixture();audio.process(hits,{state});await flush();
 assert.equal(sources.filter(s=>s.buffer.url===bank.items.find(i=>i.id==='game_wall_critical').audio.url).length,1);
 assert.equal(sources.filter(s=>s.buffer.url===bank.items.find(i=>i.id==='wall_hit_thorns').audio.url).length,3);audio.stop();
});
