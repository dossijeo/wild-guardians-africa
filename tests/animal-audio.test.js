import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimalAudio,ANIMAL_SOUND_ROUTES} from '../src/audio/animal-audio.js';
function fixture(){let clock=0;const played=[],stopped=[],audio=new AnimalAudio((id,options)=>{const source={};played.push({id,options,source});return source;},source=>stopped.push(source),()=>clock);const state={elapsed:0,pauses:[],raid:{animals:[]}};return {audio,state,played,stopped,advance:(dt=.1)=>{clock+=dt;state.elapsed+=dt;audio.update(state,{listener:{x:0,z:0}});},clock:dt=>clock+=dt};}
const flush=()=>new Promise(done=>setImmediate(done));
test('returning the camera restores the volume of an attack already in progress without replaying it',async()=>{const f=fixture(),gains=[];f.audio.setGain=(source,gain)=>gains.push({source,gain});f.audio.update(f.state);const actor={id:'a',species:'lion',status:'attacking',attackId:'one',x:300,z:0};f.state.raid.animals.push(actor);f.advance();await flush();const far=f.played[0].options.gain;assert.ok(far<.004);f.state.elapsed+=.1;f.audio.update(f.state,{listener:{x:300,z:0}});assert.equal(f.played.length,1);assert.equal(gains.at(-1).gain,.5);assert.equal(gains.at(-1).source,f.played[0].source);f.audio.dispose();});
for(const species of Object.keys(ANIMAL_SOUND_ROUTES))test(species+' actual observed phase routing and one cue per phase',async()=>{
 const f=fixture();f.audio.update(f.state);const actor={id:'animal',species,status:'entering',x:24,z:0};f.state.raid.animals.push(actor);f.advance();await flush();assert.equal(f.played[0].id,species+'_aggressive');assert.equal(f.played[0].options.gain,.25);assert.equal(f.played[0].options.emitter,'animal');
 actor.status='walking';f.advance();await flush();assert.equal(f.played.length,1);
 for(let i=0;i<121;i++)f.advance();await flush();assert.equal(f.played.length,2);assert.equal(f.played[1].id,species+'_neutral');
 actor.status='attacking';actor.attackId='one';f.advance();await flush();assert.equal(f.played[2].id,ANIMAL_SOUND_ROUTES[species].attack);for(let i=0;i<5;i++)f.advance();await flush();assert.equal(f.played.length,3);
 actor.attackId='two';f.advance();await flush();assert.equal(f.played.length,4);assert.equal(f.played[3].id,ANIMAL_SOUND_ROUTES[species].attack);
 actor.status='retreating';f.advance();await flush();assert.equal(f.played[4].id,species+'_retreat');assert.ok(f.stopped.includes(f.played[3].source));actor.status='gone';f.advance();assert.equal(f.audio.entries.size,0);assert.ok(f.stopped.includes(f.played[4].source));
});
for(const status of ['entering','walking','attacking','retreating'])test('restored '+status+' never replays its onset',async()=>{
 const f=fixture();f.state.raid.animals.push({id:'a',species:'lion',status,attackId:'old',x:0,z:0});f.audio.update(f.state);for(let i=0;i<10;i++)f.advance();await flush();assert.equal(f.played.length,0);
});
test('pause, result and a long observation gap stop activity without replay on resume',async()=>{
 for(const reason of ['pause','result','gap']){const f=fixture();f.audio.update(f.state);f.state.raid.animals.push({id:'a',species:'lion',status:'attacking',attackId:'one',x:0,z:0});f.advance();await flush();assert.equal(f.played.length,1);if(reason==='pause')f.state.pauses=['menu'];if(reason==='result')f.state.result='defeat';f.advance(reason==='gap'?1:.1);assert.ok(f.stopped.includes(f.played[0].source));f.state.pauses=[];f.state.result=null;f.advance();await flush();assert.equal(f.played.length,1);}
});
test('pending phase decode is invalidated by actor mutation before another audio frame',async()=>{
 const f=fixture();let resolve;f.audio.play=(id,options)=>{f.played.push({id,options});return new Promise(done=>resolve=done);};f.audio.update(f.state);const actor={id:'a',species:'lion',status:'attacking',attackId:'one',x:0,z:0};f.state.raid.animals.push(actor);f.advance();actor.status='retreating';assert.equal(f.played[0].options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));
});
test('expired decode, removal, state replacement and disposal cannot attach a late source',async()=>{
 for(const reason of ['expire','remove','replace','dispose']){const f=fixture();let resolve;f.audio.play=(id,options)=>{f.played.push({id,options});return new Promise(done=>resolve=done);};f.audio.update(f.state);f.state.raid.animals.push({id:'a',species:'lion',status:'entering',x:0,z:0});f.advance();if(reason==='expire')f.clock(.3);if(reason==='remove')f.state.raid.animals=[];if(reason==='replace')f.audio.update({...f.state,raid:null});if(reason==='dispose')f.audio.dispose();assert.equal(f.played[0].options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));}
});
test('state/economy/RNG are untouched and failed audio cannot fail the simulation frame',async()=>{
 const f=fixture();f.audio.update(f.state);f.state.raid.animals.push({id:'a',species:'lion',status:'entering',x:0,z:0});f.state.elapsed=.1;const before=JSON.stringify(f.state);f.audio.play=()=>Promise.reject(Error('decode failed'));f.audio.update(f.state);await flush();assert.equal(JSON.stringify(f.state),before);
});

import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],activeBounds:[-96,-96,96,96]};
for(const species of Object.keys(ANIMAL_SOUND_ROUTES))test(species+' native paid center raid produces actual approach/attack/retreat audio facts',async()=>{
 const state=Game.newGame({seed:712,slotId:'qa-animal-'+species});Game.resume(state,'intro');state.ledger.balance=rational(10000);state.day=3;state.completedNights=2;state.initialPreparation=false;state.tutorial.step='done';Game.placeStructure(state,'center',{x:4,z:0},nav);state.time=400;state.dayPlan={done:true};state.nightPlan={done:true};
 const played=[],audio=new AnimalAudio((id,options)=>{played.push({id,options});return {};},()=>{},()=>0);audio.update(state);spawnRaid(state,{group:[species]},nav);let observed=new Set();
 for(let i=0;i<5000&&state.raid;i++){Game.tick(state,.05,nav);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);await flush();for(const actor of state.raid?.animals??[])if(actor.status==='attacking')observed.add(actor.attackId);}
 assert.equal(state.raid,null);const ids=played.map(p=>p.id);for(const id of Object.values(ANIMAL_SOUND_ROUTES[species]))assert.ok(ids.includes(id),id);assert.equal(ids.filter(id=>id===ANIMAL_SOUND_ROUTES[species].attack).length,observed.size);assert.equal(ids.filter(id=>id===species+'_retreat').length,1);assert.ok(state.events.some(e=>e.type==='StructureHit'));assert.equal(audio.entries.size,0);
});
test('a synchronous audio failure is contained and neutral requests remain rate limited',()=>{
 const f=fixture();f.audio.update(f.state);f.audio.play=()=>{throw Error('audio unavailable');};f.state.raid.animals.push({id:'a',species:'lion',status:'entering',x:0,z:0});assert.doesNotThrow(()=>f.advance());assert.equal(f.audio.entries.get('a').nextNeutral,f.state.elapsed+12);
});
