import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyBalanceCandidate} from '../tools/experiments/balance-candidate.mjs';
import {BALANCE} from '../src/simulation/balance.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import {raidPressureCandidateForVersion,raidAnimalCount} from '../src/simulation/raid-pressure-budget.js';

const candidate=JSON.parse(readFileSync(new URL('../tools/experiments/balance-candidates/v1-combined.json',import.meta.url)));
const state=day=>({day,rng:712,plants:Array.from({length:100},(_,i)=>({id:`crop-${i}`,alive:true,species:'platano'})),postgame:false});

test('experimental V1 preserves introduction and changes only post-introduction pressure',()=>{
 const original=preparePressureNight(state(1));
 applyBalanceCandidate(candidate);
 assert.equal(BALANCE.walls[0].gate_hp,75);
 assert.deepEqual(preparePressureNight(state(1)).plan.actors,original.plan.actors);
 const plan=preparePressureNight(state(6)).plan;
 assert.equal(plan.pressureFacts.candidateVersion,4);
 assert.equal(plan.pressureFacts.experimentId,'v1-combined');
 assert.equal(plan.pressureFacts.experimentSignature,raidPressureCandidateForVersion(4).experiment.signature);
 assert.equal(plan.waves.flat().length,plan.pressureFacts.targetAnimals);
 assert.ok(plan.pressureFacts.targetAnimals<raidAnimalCount(6,plan.pressureFacts.pressure));
 assert.equal(raidPressureCandidateForVersion(4).experiment.id,'v1-combined');
 assert.equal(preparePressureNight({...state(6),nightPlan:plan,raidPressureMemory:{version:1,lastDay:6,sample:plan.pressureFacts.observedValue,ema:plan.pressureFacts.observedValue}}).reused,true);
 assert.throws(()=>preparePressureNight({...state(6),nightPlan:{...plan,pressureFacts:{...plan.pressureFacts,experimentId:'wrong'}}}),/experiment mismatch/);
});

test('candidate rejects non-progressive wall prices and unexpected settings',()=>{
 assert.throws(()=>applyBalanceCandidate({id:'invalid',damage:0}),/Invalid balance candidate/);
 assert.throws(()=>applyBalanceCandidate({id:'invalid',walls:candidate.walls.map((row,i)=>i===1?{...row,cost:9}:row)}),/Invalid progressive wall table/);
});
