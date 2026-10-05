import test from 'node:test';
import assert from 'node:assert/strict';
import {createCropLifecycleObserver} from '../tools/crop-lifecycle.mjs';
import {simulateIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {createPlant,waterPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createHash} from 'node:crypto';
import {auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';

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

test('optional higher staffing pays normal wages while the original twelve-plant strategy retains its recorded complete-state hash',()=>{
 const options={days:1,seed:712,profile:'olderMale',mixed:true,middayHiring:true};
 const baseline=simulateIntensiveFarm(options);
 // Native one-night CLI state captured before adding the staffing option.
 assert.equal(createHash('sha256').update(serialize(baseline.state)).digest('hex'),'acc0e8e9699de4bce79b2297ad71db4cf743fe09d68f47e3f2876b5b07ecca9f');
 const staffed=simulateIntensiveFarm({...options,plantsPerWorker:8});
 assert.ok(auditIntensiveFarm(staffed));assert.equal(staffed.completedNights,1);
 assert.equal(staffed.policy.plantsPerWorker,8);assert.equal(baseline.policy.plantsPerWorker,12);
 assert.ok(staffed.daily[0].staff>baseline.daily[0].staff);
 assert.equal(staffed.daily[0].wages,staffed.daily[0].staff*30);
 assert.ok(staffed.counts.CrateDelivered>0);
 for(const invalid of [0,-1,1.5,NaN])assert.throws(()=>simulateIntensiveFarm({...options,plantsPerWorker:invalid}),/positive integer/);
});

test('a crop with pending watering is recorded as destroyed only after actual hit-state changes',()=>{
 const plant=createPlant('plant-2','algodon',0,0,'center-1'),observer=createCropLifecycleObserver();
 const s={day:1,time:300,elapsed:300,plants:[plant],workers:[],tasks:[],crates:[],ledger:{entries:{}}};
 observer.observe(s);s.time=s.elapsed=301;plant.attackHits=1;observer.observe(s);
 assert.equal(observer.report().crops[0].outcome,'living');
 s.time=s.elapsed=302;plant.attackHits=2;plant.alive=false;observer.observe(s);
 const row=observer.report().crops[0];assert.equal(row.outcome,'destroyed');
 assert.deepEqual(row.timeline.filter(e=>e.type==='attack-hit').map(e=>e.hits),[1,2]);
 assert.equal(row.lastAlive.attackHits,1);assert.equal(row.lastAlive.water[0].status,'due');
 observer.observe(structuredClone(s));assert.equal(observer.report().crops[0].timeline.filter(e=>e.type==='destroyed').length,1);
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
