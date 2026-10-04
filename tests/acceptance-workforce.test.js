import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Funded post-campaign fixtures and clear straight paths isolate staffing.
// Synthetic village population is deliberately irrelevant to global quotas.
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function farm(weights,species=weights.map(()=> 'mijo')){
  const s=Game.newGame({seed:712,slotId:'acceptance-staff'});Game.resume(s,'intro');
  s.ledger.balance=rational(100000);s.day=101;s.completedNights=100;s.postgame=true;s.tutorial.step='done';s.initialPreparation=false;
  weights.forEach((count,i)=>{
    const x=20+200*i;Game.placeStructure(s,`center-${i}`,{x,z:0},nav);
    for(let j=0;j<count;j++)Game.plant(s,`crop-${i}-${j}`,species[i],x+12+(j%10)*1.5,5+Math.floor(j/10)*1.5,nav);
  });
  Game.pause(s,'hiring');return s;
}
const counts=s=>s.structures.map(c=>s.workers.filter(w=>w.centerId===c.id).length);
test('QA-037: all four profiles charge age wages once and preserve sex-independent contracts',()=>{
  for(const [profile,wage] of [['olderMale',30],['olderFemale',30],['youngMale',40],['youngFemale',40]]){
    const s=farm([1]),before=numberOf(s.ledger.balance);Game.hire(s,'hire',{[profile]:2});
    assert.equal(numberOf(s.ledger.balance),before-2*wage);assert.equal(s.workers.length,2);
    assert.ok(s.workers.every(w=>w.profile===profile&&w.contractDay===101));
    const saved=serialize(s);assert.equal(Game.hire(s,'repeat',{[profile]:2}),false);assert.equal(serialize(s),saved);
  }
});
test('QA-039: confirming zero staff advances a recoverable farm without fictitious production',()=>{
  const s=farm([1]),before=numberOf(s.ledger.balance);Game.hire(s,'zero',{});s.eventPlan=null;
  Game.tick(s,120,nav);assert.ok(Math.abs(s.time-120)<1e-7);assert.equal(s.workers.length,0);assert.equal(s.crates.length,0);
  assert.equal(s.plants[0].growth,0);assert.equal(s.plants[0].water[0].status,'due');assert.equal(numberOf(s.ledger.balance),before);assert.equal(s.result,null);
});
test('QA-040: real hiring with 100/20/0 living plants allocates six staff 4/1/1',()=>{
  const s=farm([100,20,0]);Game.hire(s,'hire',{olderMale:6});assert.deepEqual(counts(s),[4,1,1]);
});
test('QA-041: scarce staff cover the most populated centers before assigning seconds',()=>{
  const s=farm([1,100,20]);Game.hire(s,'hire',{olderMale:2});assert.deepEqual(counts(s),[0,1,1]);
});
test('QA-042: tied scarcity uses creation order regardless of structure array order',()=>{
  const s=farm([5,5,5]),oldest=s.structures[0].id;s.structures.reverse();Game.hire(s,'hire',{olderFemale:1});
  assert.equal(s.workers[0].centerId,oldest);assert.equal(s.workers.length,1);
});
test('QA-042: equal weights and creation timestamps break ties by persistent ID',()=>{
  const s=farm([5,5,5]);s.structures.forEach(c=>{c.created=1;});
  const first=[...s.structures].sort((a,b)=>a.id.localeCompare(b.id))[0].id;
  s.structures.reverse();Game.hire(s,'hire',{olderFemale:1});assert.equal(s.workers[0].centerId,first);
});
test('QA-043: eight workers divide 3/3/2 among empty centers and create no work',()=>{
  const s=farm([0,0,0]);Game.hire(s,'hire',{youngFemale:8});assert.deepEqual(counts(s),[3,3,2]);
  Game.tick(s,10,nav);assert.equal(s.tasks.length,0);assert.equal(s.plants.length,0);assert.equal(s.crates.length,0);
});
test('QA-044: species price, growth and water count do not change equal plant weights',()=>{
  const s=farm([6,6,6],['mijo','algodon','platano']);
  // Different biological states must not change the count-based allocation.
  s.plants.filter(p=>p.species==='algodon').forEach(p=>{p.growth=50;p.water[0].status='manual';});
  Game.hire(s,'hire',{olderFemale:6});assert.deepEqual(counts(s),[2,2,2]);
});
test('QA-045: vastly different village populations do not introduce a village-first quota',()=>{
  const s=farm([100,20,0]);s.villages[0].buildings=Array.from({length:40},(_,i)=>({id:`house-${i}`}));
  s.villages.push({id:'tiny-village',culture:'mapungubwe',x:400,z:0,buildings:[]});
  s.structures[1].villageId=s.structures[2].villageId='tiny-village';Game.hire(s,'hire',{olderMale:6});
  assert.deepEqual(counts(s),[4,1,1]);assert.equal(s.workers.filter(w=>w.villageId==='tiny-village').length,2);
});
test('QA-046: four-profile hiring preserves balanced mixtures through unequal center quotas and save',()=>{
  const s=farm([100,20,0]),selection={olderMale:3,olderFemale:3,youngMale:3,youngFemale:3};Game.hire(s,'hire',selection);
  assert.deepEqual(counts(s),[9,2,1]);
  const profiles=s.structures.map(c=>s.workers.filter(w=>w.centerId===c.id).map(w=>w.profile));
  const mixture=Object.keys(selection).map(id=>profiles[0].filter(p=>p===id).length);
  assert.equal(Math.max(...mixture)-Math.min(...mixture),1);
  assert.equal(new Set(profiles[1]).size,2);assert.equal(profiles[2].length,1);
  for(const [id,n] of Object.entries(selection))assert.equal(s.workers.filter(w=>w.profile===id).length,n);
  assert.deepEqual(deserialize(serialize(s)).workers,s.workers);
});
test('QA-049/050/051: new crops and a midday center do not transfer existing staff or crop bindings',()=>{
  const s=farm([1]);Game.hire(s,'hire',{olderMale:2});const old=s.structures[0].id,oldPlant=s.plants[0].id;
  const contracts=s.workers.map(w=>({id:w.id,centerId:w.centerId,villageId:w.villageId}));
  Game.placeStructure(s,'midday-center',{x:40,z:5},nav);const added=s.structures.at(-1).id;
  for(let j=0;j<12;j++)Game.plant(s,`new-crop-${j}`,'mijo',44+(j%6)*1.5,10+Math.floor(j/6)*1.5,nav);
  assert.equal(s.plants.find(p=>p.id===oldPlant).centerId,old);assert.ok(s.plants.slice(1).every(p=>p.centerId===added));
  Game.tick(s,30,nav);
  assert.deepEqual(s.workers.map(w=>({id:w.id,centerId:w.centerId,villageId:w.villageId})),contracts);
  assert.ok(s.tasks.filter(t=>t.centerId===added).every(t=>t.workerId===null));
  assert.ok(s.plants.slice(1).every(p=>p.growth===0&&p.water[0].status==='due'));
  s.eventPlan=null;Game.tick(s,300-s.time,nav);s.eventPlan=null;Game.tick(s,300,nav);
  assert.equal(s.day,102);assert.ok(s.pauses.includes('hiring'));assert.ok(s.plants.filter(p=>p.alive).every(p=>p.centerId===added));assert.equal(s.plants.find(p=>p.id===oldPlant).alive,false);assert.equal(s.plants.find(p=>p.id===oldPlant).centerId,old);
  assert.ok(s.tasks.every(t=>t.centerId===added));
  const cash=numberOf(s.ledger.balance);Game.hire(s,'next-day',{olderMale:4});
  assert.deepEqual(counts(s),[1,3]);assert.equal(numberOf(s.ledger.balance),cash-120);
});
test('QA-052/143: founding changes territorial center assignment while current staff return to their original village',()=>{
  const s=farm([1]);Game.hire(s,'hire',{olderMale:1});Game.tick(s,60,nav);
  const w=s.workers[0],center=s.structures[0],origin=w.villageId,contract=w.contractDay;
  assert.ok(w.x>10);assert.equal(w.centerId,center.id);
  const payload={units:[{key:'house',kind:'Edificio',min:[0,0,0],max:[.125,.125,.125]}]};
  Game.foundVillage(s,'new-village','suajili',26,0,payload,nav);
  const village=s.villages.at(-1);assert.equal(center.villageId,village.id);assert.equal(center.culture,'mapungubwe');
  assert.equal(w.villageId,origin);assert.equal(w.centerId,center.id);assert.equal(w.contractDay,contract);
  const loaded=deserialize(serialize(s));assert.equal(loaded.workers[0].villageId,origin);
  Game.tick(s,240,nav);assert.equal(w.status,'home');assert.equal(w.x,0);assert.equal(w.z,0);
  Game.tick(loaded,240,nav);assert.equal(serialize(loaded),serialize(s));
  assert.equal(s.workers.length,1);assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);
  s.eventPlan=null;Game.tick(s,300,nav);assert.equal(s.day,102);
  const cash=numberOf(s.ledger.balance);Game.hire(s,'next-day',{olderMale:1});
  assert.equal(numberOf(s.ledger.balance),cash-30);assert.equal(s.workers.length,1);
  assert.equal(s.workers[0].villageId,village.id);assert.equal(s.workers[0].x,village.entry.x);assert.equal(s.workers[0].z,village.entry.z);
});
test('QA-052: territorial choice respects full detours and excludes unreachable village routes',()=>{
  for(const scenario of ['detour','new-unreachable','old-unreachable']){
    const s=farm([1]);Game.hire(s,'hire',{olderMale:1});
    const payload={units:[{key:'house',kind:'Edificio',min:[0,0,0],max:[.125,.125,.125]}]};
    const routes={...nav,path:(a,b)=>{
      if(scenario==='old-unreachable'&&b.x===0)return null;
      if(b.x===26){if(scenario==='new-unreachable')return null;if(scenario==='detour')return [{x:100,z:100},{x:b.x,z:b.z}];}
      return nav.path(a,b);
    }};
    Game.foundVillage(s,'found','suajili',26,0,payload,routes);
    assert.equal(s.structures[0].villageId,scenario==='old-unreachable'?s.villages[1].id:s.villages[0].id);
    assert.equal(s.workers[0].villageId,s.villages[0].id);
  }
});
