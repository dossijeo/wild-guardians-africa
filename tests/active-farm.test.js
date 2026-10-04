import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateActiveFarm} from '../tools/check_active_farm.mjs';
import {cropSpec} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const species=['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'];
for(const diversifyDay of [null,20])test(`Sabana/Mapungubwe/712/olderFemale: ${diversifyDay?'mixed eight-crop':'sunflower'} farm sustains paid work, real deliveries and raids through night 100`,()=>{
  const report=simulateActiveFarm({diversifyDay,profile:'olderFemale',repairBelowHp:540}),s=report.state;
  assert.equal(s.result,'victory');assert.equal(s.completedNights,100);assert.equal(s.day,101);assert.equal(s.raid,null);
  assert.equal(report.counts.CampaignWon,1);assert.equal(report.counts.GameOver??0,0);
  assert.ok(report.counts.RaidSpawned>=20);assert.equal(report.counts.RaidEnded,report.counts.RaidSpawned);
  // Faster routes can complete an exhausted incursion in the same simulation
  // step that starts it. Only raids still active at the checkpoint are saved.
  assert.ok(report.reloads>0&&report.reloads<=report.counts.RaidSpawned);assert.ok(report.magic.growth>100&&report.magic.multiply>100&&report.magic.shield>0);
  assert.ok(report.daily.slice(4).every(day=>day.delivered>0),'Every operating day must deliver crops, not just wait out the campaign');
  assert.ok(report.money>1000);assert.equal(report.daily.length,100);
  const hires=Object.entries(s.ledger.entries).filter(([id])=>id.startsWith('active-hire-'));
  assert.equal(hires.length,100);assert.equal(hires.filter(([,v])=>v.n==='0').length,4);assert.equal(hires.filter(([,v])=>v.n==='-30').length,96);
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
      const n=BigInt(crate.value.n),d=BigInt(crate.value.d);assert.equal(s.ledger.entries[`deliver:${crate.id}`].n,String((n+d-1n)/d));
      assert.equal(crate.carrierId,null);
    }else assert.ok(!Object.hasOwn(s.ledger.entries,`deliver:${crate.id}`));
  }
  assert.equal(report.counts.CrateDelivered,s.crates.filter(c=>c.delivered).length);
  assert.equal(report.counts.CropPicked,s.crates.length);
  if(diversifyDay){assert.equal(report.diversified,true);for(const id of species)assert.ok(report.deliveries[id]>0,`${id} must complete delivery, not just be planted`);}
  assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
