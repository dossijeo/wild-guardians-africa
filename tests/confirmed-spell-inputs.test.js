import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {projectConfirmedActorAudio} from '../src/simulation/confirmed-actor-audio.js';
import {attackGestureActive,attackTargetAvailable} from '../src/simulation/guardian-combat.js';
import {pickedSpellCommand} from '../src/app/spell-placement.js';

test('compact spell inputs preserve target eligibility, positions and pending impact decisions',()=>{
 const base=newGame({seed:712}),plant=createPlant('crop','platano',3,4,'center');base.plants.push(plant);base.elapsed=10;base.raid={id:'r',animals:[{id:'a',species:'hiena',status:'walking',x:6,z:8}]};
 for(const change of [()=>{},s=>{s.raid.animals[0].magicDown={phase:'fallen'};},s=>{s.raid.animals[0].recovery={phase:'rise'};},s=>{s.raid.animals[0].fallRemaining=1;},s=>{s.raid.animals[0].magicImpact={at:9.8,impactAt:9.9};},s=>{s.raid.animals[0].magicStunUntil=11;},s=>{s.guardianAttackStartedAt=9.9;},s=>{s.raid.animals[0].status='gone';}]){
  const state=structuredClone(base);change(state);const view=projectConfirmedActorAudio(state);assert.equal(attackGestureActive(view),attackGestureActive(state));assert.equal(attackTargetAvailable(view,view.raid.animals[0]),attackTargetAvailable(state,state.raid.animals[0]));const pick={entityId:'a',point:{x:1,z:2},hitPoint:{x:6,y:1,z:8},origin:{x:0,y:1,z:0}};assert.deepEqual(pickedSpellCommand(view,'cast','attack',pick),pickedSpellCommand(state,'cast','attack',pick));
 }
 const view=projectConfirmedActorAudio(base),pick={entityId:'crop',point:{x:9,z:9},hitPoint:{x:3,y:1,z:4},origin:{x:0,y:1,z:0}};for(const kind of ['growth','multiply','shield'])assert.deepEqual(pickedSpellCommand(view,'cast',kind,pick),pickedSpellCommand(base,'cast',kind,pick));
});
