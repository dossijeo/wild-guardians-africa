import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateActiveFarm} from '../tools/check_active_farm.mjs';
import {cropSpec} from '../src/simulation/rules.js';
import {add} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
test('fixed unfortified farm keeps legal work, deliveries, spells and accounting through a real military loss',()=>{
  const report=simulateActiveFarm({profile:'olderFemale',repairBelowHp:540}),s=report.state;
  assert.equal(s.result,'defeat');assert.ok(s.completedNights>=6&&s.completedNights<100);
  assert.equal(report.counts.GameOver,1);assert.equal(report.counts.CampaignWon??0,0);
  assert.ok(report.counts.StructureRuined>=1,'The center must actually be ruined');
  assert.ok(report.money>0,'A military loss can happen while cash remains');
  assert.ok(report.counts.RaidSpawned>=6);assert.equal(report.counts.RaidEnded,report.counts.RaidSpawned);
  // Faster routes can complete an exhausted incursion in the same simulation
  // step that starts it. Only raids still active at the checkpoint are saved.
  assert.ok(report.reloads>0&&report.reloads<=report.counts.RaidSpawned);
  assert.ok(report.magic.growth>100&&report.magic.multiply>0&&report.magic.shield>0);
  assert.ok(report.daily.slice(4).some(day=>day.delivered>0),'The farm must earn real delivery income');
  assert.equal(report.daily.length,s.day);
  const hires=Object.entries(s.ledger.entries).filter(([id])=>id.startsWith('active-hire-'));
  assert.equal(hires.length,s.day);assert.equal(hires.filter(([,v])=>v.n==='0').length,4);
  assert.equal(hires.filter(([,v])=>v.n==='-30').length,s.day-4);
  let balance=1500n;
  for(const value of Object.values(s.ledger.entries)){assert.equal(value.d,'1');balance+=BigInt(value.n);}
  assert.equal(s.ledger.balance.n,String(balance));assert.equal(s.ledger.balance.d,'1');
  assert.equal(s.plants.length,Object.keys(s.ledger.entries).filter(id=>id.startsWith('active-plant-')).length);
  const sources=new Set();
  for(const crate of s.crates){
    const plant=s.plants.find(p=>p.id===crate.sourcePlantId);assert.ok(plant&&!plant.alive);assert.equal(crate.species,plant.species);
    assert.ok(!sources.has(plant.id));sources.add(plant.id);assert.ok(plant.growth>=cropSpec(plant.species).growth_seconds);
    assert.ok(plant.water.every(w=>['manual','magic'].includes(w.status)),'Each picked plant must have satisfied every mandatory watering');
    if(crate.delivered){
      const earned=add(crate.value,crate.multiplyIncome);
      const n=BigInt(earned.n),d=BigInt(earned.d);
      assert.equal(s.ledger.entries[`deliver:${crate.id}`].n,String((n+d-1n)/d));
      assert.equal(crate.carrierId,null);
    }else assert.ok(!Object.hasOwn(s.ledger.entries,`deliver:${crate.id}`));
  }
  assert.equal(report.counts.CrateDelivered,s.crates.filter(c=>c.delivered).length);
  assert.equal(report.counts.CropPicked,s.crates.length);
  assert.ok(report.deliveries.girasol>0);
  assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
