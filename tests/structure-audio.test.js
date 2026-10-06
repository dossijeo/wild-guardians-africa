import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem} from '../src/audio/audio.js';
import {WALL_HIT_SOUNDS,structureHitSound,STRUCTURE_CONTACT_FAMILY} from '../src/audio/structure-audio.js';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));
import {clearNavigation} from './clear-navigation.js';
const nav=clearNavigation();
function fixture(){const audio=new AudioSystem({sfx:1,music:1});audio.context={state:'running',currentTime:0,createBufferSource:()=>({playbackRate:{value:0},connect(){},disconnect(){},start(){},stop(){}}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};audio.sfx=bank;audio.buffer=async url=>({url});return audio;}
for(const [material,id] of Object.entries(WALL_HIT_SOUNDS))for(const gate of [false,true])test(`paid ${material} ${gate?'gate':'wall'}: one actual raid hit chooses one original material clip`,async()=>{
 const s=Game.newGame({seed:712,slotId:`qa-wall-audio-${material}-${gate}`});Game.resume(s,'intro');s.ledger.balance=rational(10000);s.day=3;s.initialPreparation=false;s.tutorial.step='done';
 Game.placeStructure(s,'center',{x:4,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:10,z:0},nav);const wall=s.structures[1];
 spawnRaid(s,{group:['warthog']},nav);const animal=s.raid.animals[0];
 // Directed setup at the committed attack boundary; updateRaid owns damage/events.
 Object.assign(animal,{status:'attacking',animation:'Right_Hand_Sword_Slash',targetId:wall.id,attackRemaining:.01,hitsRemaining:2,hitApplied:false,approachShieldId:null});const hp=wall.hp;updateRaid(s,.02,nav);
 const hits=s.events.filter(e=>e.type==='StructureHit');assert.equal(hits.length,1);assert.equal(wall.hp,hp-20);assert.equal(structureHitSound(hits[0],s),id);
 const before=serialize(s),audio=fixture();audio.process(hits,{state:s});audio.process(hits,{state:s});await new Promise(done=>setImmediate(done));
 const contacts=audio.active.filter(source=>audio.voices.get(source).family===STRUCTURE_CONTACT_FAMILY);assert.equal(contacts.length,1);assert.equal(audio.active.length,['piedra','adobe','reforzado'].includes(material)?2:1);assert.equal(contacts[0].buffer.url,bank.items.find(i=>i.id===id).audio.url);assert.equal(audio.active[0].playbackRate.value,1);assert.equal(audio.voices.get(audio.active[0]).family,STRUCTURE_CONTACT_FAMILY);assert.equal(serialize(s),before);audio.stop();
});
test('centers, missing state/target and unknown wall material keep the original generic contact',()=>{
 for(const target of [undefined,{kind:'center',material:'piedra'},{kind:'wall',material:'unknown'}])assert.equal(structureHitSound({targetId:'target'},{structures:target?[{id:'target',...target}]:[]}),'beast_hit_structure');assert.equal(structureHitSound({targetId:'target'}),'beast_hit_structure');
});
test('all material variants and generic impacts share four family slots after concurrent decode',async()=>{
 const audio=fixture();let release;
 // A shared deferred decode exposes admission at resolution rather than dispatch.
 const buffer=new Promise(done=>release=done);audio.buffer=()=>buffer;
 const structures=Object.keys(WALL_HIT_SOUNDS).map((material,i)=>({id:'wall-'+i,kind:'wall',material}));structures.push({id:'center',kind:'center'});
 audio.process(Array.from({length:60},(_,i)=>({id:'hit-'+i,type:'StructureHit',targetId:structures[i%6].id,animalId:'animal-'+i})),{state:{structures}});await new Promise(done=>setImmediate(done));release({});await new Promise(done=>setImmediate(done));
 assert.equal(audio.active.length,4);assert.ok([...audio.voices.values()].every(v=>v.family===STRUCTURE_CONTACT_FAMILY&&v.bus==='world'));const alert=await audio.sound('game_attack_alert');assert.ok(alert);audio.stop();
});
test('material variants share the animal emitter limit and leave unrelated voices untouched',async()=>{
 const audio=fixture(),structures=Object.keys(WALL_HIT_SOUNDS).map((material,i)=>({id:'wall-'+i,kind:'wall',material}));audio.process(structures.map((s,i)=>({id:'hit-'+i,type:'StructureHit',targetId:s.id,animalId:'same-animal'})),{state:{structures}});await new Promise(done=>setImmediate(done));assert.equal(audio.active.length,2);await audio.sound('farm_harvest_pick',{emitter:'worker'});assert.equal(audio.active.length,3);audio.stop();
});
test('scene exit during contact decoding suppresses the pending material source',async()=>{
 const audio=fixture();let release;audio.buffer=()=>new Promise(done=>release=done);audio.process([{id:'hit',type:'StructureHit',targetId:'wall'}],{state:{structures:[{id:'wall',kind:'wall',material:'piedra'}]}});await new Promise(done=>setImmediate(done));audio.stop();release({});await new Promise(done=>setImmediate(done));assert.equal(audio.active.length,0);
});
