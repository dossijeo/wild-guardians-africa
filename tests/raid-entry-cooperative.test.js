import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryComputation} from '../src/world/raid-entry-computation.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const biome=process.env.HORDE_PREFLIGHT_BIOME??'desierto';
function fixture(){const {s,nav}=createOpeningWorld({biome,seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:[...group],done:false};return {s,nav};}
test(`${biome}: cooperative slices converge to identical worker result without restarting or mutating main nav`,()=>{
 const {s,nav}=fixture(),before=serialize(s),key=raidEntryKey(s,nav,group),request=raidEntryRequest(s,nav,group,key,1),originalRequest=JSON.stringify(request);
 const reference=computeRaidEntry(request),computation=new RaidEntryComputation(request),methods=['walkable','segmentClear','findPathSteps','path','pathSteps','approachPath'],descriptors=methods.map(name=>Object.getOwnPropertyDescriptor(nav,name));
 let step,previousChecks=0,slices=0;try{
  do{step=computation.pump({maxBoundaries:4,maxGeometryChecks:256});slices++;assert.ok(slices<20000);assert.ok(computation.entryWork.geometryChecks>=previousChecks);previousChecks=computation.entryWork.geometryChecks;for(let i=0;i<methods.length;i++)assert.deepEqual(Object.getOwnPropertyDescriptor(nav,methods[i]),descriptors[i]);}while(!step.done);
  assert.ok(slices>1);assert.deepEqual(step.value,reference);assert.equal(JSON.stringify(request),originalRequest);assert.equal(serialize(s),before);
  assert.ok(step.value.entry);assert.equal(step.value.entry.entries.length,12);
  if(biome==='desierto'){const historical=JSON.parse(readFileSync(new URL('../docs/qa/horde-entry-retry/desert-capped-native-arrival/arrival.json',import.meta.url)));assert.deepEqual(step.value.entry,historical.entry,'Historical frozen entry geometry must remain exact');}
  console.log(JSON.stringify({scope:'CPU cooperative request only, not frame/GPU acceptance',biome,...computation.metrics,entryWork:computation.entryWork,warmWork:computation.warmWork}));
 }finally{computation.dispose();}
});
test('Worker-disabled preparation eventually supplies a whole group and resumes native pending600',()=>{
 const {s,nav}=fixture();Game.tick(s,600,nav);assert.equal(s.time,600);assert.equal(s.raid,null);const frozenElapsed=s.elapsed,side=s.nightPlan.entryPreferredSide,rng=s.rng;
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('No worker');},sliceOptions:{maxBoundaries:8,maxGeometryChecks:256}});let slices=0;
 try{do{preparer.update(s);slices++;assert.ok(slices<20000);if(!preparer.ready){Game.tick(s,1,nav);assert.equal(s.elapsed,frozenElapsed);assert.equal(s.rng,rng);assert.equal(s.nightPlan.entryPreferredSide,side);assert.equal(s.raid,null);}}while(!preparer.ready);
  assert.equal(preparer.stats.cooperativeCompleted,1);assert.ok(slices>1);assert.equal(preparer.ready.entry.entries.length,12);
  Game.tick(s,.1,nav);assert.ok(s.raid);assert.equal(s.raid.animals.length,12);assert.equal(s.nightPlan.entryPreferredSide,side);assert.ok(s.elapsed>frozenElapsed);
 }finally{preparer.dispose();}
});
test('Camera/side invalidation closes old continuation and disposal leaves no active work',()=>{
 const {s,nav}=fixture(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('No worker');},sliceOptions:{maxBoundaries:1,maxGeometryChecks:1}});
 preparer.update(s);const first=preparer.cooperative.computation;nav.setRaidView({x:nav.raidView.eye.x+1,z:nav.raidView.eye.z},nav.raidView.target);preparer.update(s);assert.equal(first.disposed,true);assert.equal(preparer.stats.cooperativeAborts,1);
 const second=preparer.cooperative.computation;s.nightPlan.entryPreferredSide=0;preparer.update(s);assert.equal(second.disposed,true);assert.equal(preparer.cooperative.computation.side,0);
 const third=preparer.cooperative.computation;preparer.dispose();assert.equal(third.disposed,true);assert.equal(preparer.cooperative,null);assert.equal(nav.preparedRaidEntry,undefined);
 const restored=deserialize(serialize(s));assert.equal(restored.nightPlan.entryPreferredSide,0);assert.equal('cooperative' in restored,false);
});
