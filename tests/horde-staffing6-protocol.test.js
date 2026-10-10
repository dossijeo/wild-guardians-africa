import test from 'node:test';
import assert from 'node:assert/strict';
import {DECLARED_STAFFING6_PILOT,staffing6Options,staffing6Provenance} from '../tools/horde-defense-staffing6-comparison.mjs';
import {DECLARED_HORDE_PILOT} from '../tools/horde-defense-comparison.mjs';
import {cropSpec} from '../src/simulation/rules.js';
test('Static original opening formula exposes ratio6 reserve lock instead of concealing it',()=>{
 const mijo=cropSpec('mijo'),money=1500-800-mijo.plant_cost,living=1,wage=30,desired=Math.ceil((living+money/10)/6),afterHire=money-desired*wage,threshold=desired*wage+100+mijo.plant_cost;
 assert.equal(desired,12);assert.equal(afterHire,335);assert.equal(threshold,465);assert.ok(afterHire<threshold);assert.ok(afterHire+mijo.base_harvest_value<threshold);assert.equal(mijo.base_harvest_value,33);
 const originalDesired=Math.ceil((living+money/10)/12);assert.equal(originalDesired,6);assert.ok(money-originalDesired*wage>originalDesired*wage+100+mijo.plant_cost);
});
test('Separate declaration changes only staffing target and protocol; original policy unchanged',()=>{
 const expected={...DECLARED_HORDE_PILOT,protocol:'horde-defense-staffing6-comparison-v1',plantsPerWorker:6};assert.deepEqual(DECLARED_STAFFING6_PILOT,expected);assert.equal(DECLARED_HORDE_PILOT.plantsPerWorker,12);assert.equal(DECLARED_STAFFING6_PILOT.middayHiring,false);assert.ok(Object.isFrozen(DECLARED_STAFFING6_PILOT));
});
test('Both arms use identical ordinary productive/magic/reserve options and retain onDay callback',()=>{
 const fn=()=>{},a=staffing6Options('responsible',fn),b=staffing6Options('neglect',fn);assert.equal(a.onDay,fn);assert.equal(b.onDay,fn);assert.deepEqual({...a,arm:'same'},{...b,arm:'same'});assert.throws(()=>staffing6Options('unknown',fn));assert.equal(a.days,20);assert.equal(a.seed,712);assert.equal(a.biome,'gran-canon');assert.equal(a.culture,'saheliana');
});
test('Provenance checks unchanged390 production sources and records separate runner/derivative',()=>{
 const p=staffing6Provenance([]);assert.equal(p.unchangedOriginalSources,390);assert.equal(Object.keys(p.sourceHashes).length,392);assert.equal(p.scenario.plantsPerWorker,6);assert.ok(p.sourceHashes['tools/horde-defense-staffing6-comparison.mjs']);assert.ok(p.sourceHashes['tools/horde-defense-terminal-derivative.mjs']);assert.equal(p.originalRuntimeSource,'88ebf647b6bbe0d589125e4136d65e73fdf303a6');
});
