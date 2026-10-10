import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {enclosureFixture} from '../tools/probe-camera-enclosure.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {createNativeRaidCampaignEvidence} from '../tools/native-raid-campaign-evidence.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'raid-observer'});Game.resume(s,'intro');
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.activeBounds=[-48,-48,48,48];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 s.day=6;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};s.nightPlan={done:true};return {s,nav};
}
test('native contacts reconcile budgets and physical crop replacement costs without mutation through reload',()=>{
 let {s,nav}=fixture();const observer=createNativeRaidCampaignEvidence(s);spawnRaid(s,{group:['warthog']},nav);observer.observe(s);
 const initial=s.raid.animals[0].hitsRemaining;let steps=0;
 while(s.raid&&steps++<12000){Game.tick(s,.05,nav);observer.observe(s);if(steps===20){s=deserialize(serialize(s));nav.setState(s);}}
 assert.equal(s.raid,null);const before=serialize(s),r=observer.report(s);assert.equal(serialize(s),before);assert.equal(r.status,'verified');assert.equal(r.raids.length,1);
 const raid=r.raids[0],species=raid.species.warthog;assert.equal(species.generated,1);assert.equal(species.initialHitBudget,initial);assert.equal(species.contacts+species.misses,initial);assert.equal(raid.ended,true);assert.equal(raid.exposureStatus,'exact-native-spawn');assert.equal(raid.exposedLivingAtSpawn,1);assert.equal(raid.exposedWoundedAtSpawn,0);
 assert.ok(raid.cropHits>0);assert.equal(raid.cropsDestroyed,1);assert.equal(raid.cropReplacementCost,5);assert.equal(raid.lostBaseHarvestValue,11);
 assert.equal(raid.logicalContacts,raid.cropHits+raid.structureHits+raid.shieldContacts);
});
test('native shield contacts spend budget without reporting fictitious crop or structure damage',()=>{
 const {s,nav}=fixture();const observer=createNativeRaidCampaignEvidence(s);spawnRaid(s,{group:['warthog']},nav);observer.observe(s);
 const a=s.raid.animals[0],radius=Game.spellRadius('shield');
 for(let i=0;Math.hypot(a.x-8,a.z-4)>=radius+a.radius+5&&i<12000;i++){Game.tick(s,.05,nav);observer.observe(s);}
 Game.cast(s,'shield','shield',8,4,nav);
 for(let i=0;s.raid&&i<12000;i++){Game.tick(s,.05,nav);observer.observe(s);}
 const r=observer.report(s);assert.equal(r.status,'verified');const raid=r.raids[0];assert.ok(raid.shieldContacts>0);assert.equal(raid.logicalContacts,raid.cropHits+raid.structureHits+raid.shieldContacts);
});
test('lost event window is incomplete instead of silently inventing raid facts',()=>{
 const {s}=fixture(),observer=createNativeRaidCampaignEvidence(s);s.events=[];Game.emit(s,'RaidEnded');const r=observer.report(s);assert.equal(r.status,'incomplete');assert.ok(r.issues.includes('Lost event window'));assert.equal(r.raids.length,0);
});

test('native wall interception uses measured HP loss rather than protection multiplier',()=>{
 const {s,nav}=enclosureFixture(30),observer=createNativeRaidCampaignEvidence(s);spawnRaid(s,{group:['warthog']},nav);observer.observe(s);
 for(let i=0;!s.events.some(e=>e.type==='StructureHit')&&i<2400;i++){s.elapsed+=.05;updateRaid(s,.05,nav);observer.observe(s);}
 const r=observer.report(s);assert.equal(r.status,'verified');const raid=r.raids[0];assert.equal(raid.wallHits,1);assert.equal(raid.wallHpLost,20);assert.equal(raid.cropHits,0);assert.equal(raid.species.warthog.structureHits,1);
});

test('exact native spawn receipt survives a full incursion between observer calls',()=>{
 const {s,nav}=fixture(),observer=createNativeRaidCampaignEvidence(s);spawnRaid(s,{group:['warthog']},nav);const initial=s.raid.animals[0].hitsRemaining;
 for(let i=0;s.raid&&i<12000;i++)Game.tick(s,.05,nav);
 assert.equal(s.raid,null);const r=observer.report(s);assert.equal(r.status,'verified');assert.equal(r.raids[0].species.warthog.initialHitBudget,initial);assert.equal(r.raids[0].exposedLivingAtSpawn,1);assert.equal(r.raids[0].ended,true);
});
