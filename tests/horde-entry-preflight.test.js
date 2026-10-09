import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {chooseRaidEntry,spawnRaid} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {serialize} from '../src/persistence/snapshots.js';
import {activeChunkRegion} from '../src/world/active-region.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const specs=()=>group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));

test('Native Sabana terrain provides a complete twelve-body mixed entry, with no state or RNG mutation',()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712});const center=s.structures[0];
 const eye={x:center.x+16,z:center.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);
 const original=serialize(s),bodies=specs(),entry=chooseRaidEntry(s,bodies,nav.activeBounds,0,nav);
 assert.ok(entry);assert.equal(entry.entries.length,12);assert.equal(entry.exits.length,12);
 for(const [i,point] of entry.entries.entries()){
  assert.ok(nav.walkable(point.x,point.z,bodies[i].radius,null,false));const exit=entry.exits[i];assert.ok(nav.walkable(exit.x,exit.z,bodies[i].radius,null,false));assert.ok(nav.segmentClear(point,exit,bodies[i].radius,null,false));
  for(let j=0;j<i;j++)assert.ok(Math.hypot(point.x-entry.entries[j].x,point.z-entry.entries[j].z)>bodies[i].radius+bodies[j].radius+1);
 }
 assert.equal(serialize(s),original);
});

test('A twelve-animal prepared request rejects a stale group reply using actual native navigation',()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712});s.nightPlan={at:400,group:[...group],plannedNight:41,done:false};
 const eye={x:s.structures[0].x+16,z:s.structures[0].z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,s.structures[0]);
 const worker={requests:[],postMessage(request){this.requests.push(request);},terminate(){}};
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);assert.equal(worker.requests.length,1);
 const request=worker.requests[0];s.nightPlan.group=['warthog'];worker.onmessage({data:{key:request.key,token:request.token,entry:null}});
 assert.equal(preparer.stats.obsolete,1);assert.equal(nav.preparedRaidEntry(s,s.nightPlan.group,nav.activeBounds),undefined);preparer.dispose();
});

test('Native impossible footprint bounds refuse the whole group rather than spawning a partial horde',()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712});const center=s.structures[0];
 nav.setActiveBounds([center.x-.01,center.z-.01,center.x+.01,center.z+.01]);nav.setRaidView({x:center.x+16,z:center.z+20},center);
 const original=serialize(s);assert.equal(chooseRaidEntry(s,specs(),nav.activeBounds,0,nav),null);assert.equal(serialize(s),original);
 const nextId=s.nextId;spawnRaid(s,{group},nav);assert.equal(s.raid,null);assert.equal(s.nextId,nextId);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,0);
 // This only records native refusal, not approval of the existing plan.done/dawn behavior.
});
