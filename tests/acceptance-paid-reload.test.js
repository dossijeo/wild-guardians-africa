import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {isMature} from '../src/simulation/crops.js';
import {applyEvent} from '../src/simulation/events.js';
import {workerPose} from '../src/rendering/worker-actions.js';
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url)));
const profiles=['olderMale','olderFemale','youngMale','youngFemale'];
// Production navigation/collisions on explicitly flat, prop-free terrain.
// Credit/postcampaign state isolates reload from campaign profitability/raids.
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.setState(s);return n;}
function farm(profile){
 const s=Game.newGame({seed:712,slotId:'paid-'+profile});Game.resume(s,'intro');s.ledger.balance=rational(10000);
 const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
 Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});Game.placeStructure(s,'second-center',{x:-40,z:30},nav);
 return {s,nav};
}
function until(s,nav,predicate,limit=249){for(let i=0;i<limit*20&&!predicate()&&!s.result&&!s.pauses.length;i++)Game.tick(s,.05,nav);assert.ok(predicate(),`Not reached: ${s.time}/${s.workers[0].status}`);}
function saved(s){const map=new Map(),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const repo=new SaveRepository(store);repo.save(s);return repo.load(s.slotId);}
function domain(s){const copy=JSON.parse(serialize(s));for(const w of copy.workers)delete w.pathVersion;return copy;}
function pose(s){const w=s.workers[0];return workerPose(w,s.tasks.find(t=>t.id===w.taskId),s.elapsed,libraries[w.profile]);}
function paired(s,nav,loaded,restoredNav,seconds){
 for(let i=0;i<seconds*20;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,restoredNav);}
 // Navigation cache epochs restart in a fresh Navigation. Every other persisted
 // field, including paths, motion phases, reservations and RNG, must match.
 assert.deepEqual(domain(loaded),domain(s));assert.deepEqual(pose(loaded),pose(s));
}

for(const profile of profiles)test(`QA-146: ${profile} reload keeps a paid initial action and intraday assignments`,()=>{
 const {s,nav}=farm(profile);until(s,nav,()=>s.workers[0].status==='acting');Game.tick(s,.4,nav);
 const w=s.workers[0],task=s.tasks.find(t=>t.id===w.taskId),cash=JSON.stringify(s.ledger);
 assert.equal(task.kind,'initial');assert.equal(task.workerId,w.id);assert.equal(w.centerId,s.structures[0].id);
 const loaded=saved(s),restoredNav=navigation(loaded);assert.equal(serialize(loaded),serialize(s));assert.deepEqual(pose(loaded),pose(s));
 assert.equal(Game.hire(loaded,'duplicate-paid',{[profile]:2}),false);assert.equal(JSON.stringify(loaded.ledger),cash);
 paired(s,nav,loaded,restoredNav,10);assert.equal(s.plants[0].water[0].status,'manual');
 assert.equal(s.events.filter(e=>e.type==='WaterSatisfied').length,1);
 assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);assert.equal(s.workers.length,1);
 assert.equal(s.workers[0].centerId,s.structures[0].id);assert.equal(JSON.stringify(s.ledger),cash);
});

for(const profile of profiles)test(`QA-147: ${profile} reload preserves one native carry phase and bonus-valued crate until one delivery`,()=>{
 const {s,nav}=farm(profile);until(s,nav,()=>isMature(s.plants[0]));
 s.eventPlan={id:'fertile',kind:'fertile',negative:false,magnitude:.3};applyEvent(s);Game.harvest(s,'harvest',s.plants[0].id);
 until(s,nav,()=>s.workers[0].status==='acting',60);Game.cast(s,'multiply','multiply',8,4,nav);
 until(s,nav,()=>s.workers[0].status==='carrying',5);Game.tick(s,.2,nav);
 const loaded=saved(s),restoredNav=navigation(loaded),cash=numberOf(s.ledger.balance),crate=s.crates[0];
 assert.equal(serialize(loaded),serialize(s));assert.equal(crate.carrierId,s.workers[0].id);assert.equal(s.workers[0].crateId,crate.id);
 assert.equal(pose(loaded).name,'Carry_Crate');assert.deepEqual(pose(loaded),pose(s));
 assert.equal(s.plants[0].alive,false);assert.equal(crate.sourcePlantId,s.plants[0].id);assert.equal(crate.delivered,false);
 const male=profile.endsWith('Male');assert.deepEqual(crate.value,male?rational(1092,25):rational(182,5));
 paired(s,nav,loaded,restoredNav,40);assert.equal(s.crates.length,1);assert.equal(crate.delivered,true);assert.equal(s.spells.length,0);
 assert.equal(numberOf(s.ledger.balance),cash+(male?44:37));assert.equal(s.events.filter(e=>e.type==='CropPicked').length,1);
 assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);assert.equal(Object.keys(s.ledger.entries).filter(id=>id.startsWith('deliver:')).length,1);
 const settled=saved(loaded),settledNav=navigation(settled),value=numberOf(settled.ledger.balance);Game.tick(settled,5,settledNav);
 assert.equal(settled.crates.length,1);assert.equal(numberOf(settled.ledger.balance),value);assert.equal(settled.crates[0].delivered,true);
});
