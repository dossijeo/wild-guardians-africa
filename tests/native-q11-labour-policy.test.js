import test from 'node:test';
import assert from 'node:assert/strict';
import {q11PlantingReserve,createQ11LabourPolicy} from '../tools/native-q11-labour-policy.mjs';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
test('planting reserve never drops below native minimum and recovers full renewal at shift end',()=>{
 assert.equal(q11PlantingReserve(0,90),30);assert.equal(q11PlantingReserve(140,90),30);
 assert.equal(q11PlantingReserve(220,90),45);assert.equal(q11PlantingReserve(300,90),90);
 assert.equal(q11PlantingReserve(600,90),90);assert.equal(q11PlantingReserve(0,30),30);
 let previous=0;for(let t=0;t<=300;t++){const r=q11PlantingReserve(t,510);assert.ok(r>=previous);previous=r;}
 for(const [t,r] of [[-1,90],[NaN,90],[0,-1],[0,90.5]])assert.throws(()=>q11PlantingReserve(t,r));
});
test('actual native purchases reinvest early cash without spending the last thirty coins',()=>{
 const s=Game.newGame({seed:712,slotId:'q11-budget-fixture'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 assert.ok(Game.placeStructure(s,'center',{x:-15,z:0},nav));
 // Explicit command-test funds, not campaign income or physical deliveries.
 s.day=9;s.time=0;s.ledger.balance=rational(136);s.pauses=['hiring'];
 const q=createQ11LabourPolicy();Game.hire(s,'hire',{olderFemale:3});q.hired(s,3,{daily:true});
 assert.equal(numberOf(s.ledger.balance),46);assert.equal(q.reserve(),90);
 assert.ok(q.canSpend(s,5));
 for(let n=0;n<3;n++){assert.ok(q.canSpend(s,5));assert.ok(Game.plant(s,'seed-'+n,'mijo',n*1.5,0,nav));}
 assert.equal(numberOf(s.ledger.balance),31);assert.equal(s.plants.length,3);assert.equal(q.canSpend(s,5),false);
 assert.throws(()=>Game.plant(s,'last-seed','mijo',6,0,nav),/últimas 30/);
});
test('pending actual repairs remain reserved and restored state uses the same deterministic budget',()=>{
 const s=Game.newGame({seed:712,slotId:'q11-state-fixture'});s.time=220;s.ledger.balance=rational(70);
 const q=createQ11LabourPolicy();q.hired(s,3,{daily:true});
 assert.equal(q.plantingReserve(s),45);assert.equal(q.canSpend(s,5,{pendingRepair:21}),false);
 assert.equal(q.canSpend(s,5,{pendingRepair:20}),true);
 const restored=deserialize(serialize(s));assert.equal(q.plantingReserve(restored),q.plantingReserve(s));
 assert.equal(q.reserve(),90);assert.throws(()=>q.canSpend(s,5,{pendingRepair:-1}));
});

test('Q11 is explicitly selected, source-hashed and does not change default or crop resistance',()=>{
 const args=parseNativeCampaignArgs(['--out','fixture','--labour-policy','q11']);
 const provenance=nativeCampaignProvenance(args);assert.ok(provenance.sourceHashes['tools/native-q11-labour-policy.mjs']);
 assert.match(provenance.protocol.id,/-q11$/);assert.equal(provenance.protocol.cropHitPoints,1);
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).labourPolicy,'legacy');
});
