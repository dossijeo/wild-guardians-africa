import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {collapseThreshold,animalSpec} from '../src/simulation/rules.js';
import {AudioSystem} from '../src/audio/audio.js';
import {structureDetailSound,WALL_HIT_SOUNDS} from '../src/audio/structure-audio.js';
import {clearNavigation} from './clear-navigation.js';
import {serialize} from '../src/persistence/snapshots.js';
const nav=clearNavigation(),bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url))),cue=bank.items.find(i=>i.id==='wall_structural_creak'),flush=()=>new Promise(done=>setImmediate(done));
function fixture(material='piedra',gate=false,species='warthog'){
 const s=Game.newGame({seed:712});Game.resume(s,'intro');s.tutorial.step='done';Game.placeStructure(s,'center',{x:4,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:10,z:0},nav);spawnRaid(s,{group:[species]},nav);
 return {s,wall:s.structures[1],animal:s.raid.animals[0]};
}
function hit(f){const before=f.s.events.length;Object.assign(f.animal,{status:'attacking',animation:'Right_Hand_Sword_Slash',targetId:f.wall.id,attackRemaining:.01,hitsRemaining:3,hitApplied:false,approachShieldId:null});updateRaid(f.s,.02,nav);return f.s.events.slice(before).filter(e=>e.type==='StructureHit').at(-1); }
function audioFixture(){
 const audio=new AudioSystem({sfx:1,music:0}),sources=[];audio.context={state:'running',currentTime:0,createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){}};sources.push(source);return source;},createGain(){return{gain:{value:0},connect(){},disconnect(){}};}};audio.sfxGain={};audio.musicGain={};audio.sfx=bank;audio.buffer=async url=>({url});const sound=audio.sound.bind(audio);audio.sound=(id,options)=>id===cue.id?sound(id,options):Promise.resolve(null);return{audio,sources};
}
for(const material of Object.keys(WALL_HIT_SOUNDS))for(const gate of [false,true])for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(`${material}/${gate}/${species}: real critical crossing creaks once; further damage does not repeat`,()=>{
 const f=fixture(material,gate,species),threshold=collapseThreshold(f.wall)*2,damage=animalSpec(species).structure_hit_damage;f.wall.hp=threshold+damage/2;
 const first=hit(f);assert.equal(structureDetailSound(first),cue.id);assert.equal(first.structureHit.x,10);assert.equal(first.structureHit.z,0);assert.equal(first.structureHit.previousHp-first.structureHit.hp,Math.min(damage,first.structureHit.previousHp));
 const next=hit(f);assert.equal(next?structureDetailSound(next):null,null);
});
test('legacy, centers, unchanged HP and hits above/below threshold have no creak',()=>{
 assert.equal(structureDetailSound({}),null);
 for(const structureHit of [{kind:'center',previousHp:60,hp:30,criticalThreshold:40},{kind:'wall',previousHp:40,hp:40,criticalThreshold:40},{kind:'wall',previousHp:90,hp:80,criticalThreshold:40},{kind:'wall',previousHp:30,hp:20,criticalThreshold:40}])assert.equal(structureDetailSound({structureHit}),null);
});
test('captured target position gives spatial attenuation after removal; history deduplicates and domain stays intact',async()=>{
 const f=fixture(),threshold=collapseThreshold(f.wall)*2;f.wall.hp=threshold+animalSpec('warthog').structure_hit_damage/2;const event=hit(f);f.s.structures=[];
 const {audio,sources}=audioFixture(),before=serialize(f.s);audio.process([event,event],{state:f.s,listener:{x:58,z:0}});audio.process([event],{state:f.s});await flush();
 assert.equal(sources.length,1);const voice=[...audio.voices.values()][0];assert.equal(voice.bus,'world');assert.equal(voice.emitter,event.targetId);assert.equal(voice.family,'structure-detail');assert.equal(voice.volume.gain.value,.2);assert.equal(serialize(f.s),before);audio.stop();
 const loaded=audioFixture();loaded.audio.remember([event]);loaded.audio.process([event],{state:f.s});await flush();assert.equal(loaded.sources.length,0);loaded.audio.stop();
});
test('late decode and hidden/menu/scene disposal reject stale creaks',async()=>{
 for(const mode of ['delay','hidden','menu','stop']){
  const f=fixture();f.wall.hp=collapseThreshold(f.wall)*2+animalSpec('warthog').structure_hit_damage/2;const event=hit(f),{audio,sources}=audioFixture();let release;audio.buffer=()=>new Promise(done=>release=done);audio.process([event],{state:f.s});await flush();
  if(mode==='delay')audio.context.currentTime=.6;else if(mode==='stop')audio.stop();else f.s.pauses.push(mode);release({url:cue.audio.url});await flush();assert.equal(sources.length,0,mode);audio.stop();
 }
});
