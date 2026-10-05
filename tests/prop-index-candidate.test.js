import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {candidateIndexedProps} from '../tools/prop-index-candidate.mjs';

for(const [biome,id] of Object.entries(BIOME_IDS))test(`${biome}: diagnostic prop index preserves native query order, boundaries and live suppression`,()=>{
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+id+'.json',import.meta.url))),nav=new Navigation(712,biome,pack.profile);
 for(const [x,z] of [[0,0],[-24,-24],[24,24],[-48,48],[47.999,-48.001],[12.5,-7.5]])for(const radius of [0,.28,4,8,8.001,20,50]){
  const expected=nav.propsAt(x,z,radius),actual=candidateIndexedProps.call(nav,x,z,radius);
  assert.deepEqual(actual,expected);
  for(const p of expected.filter((_,i)=>i%3===0))nav.suppressed.add(p.id);
  assert.deepEqual(candidateIndexedProps.call(nav,x,z,radius),nav.propsAt(x,z,radius));
  nav.suppressed.clear();assert.deepEqual(candidateIndexedProps.call(nav,x,z,radius),expected);
 }
 // Evicted chunks are regenerated as new objects; their old indexes must not
 // leak into the new query or retain stale suppression results.
 for(let cx=0;cx<70;cx++)nav.chunk(cx,3);
 assert.ok(nav.chunks.size<=64);assert.deepEqual(candidateIndexedProps.call(nav,-24,-24,4),nav.propsAt(-24,-24,4));
});

test('diagnostic index retains the strict circular boundary and repeated IDs in source order',()=>{
 const chunk={instances:[[{id:'a',x:12,z:0},{id:'b',x:11.999,z:0},{id:'same',x:-8,z:0}],[],[{id:'same',x:0,z:-8}]]};
 const nav={chunk:()=>chunk,suppressed:new Set()};
 assert.deepEqual(candidateIndexedProps.call(nav,0,0,4),[chunk.instances[0][1],chunk.instances[0][2],chunk.instances[2][0]]);
 nav.suppressed.add('same');assert.deepEqual(candidateIndexedProps.call(nav,0,0,4),[chunk.instances[0][1]]);
});
