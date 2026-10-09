import test from 'node:test';
import assert from 'node:assert/strict';
import {denseNativeMaizeScenario} from './lib/frontside-dense-native-maize-scenario.mjs';
import {cropSpec} from '../src/simulation/rules.js';

test('declared dense QA changes only alive crop species and growth on an independent copy',()=>{
 const source={plants:[{id:'a',alive:true,species:'sorgo',growth:12,x:1,z:2,rotation:.3,health:.8},{id:'b',alive:true,species:'maiz',growth:270,x:3,z:4,rotation:.4},{id:'dead',alive:false,species:'arroz',growth:15,x:5,z:6}],workers:[{id:'w',task:'t'}],tasks:[{id:'t',targetId:'a'}],seed:42};
 const before=structuredClone(source),{state,receipt}=denseNativeMaizeScenario(source);
 assert.deepEqual(source,before);assert.notEqual(state,source);assert.notEqual(state.plants[0],source.plants[0]);
 assert.deepEqual(state.workers,source.workers);assert.deepEqual(state.tasks,source.tasks);
 for(let i=0;i<source.plants.length;i++){const expected=structuredClone(source.plants[i]);if(expected.alive){expected.species='maiz';expected.growth=cropSpec('maiz').growth_seconds;}assert.deepEqual(state.plants[i],expected);}
 assert.equal(receipt.artificialWorkload,true);assert.equal(receipt.matureMaizeCount,2);assert.equal(receipt.changedCount,1);assert.deepEqual(receipt.sourceSpeciesDistribution,{sorgo:1,maiz:1});
});
test('ambiguous positions or IDs and empty workload fail before rendering',()=>{
 assert.throws(()=>denseNativeMaizeScenario({plants:[]}),/no alive/);
 assert.throws(()=>denseNativeMaizeScenario({plants:[{id:'a',alive:true,x:NaN,z:1}]}),/Ambiguous/);
 assert.throws(()=>denseNativeMaizeScenario({plants:[{id:'a',alive:true,x:1,z:1},{id:'a',alive:true,x:2,z:2}]}),/Ambiguous/);
});
