import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {centerDeliveryPoint} from '../src/world/centers.js';
import {serialize} from '../src/persistence/snapshots.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
for(const biome of ['gran-rio','manglares','volcanes','desierto'])test(`${biome}: native twelve-body entry and route to the actual center`,()=>{
 const {s,nav}=createOpeningWorld({biome,seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);
 const before=serialize(s),specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const entry=chooseRaidEntry(s,specs,nav.activeBounds,0,nav);assert.ok(entry,'A valid native farm must admit the whole group');assert.equal(entry.entries.length,12);assert.equal(entry.exits.length,12);
 for(const [i,p] of entry.entries.entries()){
  const radius=specs[i].radius,exit=entry.exits[i];assert.ok(nav.walkable(p.x,p.z,radius,null,false));assert.ok(nav.walkable(exit.x,exit.z,radius,null,false));assert.ok(nav.segmentClear(p,exit,radius,null,false));
  for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-entry.entries[j].x,p.z-entry.entries[j].z)>radius+specs[j].radius+1);
  const target=centerDeliveryPoint(center,p,s,radius+.5);assert.ok(nav.approachPath(p,target,radius),'Real native approach route must exist');
 }
 assert.equal(serialize(s),before);
});
