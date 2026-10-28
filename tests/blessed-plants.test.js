import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {awakeningState,activeBlessings} from '../src/simulation/awakenings.js';
import {blessingInfluence,blessingInfluenceStats} from '../src/simulation/blessing-influence.js';
import {createPlant,advancePlant,waterPlant,isMature} from '../src/simulation/crops.js';
import {cropSpec,attraction} from '../src/simulation/rules.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';
import {agriculturalPowerReport,commitAgriculturalPower,settleMultiplyPower} from '../src/simulation/agricultural-power.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
import {BALANCE} from '../src/simulation/balance.js';
import {resolveAgriculturalImpact} from '../src/simulation/raid-agricultural-impact.js';
const fixture=()=>{
  const s=Game.newGame({seed:712,slotId:'blessed-plants'}),nav=clearNavigation();
  Game.placeStructure(s,'center',{x:4,z:0},nav);
  Game.plant(s,'source','maiz',8,0,nav);Game.plant(s,'neighbor','mijo',9.5,0,nav);
  return {s,nav,source:s.plants[0],neighbor:s.plants[1]};
};
const bless=(s,p,id='bless')=>{awakeningState(s).progress=100;assert.equal(Game.bless(s,id,p.id),true);};

test('every original crop can awaken without changing its identity or geometry, watering or harvest',()=>{
  for(const spec of BALANCE.crops){
    const {s,source}=fixture();source.species=spec.id;source.water=createPlant('x',spec.id,0,0).water;
    const before={id:source.id,species:source.species,x:source.x,z:source.z,growth:source.growth};
    bless(s,source);
    for(const [key,value] of Object.entries(before))assert.equal(source[key],value);
    assert.equal(isMature(source),false);assert.equal(waterPlant(source),false);
    assert.equal(advancePlant(source,1000,true),0);assert.equal(source.growth,before.growth);
    source.growth=spec.growth_seconds;assert.equal(isMature(source),false);
    assert.throws(()=>Game.harvest(s,'illegal-harvest',source.id));assert.equal(source.alive,true);
    assert.ok(Game.previewSpell(s,'growth',source.x,source.z,clearNavigation(),source.id).reason);
  }
});
test('invalid, paused and repeated commands never consume a charge, and replay never grants another blessing',()=>{
  const {s,source}=fixture();awakeningState(s).progress=100;
  for(const id of ['missing',s.structures[0].id])assert.throws(()=>Game.bless(s,'invalid-'+id,id));
  assert.equal(s.awakenings.progress,100);assert.equal(s.awakenings.total,0);
  Game.pause(s,'menu');assert.throws(()=>Game.bless(s,'paused',source.id));Game.resume(s,'menu');
  assert.equal(s.awakenings.progress,100);bless(s,source);
  const saved=serialize(s);assert.equal(Game.bless(s,'bless',source.id),false);assert.equal(serialize(s),saved);
  awakeningState(s).progress=100;assert.throws(()=>Game.bless(s,'again',source.id));assert.equal(s.awakenings.progress,100);
});
test('transforming an assigned task releases its worker and source can never reenter a work queue',()=>{
  const {s,nav,source}=fixture();Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  Game.tick(s,.1,nav);assert.ok(s.tasks.some(t=>t.targetId===source.id&&t.workerId));
  bless(s,source);assert.ok(s.workers.every(w=>!s.tasks.some(t=>t.targetId===source.id&&t.id===w.taskId)));
  assert.ok(!s.tasks.some(t=>t.targetId===source.id));Game.rebuildTasks(s);
  Game.tick(s,240,nav);assert.ok(!s.tasks.some(t=>t.targetId===source.id));assert.ok(source.alive);
  assert.ok(!s.crates.some(c=>c.sourcePlantId===source.id));
});
test('one source influences the four nearest grid neighbors, overlap is capped and its index is reused',()=>{
  const {s,source}=fixture();bless(s,source);
  const grid=[[-1.5,0],[1.5,0],[0,-1.5],[0,1.5],[-1.5,-1.5],[1.5,1.5],[0,3]].map(([x,z],i)=>createPlant('g'+i,'mijo',8+x,z,'center'));
  assert.equal(grid.filter(p=>blessingInfluence(s,p).growth>0).length,4);
  const p=grid[1],one=blessingInfluence(s,p);assert.equal(one.growth,.2);assert.equal(one.harvestPercent,20);
  const before=blessingInfluenceStats(s).builds;
  for(let i=0;i<1000;i++)assert.strictEqual(blessingInfluence(s,p),one);
  assert.equal(blessingInfluenceStats(s).builds,before);assert.ok(blessingInfluenceStats(s).hits>=1000);
  for(let i=0;i<8;i++){
    const q=createPlant('overlap-'+i,'maiz',8.1+i*.01,.1,s.structures[0].id);s.plants.push(q);bless(s,q,'bless-'+i);
  }
  const overlap=blessingInfluence(s,p);assert.equal(overlap.growth,.35);assert.equal(overlap.harvestPercent,35);
  assert.equal(overlap.waterTolerance,.2);assert.equal(blessingInfluence(s,source).growth,0);
});
test('passive growth is 20% faster, waits for manual watering and increases tolerance without spending spell power',()=>{
  const {s,source,neighbor}=fixture();bless(s,source);
  const ordinary=structuredClone(neighbor);waterPlant(ordinary);waterPlant(neighbor);
  advancePlant(ordinary,5);advancePlant(neighbor,5,false,blessingInfluence(s,neighbor));
  assert.ok(Math.abs(neighbor.growth/ordinary.growth-1.2)<1e-9);
  const checkpoint=neighbor.water.find(w=>w.status==='future');neighbor.growth=checkpoint.at;
  checkpoint.status='due';checkpoint.wait=cropSpec(neighbor.species).derived_tolerance_seconds;
  const before=neighbor.growth;advancePlant(neighbor,1,false,blessingInfluence(s,neighbor));assert.ok(neighbor.growth>before);
  checkpoint.wait=cropSpec(neighbor.species).derived_tolerance_seconds*1.2;
  const stopped=neighbor.growth;advancePlant(neighbor,5,false,blessingInfluence(s,neighbor));assert.equal(neighbor.growth,stopped);
  assert.equal(s.agriculturalPower,undefined);
});
test('active Grow entitlement consumption remains separate from passive growth',()=>{
  const {s,source,neighbor}=fixture();bless(s,source);waterPlant(neighbor);
  const spell=commitAgriculturalPower(s,neighbor,'growth',11),before=JSON.stringify(agriculturalPowerReport(s).growth);
  const extra=advancePlant(neighbor,1,spell.intensity,blessingInfluence(s,neighbor));
  assert.ok(Math.abs(extra-.5*spell.intensity)<1e-9);
  assert.ok(Math.abs(neighbor.growth-(1.2+extra))<1e-9);
  assert.equal(JSON.stringify(agriculturalPowerReport(s).growth),before);
});
test('harvest gains floor(20% base) once, survives pickup reload and requires paid physical delivery',()=>{
  let {s,nav,source,neighbor}=fixture();bless(s,source);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
  const balance=numberOf(s.ledger.balance);neighbor.growth=cropSpec(neighbor.species).growth_seconds;
  for(const w of neighbor.water)w.status='manual';
  Game.tick(s,.1,nav);
  for(let i=0;i<500&&!s.crates.length;i++)Game.tick(s,.1,nav);
  assert.ok(s.crates.length);assert.equal(numberOf(s.ledger.balance),balance,'picking is not income');
  const crate=s.crates[0];assert.equal(numberOf(crate.blessingBonus),2);assert.equal(numberOf(crate.value),13);
  s=deserialize(serialize(s));
  Game.tick(s,100,nav);assert.equal(numberOf(s.ledger.entries['deliver:'+crate.id]),13);
  const after=numberOf(s.ledger.balance);Game.tick(s,10,nav);assert.equal(numberOf(s.ledger.balance),after);
  assert.equal(s.crates.filter(c=>c.sourcePlantId===source.id).length,0);
});
test('passive harvest does not multiply worker, event or active Multiply awards',()=>{
  const {s,nav,source,neighbor}=fixture();bless(s,source);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  neighbor.growth=cropSpec(neighbor.species).growth_seconds;for(const w of neighbor.water)w.status='manual';
  const commitment=commitAgriculturalPower(s,neighbor,'multiply',11);neighbor.multiplyHarvest=true;neighbor.harvestBonus=30;
  Game.tick(s,100,nav);const crate=s.crates.find(c=>c.sourcePlantId===neighbor.id);assert.ok(crate?.delivered);
  assert.equal(numberOf(crate.blessingBonus),2);
  assert.ok(Math.abs(numberOf(crate.value)-(11*1.2*1.3+2))<1e-9);
  const expected=Math.ceil(11*1.2*1.3+2+Math.floor(numberOf(commitment.amount)));
  assert.equal(numberOf(s.ledger.entries['deliver:'+crate.id]),expected);
  assert.equal(numberOf(settleMultiplyPower(s,crate)),0);
});
test('sources remain physical raid targets, survive an incidental hit and disappear immediately on sustained damage',()=>{
  const {s,source,neighbor}=fixture();const pressure=attraction(s.plants);bless(s,source);
  assert.equal(attraction(s.plants),pressure,'passive sale bonus adds no animal pressure');
  const first=applyCropImpact(s,source,1);assert.equal(first.destroyed,false);assert.equal(source.alive,true);
  Game.emit(s,'CropHit',{targetId:source.id,...first});
  assert.ok(s.messages.some(m=>m.target===source.id&&m.text.includes('ataque')));
  assert.equal(blessingInfluence(s,neighbor).growth,.2);
  const second=applyCropImpact(s,source,1);Game.emit(s,'CropHit',{targetId:source.id,...second});
  assert.equal(source.alive,false);assert.equal(source.blessing,undefined);assert.equal(s.awakenings.destroyed,1);
  assert.equal(blessingInfluence(s,neighbor).growth,0);assert.equal(activeBlessings(s).length,0);
  assert.ok(s.events.some(e=>e.type==='BlessingDestroyed'));assert.equal(applyCropImpact(s,source,1),null);
  assert.equal(s.awakenings.destroyed,1);assert.doesNotThrow(()=>deserialize(serialize(s)));
});
test('fractional peripheral area impacts and dangerous direct attacks use the shared two-HP model',()=>{
  const {s,source}=fixture();bless(s,source);
  for(let i=0;i<7;i++)assert.equal(applyCropImpact(s,source,.25).destroyed,false);
  assert.equal(applyCropImpact(s,source,.25).destroyed,true);
  const other=fixture();bless(other.s,other.source);assert.equal(applyCropImpact(other.s,other.source,3).destroyed,true);
});
test('real area resolver includes a blessed source and applies peripheral damage once per attack',()=>{
  const {s,nav,source}=fixture();nav.version=1;bless(s,source);
  const central=createPlant('central','mijo',8,-1.5,s.structures[0].id);s.plants.push(central);
  const animal={id:'beast',x:8,z:-3,heading:0,radius:1.1,attackId:'a1',
    damageProfile:{cropDamage:1,structureDamage:25,attackRadius:3,areaCap:7,peripheralWeight:.5}};
  const fact=resolveAgriculturalImpact(s,animal,central,nav),sourceHit=fact.hits.find(h=>h.targetId===source.id);
  assert.equal(sourceHit.damage,.5);assert.equal(sourceHit.destroyed,false);assert.equal(central.alive,false);
  assert.equal(resolveAgriculturalImpact(s,animal,central,nav).duplicate,true);assert.equal(source.attackHits,.5);
  assert.doesNotThrow(()=>serialize(s));
});
test('a permanent source alone cannot generate harvests or automatic income without workers',()=>{
  const {s,nav,source}=fixture();bless(s,source);const before=numberOf(s.ledger.balance);
  Game.tick(s,299,nav);assert.equal(s.crates.length,0);assert.equal(numberOf(s.ledger.balance),before);
  const loaded=deserialize(serialize(s));assert.equal(loaded.plants[0].blessing.ordinal,source.blessing.ordinal);
  assert.equal(blessingInfluence(loaded,loaded.plants[1]).harvestPercent,20);
});
test('active spell commitments on a newly blessed source are forfeited without refilling budgets or minting a crate',()=>{
  const {s,source}=fixture();const power=commitAgriculturalPower(s,source,'multiply',100);
  s.spells.push({id:'spell',kind:'multiply',x:source.x,z:source.z,radius:.65,targetPlantId:source.id,remaining:30,power});
  const committed=JSON.stringify(agriculturalPowerReport(s).multiply.committed);bless(s,source);
  assert.equal(source.multiplyPower,undefined);assert.equal(s.spells.length,0);assert.equal(s.crates.length,0);
  const report=agriculturalPowerReport(s).multiply;
  assert.equal(JSON.stringify(report.committed),committed);assert.equal(numberOf(report.pending),0);assert.ok(numberOf(report.forfeited)>0);
  assert.doesNotThrow(()=>serialize(s));
});
test('malformed blessing provenance, censes and impossible source tasks cannot be saved',()=>{
  const {s,source}=fixture();bless(s,source);const saved=serialize(s);
  for(const mutate of [s=>s.plants[0].blessing.ordinal=9,s=>s.awakenings.destroyed=1,
    s=>s.plants[0].harvestRequested=true,s=>s.tasks.push({id:'bad',targetId:source.id})]){
    const bad=JSON.parse(saved);mutate(bad);assert.throws(()=>serialize(bad));
  }
});
