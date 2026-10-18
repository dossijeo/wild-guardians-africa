import test from 'node:test';
import assert from 'node:assert/strict';
import v1 from '../content/balance/raid_pressure_v1.json' assert {type:'json'};
import {BALANCE} from '../src/simulation/balance.js';
import {activeRaidPressureCandidate,raidPressureCandidateForVersion,
 registerExperimentalPressure,validateProductionRaidPressureConfiguration}
 from '../src/simulation/raid-pressure-budget.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import * as Game from '../src/simulation/game.js';
import {planNight} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const state=day=>({day,rng:712,plants:Array.from({length:100},(_,i)=>({
 id:`crop-${i}`,alive:true,species:'platano'})),postgame:false});

test('production V1 is the reviewed recipe; introductions and legacy versions survive',()=>{
 assert.equal(validateProductionRaidPressureConfiguration(v1),v1);
 assert.equal(activeRaidPressureCandidate().version,5);
 assert.equal(raidPressureCandidateForVersion(3).experiment,undefined);
 const intro=preparePressureNight(state(1));
 assert.deepEqual(intro.plan.actors,[{species:BALANCE.animals[0].id,
  hits:BALANCE.animals[0].hit_budget_min}]);
 assert.equal(intro.plan.pressureFacts.candidateVersion,5);
 const planned=preparePressureNight(state(6));
 assert.equal(planned.plan.pressureFacts.candidateVersion,5);
 assert.equal(planned.plan.pressureFacts.experimentId,'v1-pressure');
 assert.equal(planned.plan.pressureFacts.experimentSignature,
  JSON.stringify([v1.halfSaturation,v1.count,v1.hits,v1.structure]));
 assert.ok(planned.plan.waves.flat().length<
  raidPressureCandidateForVersion(3).introCountStart);
});

test('production V1 save restores its frozen plan and rejects signature drift',()=>{
 const game=Game.newGame({seed:712,slotId:'v1-production'});
 Game.resume(game,'intro');
 const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};
 nav.propsAt=()=>[];nav.activeBounds=[-48,-48,48,48];nav.setState(game);
 Game.placeStructure(game,'center',{x:-12,z:0},nav);
 for(let i=0;i<30;i++)Game.plant(game,`plant-${i}`,'mijo',
  4+(i%6)*2,-4+Math.floor(i/6)*2,nav);
 game.day=6;game.time=600;game.dayPlan={done:true};
 game.initialPreparation=false;planNight(game);
 const saved=serialize(game),restored=deserialize(saved);
 assert.equal(restored.nightPlan.pressureFacts.candidateVersion,5);
 assert.equal(restored.nightPlan.pressureFacts.experimentId,'v1-pressure');
 assert.deepEqual(restored.nightPlan,game.nightPlan);
 const stale=JSON.parse(saved);
 stale.nightPlan.pressureFacts.experimentSignature='different-rules';
 assert.throws(()=>deserialize(JSON.stringify(stale)),/experiment mismatch/);
});

test('production V1 and the frozen QA candidate produce identical raids',()=>{
 const production=preparePressureNight(state(45));
 registerExperimentalPressure({id:v1.id,halfSaturation:v1.halfSaturation,
  count:v1.count,hits:v1.hits,structure:v1.structure});
 const experimental=preparePressureNight(state(45));
 assert.equal(experimental.plan.pressureFacts.candidateVersion,4);
 assert.equal(production.rng,experimental.rng);
 assert.deepEqual(production.memory,experimental.memory);
 assert.deepEqual(production.plan.waves,experimental.plan.waves);
 assert.equal(production.plan.at,experimental.plan.at);
 for(const key of ['observedValue','effectiveValue','pressure','targetAnimals',
  'budget','potential','composition'])
  assert.deepEqual(production.plan.pressureFacts[key],
   experimental.plan.pressureFacts[key]);
});
