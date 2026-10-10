import test from 'node:test';
import assert from 'node:assert/strict';
import {raidTarget} from '../src/simulation/raids.js';

// The independent selection reference uses the current one-point resistance. This
// also covers invalid earlier matches rather than only unique valid IDs.
const reference=(s,id)=>[...s.plants,...s.structures].find(t=>t.id===id&&
 (!('alive' in t)||(t.alive&&(s.raid.introCropLimit===undefined||(s.raid.introCropsDestroyed??0)<s.raid.introCropLimit)))&&
 (!('status' in t)||t.status==='intact'));

test('raid target lookup retains the previous selection across crop damage, introductory limits and structure states',()=>{
 let seed=712;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let iteration=0;iteration<500;iteration++){
  const plants=Array.from({length:100},()=>({id:'target-'+Math.floor(random()*20),alive:random()>.4,attackHits:Math.floor(random()*3)}));
  const structures=Array.from({length:30},()=>({id:'target-'+Math.floor(random()*20),status:['intact','collapsing','ruined'][Math.floor(random()*3)]}));
  const raid=random()<.5?{}:{introCropLimit:Math.floor(random()*5),introCropsDestroyed:Math.floor(random()*5)};
  const state={plants,structures,raid};
  for(let id=0;id<21;id++)assert.equal(raidTarget(state,'target-'+id),reference(state,'target-'+id));
 }
});

test('raid target lookup does not spread or copy a large farm history',()=>{
 const plants=Array.from({length:16000},(_,i)=>({id:'old-'+i,alive:false}));
 const crop={id:'crop',alive:true,attackHits:0},structure={id:'center',status:'intact'};
 plants.push(crop);
 const structures=[structure],state={plants,structures,raid:{}};
 for(const list of [plants,structures])list[Symbol.iterator]=()=>{throw Error('Full array iteration is unnecessary for target lookup');};
 assert.equal(raidTarget(state,'crop'),crop);
 assert.equal(raidTarget(state,'center'),structure);
 assert.equal(raidTarget(state,'missing'),undefined);
});
