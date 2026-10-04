import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
function fixture(){
 const s=Game.newGame({slotId:'multiply-persistence'});Game.resume(s,'intro');
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});s.day=101;s.completedNights=100;s.postgame=true;s.workers[0].contractDay=101;s.tutorial.step='done';s.initialPreparation=false;s.dayPlan={done:true};
 return {s,nav};
}
function until(s,nav,check,seconds=240){for(let i=0;!check()&&i<seconds*20;i++)Game.tick(s,.05,nav);assert.ok(check());}
for(const reloadAt of ['none','active','expired','carrying'])test(`marked sprout earns double only after physical collection and delivery (${reloadAt})`,()=>{
 let {s,nav}=fixture();Game.cast(s,'multiply','multiply',8,4,nav);
 assert.equal(s.plants[0].multiplyHarvest,true);assert.equal(s.plants[0].growth,0);
 const cash=numberOf(s.ledger.balance);
 if(reloadAt==='active'){s=deserialize(serialize(s));nav.setState(s);}
 Game.tick(s,15,nav);assert.equal(s.spells.length,0);assert.equal(s.plants[0].multiplyHarvest,true);assert.equal(numberOf(s.ledger.balance),cash);
 if(reloadAt==='expired'){s=deserialize(serialize(s));nav.setState(s);}
 until(s,nav,()=>s.crates.length===1);
 assert.equal(s.plants[0].alive,false);assert.equal(s.plants[0].multiplyHarvest,false);
 assert.equal(s.plants[0].water.every(w=>w.status==='manual'),true);
 assert.equal(numberOf(s.crates[0].value),18);assert.equal(s.crates[0].delivered,false);assert.equal(numberOf(s.ledger.balance),cash);
 if(reloadAt==='carrying'){s=deserialize(serialize(s));nav.setState(s);}
 until(s,nav,()=>s.crates[0].delivered,60);assert.equal(numberOf(s.ledger.balance),cash+18);
 Game.tick(s,10,nav);assert.equal(s.crates.length,1);assert.equal(numberOf(s.ledger.balance),cash+18);
 assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);
});
test('exposure includes new sprouts during the active interval, but neither outside nor after expiry',()=>{
 const {s,nav}=fixture();Game.cast(s,'multiply','multiply',8,4,nav);
 Game.plant(s,'inside','mijo',8,5.5,nav);assert.equal(s.plants.at(-1).multiplyHarvest,true);
 Game.plant(s,'outside','mijo',8,7,nav);assert.notEqual(s.plants.at(-1).multiplyHarvest,true);
 Game.tick(s,15,nav);Game.plant(s,'late','mijo',8,2.5,nav);assert.notEqual(s.plants.at(-1).multiplyHarvest,true);
});
test('legacy active areas are marked once, and pauses freeze the exposure interval',()=>{
 let {s,nav}=fixture();s.spells.push({id:'legacy',kind:'multiply',x:8,z:4,radius:2.2,remaining:15});
 s=deserialize(serialize(s));nav.setState(s);Game.pause(s,'menu');const before=serialize(s);Game.tick(s,20,nav);assert.equal(serialize(s),before);
 Game.resume(s,'menu');Game.tick(s,.1,nav);assert.equal(s.plants[0].multiplyHarvest,true);assert.equal(s.spells[0].exposureApplied,true);
 const p=s.plants[0];let reads=0;const x=p.x;Object.defineProperty(p,'x',{get(){reads++;return x;},enumerable:true});s.time=310;s.nightPlan={done:true,group:[]};s.workers=[];
 Game.tick(s,1,nav);assert.equal(reads,0,'night update does not scan static crops again for exposure');
});
test('all powers accept finite terrain points even when building and walking are invalid',()=>{
 for(const kind of ['growth','multiply','shield']){
  const {s,nav}=fixture();nav.terrainValid=()=>{throw new Error('terrain placement must not be consulted');};
  assert.equal(Game.previewSpell(s,kind,80,80,nav).valid,true);Game.cast(s,'cast',kind,80,80,nav);assert.equal(s.spells[0].kind,kind);
 }
});
test('saved exposure fields reject malformed state while accepting older absent fields',()=>{
 const {s}=fixture();s.plants[0].multiplyHarvest='yes';assert.throws(()=>serialize(s));delete s.plants[0].multiplyHarvest;assert.doesNotThrow(()=>serialize(s));
 s.spells.push({id:'bad',kind:'multiply',x:0,z:0,radius:2.2,remaining:15,exposureApplied:1});assert.throws(()=>serialize(s));
});

test('repeated casts mark the same slow-growing crop without stacking beyond double',()=>{
 const {s,nav}=fixture();Game.plant(s,'slow','yuca',20,4,nav);const p=s.plants.at(-1);
 Game.cast(s,'first','multiply',p.x,p.z,nav);Game.tick(s,120,nav);
 assert.equal(p.multiplyHarvest,true);assert.equal(s.cooldowns.multiply,0);
 Game.cast(s,'second','multiply',p.x,p.z,nav);assert.equal(p.multiplyHarvest,true);
 until(s,nav,()=>s.time===300);
 s.nightPlan={done:true,group:[]};s.eventPlan=null;Game.tick(s,300,nav);
 Game.hire(s,'next-day',{olderFemale:1});s.dayPlan={done:true};
 until(s,nav,()=>s.crates.some(c=>c.sourcePlantId===p.id),295);
 const crate=s.crates.find(c=>c.sourcePlantId===p.id);assert.equal(numberOf(crate.value),56);
});
