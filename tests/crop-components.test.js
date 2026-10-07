import test from 'node:test';
import assert from 'node:assert/strict';
import {createCropGrouping} from '../src/simulation/crop-components.js';
import {contiguousGroup} from '../src/simulation/crops.js';

test('selection-scoped components preserve reference BFS identity and ordering across dense, sparse and duplicate-ID farms',()=>{
 let seed=712;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<80;trial++){
  const plants=Array.from({length:250},(_,i)=>({id:'p-'+(trial%3===0?i%90:i),species:i%5===0?'maiz':'mijo',alive:random()>.15,x:Math.floor(random()*25)*1.5-18,z:Math.floor(random()*25)*1.5-18}));
  const index=createCropGrouping(plants);
  assert.deepEqual(index.living,plants.filter(p=>p.alive));
  for(const root of plants.filter(p=>p.alive).slice(0,30))assert.deepEqual(index.group(root),contiguousGroup(plants,root));
 }
});

test('exact threshold, negative cells and fallback distances retain connected-component semantics',()=>{
 const plants=Array.from({length:80},(_,i)=>({id:'p-'+i,species:'mijo',alive:true,x:i*1.7-68,z:0}));
 for(const distance of [0,-1,1.7,Infinity,NaN]){
  const index=createCropGrouping(plants,distance);
  for(const root of [plants[0],plants[39],plants[79]])assert.deepEqual(index.group(root),contiguousGroup(plants,root,distance));
 }
 plants[0].x=Number.MAX_VALUE;const index=createCropGrouping(plants);
 assert.deepEqual(index.group(plants[39]),contiguousGroup(plants,plants[39]));
 const edge=Array.from({length:80},(_,i)=>({id:'edge-'+i,species:'mijo',alive:true,x:i*20,z:0}));
 edge[0].x=-1e-200;edge[1].x=1.7;
 assert.deepEqual(createCropGrouping(edge).group(edge[0]),contiguousGroup(edge,edge[0]));
});

test('fresh selection scopes reflect destroyed, harvested and newly planted crops',()=>{
 const plants=Array.from({length:100},(_,i)=>({id:'p-'+i,species:'mijo',alive:true,x:i*1.5,z:0}));
 assert.equal(createCropGrouping(plants).group(plants[0]).length,100);
 plants[40].alive=false;
 assert.equal(createCropGrouping(plants).group(plants[0]).length,40);
 plants.push({id:'new',species:'mijo',alive:true,x:60,z:0});
 assert.deepEqual(createCropGrouping(plants).group(plants[0]),contiguousGroup(plants,plants[0]));
});
