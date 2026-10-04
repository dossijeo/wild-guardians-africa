import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {updateWorkerEncounters} from '../src/simulation/encounters.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
function audioFixture(){const audio=new AudioSystem({sfx:1,music:1}),calls=[];audio.sound=async(id,options)=>{calls.push({id,options});};return {audio,calls};}
function flat(state){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(state);return nav;}

for(const culture of Game.CULTURES)test(culture+' paid center emits one placement and one completion with a stable captured position',()=>{
  const state=Game.newGame({culture,seed:712,slotId:'audio-center-'+culture}),nav=flat(state),{audio,calls}=audioFixture();
  assert.equal(Game.placeStructure(state,'center',{x:-10,z:-10},nav),true);assert.equal(state.ledger.balance.n,'700');
  const fact=state.events.find(e=>e.type==='PlacementCommitted');assert.equal(fact.targetId,state.structures[0].id);assert.deepEqual(fact.presentation,{x:-10,z:-10});
  // Dispatch later, after the live structure has changed position or gone.
  state.structures=[];const before=serialize(state);audio.process(state.events,{state,listener:{x:-10,z:-10}});audio.process(state.events,{state});assert.equal(serialize(state),before);
  assert.deepEqual(calls.map(c=>c.id),['build_place','build_complete']);assert.ok(calls.every(c=>c.options.emitter===fact.targetId&&c.options.gain===1));
  const restored=deserialize(before),fresh=audioFixture();fresh.audio.remember(restored.events);fresh.audio.process(restored.events,{state:restored});assert.equal(fresh.calls.length,0);
});

test('a paid wall chain completes once for the entire command rather than per segment or automatic gate',()=>{
  const state=Game.newGame({seed:712,slotId:'audio-chain'}),nav=flat(state),{audio,calls}=audioFixture();Game.placeStructure(state,'center',{x:-10,z:-10},nav);audio.remember(state.events);
  assert.equal(Game.buildWallChain(state,'chain','zarzas',[[0,0],[18,0]],nav,{smooth:false,snap:false}),true);
  const fact=state.events.find(e=>e.type==='WallChainBuilt');assert.ok(fact.count>1);assert.equal(fact.targetId,state.structures[1].id);assert.deepEqual(fact.presentation,{x:state.structures[1].x,z:state.structures[1].z});
  const before=serialize(state);audio.process(state.events,{state});for(let i=0;i<100;i++)audio.process(state.events,{state});assert.equal(serialize(state),before);
  assert.deepEqual(calls.map(c=>c.id),['build_place','build_complete']);assert.equal(Game.buildWallChain(state,'chain','zarzas',[[0,0],[18,0]],nav),false);audio.process(state.events,{state});assert.equal(calls.length,2);
});

test('a rejected center has no placement or completion cue and cannot spend money',()=>{
  const state=Game.newGame({seed:712,slotId:'rejected'}),nav={placement:()=>({valid:false,reason:'pendiente'})},{audio,calls}=audioFixture(),before=serialize(state);
  assert.throws(()=>Game.placeStructure(state,'center',{x:0,z:0},nav));assert.equal(serialize(state),before);audio.process(state.events,{state});assert.equal(calls.length,0);
});

for(const species of ['lion','hyena','buffalo','rhino','warthog'])for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(species+'/'+profile+' actual first/second collision produces one contact plus its NPC response',()=>{
  const state=Game.newGame({seed:712,slotId:'contact-'+species+'-'+profile}),{audio,calls}=audioFixture(),nav={walkable:()=>true};
  const worker={id:'worker',personId:'person',profile,x:24,z:.1,hits:0,status:'fleeing',incapacitated:false},animal={id:'animal',species,x:24,z:0,radius:ANIMAL_ACTIONS.animals[species].presentation.footprint.radius,heading:0,hitsRemaining:4,status:'walking'};
  state.workers=[worker];state.people=[{id:'person',profile,recoveryUntil:0}];state.raid={id:'raid',animals:[animal],encounters:[],reservations:{}};
  updateWorkerEncounters(state,nav);const first=state.events.at(-1);assert.equal(first.type,'WorkerHit');assert.deepEqual(first.presentation,{elapsed:0,x:24,z:.1});assert.equal(worker.hits,1);assert.equal(animal.hitsRemaining,3);
  const before=serialize(state);audio.process(state.events,{state,listener:{x:24,z:.1}});audio.process(state.events,{state});assert.equal(serialize(state),before);assert.deepEqual(calls.map(c=>c.id),['npc_hit','beast_hit_character']);
  assert.equal(calls[0].options.emitter,worker.id);assert.equal(calls[1].options.emitter,animal.id);assert.equal(calls[1].options.gain,1);assert.equal(calls[1].options.family,'beast-worker-contact');
  worker.x=80;worker.z=80;updateWorkerEncounters(state,nav);worker.x=24;worker.z=.1;updateWorkerEncounters(state,nav);
  assert.equal(state.events.at(-1).type,'WorkerIncapacitated');assert.equal(worker.hits,2);assert.equal(animal.hitsRemaining,2);assert.equal(state.people[0].recoveryUntil,2);
  const second=serialize(state);audio.process(state.events,{state});audio.process(state.events,{state});assert.equal(serialize(state),second);assert.deepEqual(calls.map(c=>c.id),['npc_hit','beast_hit_character','npc_fall','beast_hit_character']);
  const fresh=audioFixture(),restored=deserialize(second);fresh.audio.remember(restored.events);fresh.audio.process(restored.events,{state:restored});assert.equal(fresh.calls.length,0);
});
