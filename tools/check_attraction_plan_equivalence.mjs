import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {attraction} from '../src/simulation/rules.js';
import {planNight} from '../src/simulation/raids.js';
const cache=resolve('.cache');mkdirSync(cache,{recursive:true});
const temporary=mkdtempSync(join(cache,'attraction-plan-'));
assert.ok(temporary.startsWith(cache+sep));
try{
 cpSync('src',join(temporary,'src'),{recursive:true});
 writeFileSync(join(temporary,'package.json'),' {"type":"module"}');
 for(const f of ['balance.js','rules.js'])writeFileSync(join(temporary,'src/simulation',f),execFileSync('git',['show','8541cbf0:src/simulation/'+f]));
 const legacyRules=await import(pathToFileURL(join(temporary,'src/simulation/rules.js')));
 const legacyRaids=await import(pathToFileURL(join(temporary,'src/simulation/raids.js')));
 let checks=0;
 for(const species of ['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano','mixed'])for(const count of [1,5,32,150])for(const day of [1,2,3,4,5,6,10,100])for(const magic of [false,true]){
  const ids=species==='mixed'?['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano']:[species];
  const plants=Array.from({length:count},(_,i)=>({id:'p'+i,species:ids[i%ids.length],alive:i%7!==6,growth:i%3*70,multiplyHarvest:magic,water:[{status:magic?'magic':'manual'}],toleranceBonus:magic?.3:0}));
  assert.equal(attraction(plants),legacyRules.attraction(plants));
  const a={day,postgame:false,rng:712,plants,pauses:magic?['tutorial-action']:[],spells:magic?[{kind:'shield'},{kind:'growth'},{kind:'multiply'}]:[]},b=structuredClone(a);
  planNight(a);legacyRaids.planNight(b);assert.deepEqual(a.nightPlan,b.nightPlan);assert.equal(a.rng,b.rng);
  assert.ok(a.nightPlan.group.length>0);if(day<=5)assert.equal(a.nightPlan.group[0],['warthog','hyena','buffalo','lion','rhino'][day-1]);checks++;
 }
 console.log(JSON.stringify({status:'passed',pairedPlans:checks,legacySource:'8541cbf0',scope:'Native planning against frozen legacy rules/balance, every crop plus mixtures, counts, first5/intros/later guaranteed groups, magic flags/pauses. No gameplay/harness overrides.'}));
}finally{assert.ok(resolve(temporary).startsWith(cache+sep));rmSync(temporary,{recursive:true});}
