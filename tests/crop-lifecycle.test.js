import test from 'node:test';
import assert from 'node:assert/strict';
import {createCropLifecycleObserver} from '../tools/crop-lifecycle.mjs';
import {simulateIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {createPlant,waterPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

test('lifecycle brackets watering and work changes, distinguishes pickup from settled delivery and retains terminal evidence across reloads',()=>{
 const plant=createPlant('plant-1','platano',4,5,'center-1');
 const s={day:1,time:10,elapsed:10,plants:[plant],workers:[],tasks:[{id:'task-1',kind:'initial',targetId:plant.id,workerId:null,blocked:false}],crates:[],ledger:{entries:{}}};
 const observer=createCropLifecycleObserver();
 const sample=()=>{const before=JSON.stringify(s);observer.observe(s);assert.equal(JSON.stringify(s),before);};
 sample();s.time=s.elapsed=11;s.tasks[0].workerId='worker-1';s.workers.push({id:'worker-1',status:'acting'});sample();
 waterPlant(plant);s.tasks=[];s.time=s.elapsed=12;sample();
 plant.water[1].status='due';plant.water[1].wait=cropSpec('platano').derived_tolerance_seconds;s.time=s.elapsed=13;sample();
 waterPlant(plant);s.time=s.elapsed=14;sample();
 for(const water of plant.water)water.status='manual';plant.growth=cropSpec('platano').growth_seconds;s.time=s.elapsed=15;sample();
 plant.alive=false;s.crates.push({id:'crate-1',species:'platano',sourcePlantId:plant.id,delivered:false});s.time=s.elapsed=16;sample();
 let row=observer.report().crops[0];assert.equal(row.outcome,'picked');assert.equal(row.income,undefined);
 s.crates[0].delivered=true;s.ledger.entries['deliver:crate-1']={n:'240',d:'1'};s.time=s.elapsed=17;sample();
 row=observer.report().crops[0];assert.equal(row.outcome,'delivered');assert.equal(row.income,'240');
 assert.ok(row.timeline.some(e=>e.type==='task-change'&&e.task?.workerId==='worker-1'));
 assert.deepEqual(row.timeline.filter(e=>e.type==='growth-frozen-by-water').map(e=>[e.after.elapsed,e.before.elapsed]),[[12,13]]);
 assert.ok(row.timeline.some(e=>e.type==='water-freeze-ended'));assert.ok(row.timeline.some(e=>e.type==='mature'));
 const snapshot=JSON.parse(JSON.stringify(s));observer.observe(snapshot);
 assert.equal(observer.report().crops[0].timeline.filter(e=>e.type==='delivered').length,1);
 row.timeline.length=0;assert.ok(observer.report().crops[0].timeline.length>0,'reports must not expose mutable observer state');
});

test('native paid farming with lifecycle observation preserves the complete state and requires physical crate delivery',()=>{
 const options={days:1,seed:712},baseline=simulateIntensiveFarm(options),observer=createCropLifecycleObserver(['mijo']);
 const observed=simulateIntensiveFarm({...options,onTick:s=>observer.observe(s)});
 assert.equal(serialize(observed.state),serialize(baseline.state));
 assert.equal(serialize(deserialize(serialize(observed.state))),serialize(observed.state));
 const crops=observer.report().crops;
 assert.equal(crops.length,observed.state.plants.length);
 assert.equal(crops.filter(p=>p.outcome==='delivered').length,observed.counts.CrateDelivered);
 assert.ok(crops.some(p=>p.outcome==='delivered'));
 for(const row of crops.filter(p=>p.outcome==='delivered')){
  const pickup=row.timeline.findIndex(e=>e.type==='picked'),delivery=row.timeline.findIndex(e=>e.type==='delivered');
  assert.ok(pickup>=0&&delivery>pickup);
  const crate=observed.state.crates.find(c=>c.id===row.crateId);
  assert.ok(crate.delivered);assert.equal(row.income,observed.state.ledger.entries['deliver:'+crate.id].n);
 }
});
