import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {animalSpec,randomInt,permission,hitStructure} from '../src/simulation/rules.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {raidEntryKey} from '../src/world/raid-entry-data.js';
import {Navigation} from '../src/world/navigation.js';
import {prepareNativeRaidEntry as prepare,close} from './helpers/native-raid-entry.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
function fixture(){
 const {s,nav}=createOpeningWorld({biome:'sabana',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds([center.x-.01,center.z-.01,center.x+.01,center.z+.01]);nav.setRaidView(eye,center);
 s.day=100;s.completedNights=99;s.time=599.95;s.initialPreparation=false;s.dayPlan={done:true};s.eventPlan=null;
 s.nightPlan={at:400,plannedNight:100,group:[...group],done:false};return {s,nav,center,eye};
}
const workerTransport=()=>({requests:[],postMessage(request){this.requests.push(request);},terminate(){}});

test('Failed entry consumes one side draw, allocates no actors, and retries no unchanged input',()=>{
 const {s,nav}=fixture(),expected=structuredClone(s),side=randomInt(expected,0,3),id=s.nextId;
 assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(s.rng,expected.rng);assert.equal(s.nightPlan.entryPreferredSide,side);assert.equal(s.nextId,id);assert.equal(s.raid,null);assert.equal(s.nightPlan.done,false);
 const original=serialize(s);for(let i=0;i<20;i++)assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(serialize(s),original);
 assert.equal(s.events.filter(e=>e.type==='NightEntryPending').length,1);
});

test('At pending dawn all simulated clocks, collapses, workers, tasks and ledger freeze; UI and save remain usable',()=>{
 const {s,nav,center}=fixture();
 // Populate real paid plant/worker state before placing this clock-boundary fixture.
 s.day=1;s.completedNights=0;s.time=0;
 let planted=false;for(const dx of [5,8,11])for(const dz of [0,3,-3])if(!planted&&nav.placement(center.x+dx,center.z+dz,.4).valid)planted=Game.plant(s,'plant-fixture','mijo',center.x+dx,center.z+dz,nav);
 assert.ok(planted);Game.openInitialHiring(s);Game.hire(s,'hire-fixture',{olderFemale:1});assert.equal(s.workers.length,1);assert.equal(s.hiringPaidDay,1);
 s.day=100;s.completedNights=99;s.time=599.95;assert.ok(Game.cast(s,'shield-fixture','shield',center.x,center.z,nav));
 hitStructure(center,500,s.elapsed);assert.equal(center.status,'collapsing');
 Game.tick(s,.05,nav);assert.equal(s.time,600);assert.ok(Game.nightEntryPending(s));assert.equal(s.completedNights,99);assert.equal(s.result,null);assert.deepEqual(s.pauses,[]);
 const frozen=serialize(s);Game.tick(s,5,nav);Game.advanceReal(s,5,nav);assert.equal(serialize(s),frozen);assert.ok(permission(s,'camera'));
 const restored=deserialize(frozen),restoredNav=new Navigation(restored.seed,restored.biome,nav.profile);restoredNav.setState(restored);restoredNav.setActiveBounds(nav.activeBounds);restoredNav.setRaidView(nav.raidView.eye,nav.raidView.target);
 Game.tick(restored,5,restoredNav);assert.equal(serialize(restored),frozen);assert.equal(restored.events.filter(e=>['Dawn','CampaignWon','GameOver'].includes(e.type)).length,0);
 Game.pause(restored,'menu');const paused=serialize(restored);Game.tick(restored,5,restoredNav);assert.equal(serialize(restored),paused);Game.resume(restored,'menu');assert.ok(permission(restored,'camera'));
});

test('Changing native camera bounds enables entry at600, preserves side, and draws only successful strike budgets',async()=>{
 const {s,nav,eye}=fixture();Game.tick(s,.05,nav);const selected=s.nightPlan.entryPreferredSide,expected=structuredClone(s);
 for(const id of group){const spec=animalSpec(id);randomInt(expected,spec.hit_budget_min,spec.hit_budget_max);}
 const frozen=serialize(s);Game.tick(s,5,nav);Game.advanceReal(s,5,nav);assert.equal(serialize(s),frozen);
 nav.setActiveBounds(activeChunkRegion(eye).bounds);const p=await prepare(s,nav);try{const elapsed=s.elapsed;Game.tick(s,.001,nav);close(s.elapsed-elapsed,.001);
 assert.ok(s.raid);assert.equal(s.raid.animals.length,12);assert.deepEqual(s.raid.animals.map(a=>a.species),group);assert.equal(s.nightPlan.entryPreferredSide,selected);assert.equal(s.rng,expected.rng);assert.equal(s.nightPlan.done,true);
 assert.equal(s.completedNights,99);assert.equal(s.result,null);assert.equal(s.time,600);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);
 }finally{p.dispose();}
});

test('Persisted side zero has stable prepared keys and isolated worker computation does not redraw',()=>{
 const {s,nav}=fixture();s.nightPlan.entryPreferredSide=0;
 const worker=workerTransport(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);assert.equal(worker.requests.length,1);
 const request=worker.requests[0],rng=request.state.rng,key=raidEntryKey(s,nav,group);s.rng++;assert.equal(raidEntryKey(s,nav,group),key);
 const reply=computeRaidEntry(request);assert.equal(request.state.rng,rng);assert.equal(reply.entry,null);worker.onmessage({data:reply});assert.equal(preparer.stats.accepted,1);
 const before=s.rng;assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(s.rng,before);const saved=serialize(s);assert.equal(deserialize(saved).nightPlan.entryPreferredSide,0);preparer.dispose();assert.equal(nav.preparedRaidEntryRevision,undefined);
});

test('A fresh prepared failure is considered once, including worker recreation with the same token',()=>{
 const {s,nav}=fixture();spawnRaid(s,s.nightPlan,nav);const rng=s.rng;
 for(let lifecycle=0;lifecycle<2;lifecycle++){
  const worker=workerTransport(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);assert.equal(worker.requests[0].token,1);
  worker.onmessage({data:computeRaidEntry(worker.requests[0])});assert.equal(spawnRaid(s,s.nightPlan,nav),'unavailable');assert.equal(preparer.stats.used,1);
  spawnRaid(s,s.nightPlan,nav);assert.equal(preparer.stats.used,1);preparer.dispose();
 }
 assert.equal(s.rng,rng);assert.equal(s.events.filter(e=>e.type==='NightEntryPending').length,1);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,0);
});

test('Successful first attempt keeps original side-plus-strikes RNG order',async()=>{
 const {s,nav,eye}=fixture(),expected=structuredClone(s);const side=randomInt(expected,0,3);
 const strikes=group.map(id=>{const spec=animalSpec(id);return randomInt(expected,spec.hit_budget_min,spec.hit_budget_max);});
 nav.setActiveBounds(activeChunkRegion(eye).bounds);const p=await prepare(s,nav);try{assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');assert.equal(s.nightPlan.entryPreferredSide,side);assert.deepEqual(s.raid.animals.map(a=>a.hitsRemaining),strikes);assert.equal(s.rng,expected.rng);assert.equal(p.stats.used,1);}finally{p.dispose();}
});
