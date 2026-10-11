import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {animalSpec,randomInt} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {raidEntryChunks} from '../src/world/raid-entry-residency.js';
test('retained Canyon night-seven wave fits bounded bank retry without dropping actors or changing state',()=>{
 const directory=new URL('../docs/qa/integrated-spiritual-survival/pilot-v98-q14-passive-zarzas-canyon-712-seven/',import.meta.url);
 const raw=gunzipSync(readFileSync(new URL('partial-state.json.gz',directory))).toString(),s=deserialize(raw),before=serialize(s);
 const partial=JSON.parse(readFileSync(new URL('partial.json',directory))),context=JSON.parse(partial.entryTransport.waits.at(-1).key),bounds=context[7],view=context[8];
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
 const specs=s.nightPlan.group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const entry=chooseRaidEntry(s,specs,bounds,randomInt(deserialize(raw),0,3),nav);
 assert(entry);assert.equal(entry.entries.length,10);assert.equal(entry.exits.length,10);
 assert.deepEqual(entry.selectionBounds,bounds.map((v,i)=>v+(i<2?-24:24)));assert.deepEqual(nav.activeBounds,bounds);assert.equal(serialize(s),before);
 const check=Object.assign(Object.create(nav),{activeBounds:entry.selectionBounds});
 assert(exteriorGroupWitness(entry,specs,raidWallEnvelope(s,nav),check,exteriorRaidWitness));
 for(let i=0;i<specs.length;i++){
  const radius=specs[i].radius;assert(nav.walkable(entry.entries[i].x,entry.entries[i].z,radius,null,false));assert(nav.walkable(entry.exits[i].x,entry.exits[i].z,radius,null,false));
  assert(nav.segmentClear(entry.entries[i],entry.exits[i],radius,null,false));
  for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>radius+specs[j].radius+1);
 }
 const chunks=raidEntryChunks(entry,specs.map(s=>s.radius));assert(chunks.size>0&&chunks.size<20,'Only finite sparse birth/exit chunks are demanded');
});
