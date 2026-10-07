import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {candidateSortedProps} from '../tools/prop-sorted-candidate.mjs';

for(const [biome,id] of Object.entries(BIOME_IDS))test(`${biome}: sorted pilot preserves identity, source order, suppression and regenerated chunks`,()=>{
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+id+'.json',import.meta.url))),nav=new Navigation(712,biome,pack.profile);
 for(const [x,z] of [[0,0],[-24,-24],[24,24],[-48,48],[47.999,-48.001],[12.5,-7.5]])for(const radius of [0,.28,4,8,8.001,20,50]){
  const expected=nav.propsAt(x,z,radius);
  assert.deepEqual(candidateSortedProps.call(nav,x,z,radius),expected);
  for(const p of expected.filter((_,i)=>i%3===0))nav.suppressed.add(p.id);
  assert.deepEqual(candidateSortedProps.call(nav,x,z,radius),nav.propsAt(x,z,radius));
  nav.suppressed.clear();
 }
 for(let cx=0;cx<70;cx++)nav.chunk(cx,3);
 assert.ok(nav.chunks.size<=64);
 assert.deepEqual(candidateSortedProps.call(nav,-24,-24,4),nav.propsAt(-24,-24,4));
});
test('sorted pilot excludes exact circular edges and retains repeated object references',()=>{
 const edge={id:'edge',x:12,z:0},inside={id:'inside',x:12-Number.EPSILON*12,z:0},negative={id:'same',x:-8,z:0};
 const chunk={instances:[[edge,inside,negative],[],[negative,{id:'diagonal',x:9,z:9}]]},nav={chunk:()=>chunk,suppressed:new Set()};
 assert.deepEqual(candidateSortedProps.call(nav,0,0,4),[inside,negative,negative]);
 nav.suppressed.add('same');assert.deepEqual(candidateSortedProps.call(nav,0,0,4),[inside]);
});
