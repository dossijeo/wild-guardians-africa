import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {updateRaid} from '../src/simulation/raids.js';
import {rational,transact,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[{x:b.x,z:b.z}],walkable:()=>true};
function fixture(centers=2){
  const s=Game.newGame({seed:712,slotId:'displacement'});Game.resume(s,'intro');
  // Funding isolates workforce rules from campaign profitability.
  transact(s.ledger,'fixture-funding',rational(4000));
  for(let i=0;i<centers;i++)Game.placeStructure(s,`center-${i}`,{x:8+12*i,z:0},nav);
  Game.pause(s,'hiring');Game.hire(s,'hire',{olderMale:4});s.time=40;s.dayPlan=null;
  for(const w of s.workers)w.status='idle';
  return s;
}
function destroy(s,center){center.hp=0;center.status='ruined';for(const w of s.workers.filter(w=>w.centerId===center.id))w.status='fleeing';}
function endRaid(s){s.raid={id:'fixture-raid',animals:[]};updateRaid(s,.1,nav);}
test('Raid destruction reassigns only displaced employees locally without another wage',()=>{
  const s=fixture(),[lost,survivor]=s.structures,original=s.workers.map(w=>({...w}));destroy(s,lost);
  const cash=numberOf(s.ledger.balance);endRaid(s);
  assert.equal(numberOf(s.ledger.balance),cash);assert.equal(s.workers.length,4);
  for(const w of s.workers){assert.equal(w.centerId,survivor.id);assert.equal(w.contractDay,1);assert.equal(w.status,'arriving');}
  assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,original.filter(w=>w.centerId===lost.id).length);
});
test('Returning and already home displaced workers remain recoverable by a new center after reload',()=>{
  let s=fixture(1);destroy(s,s.structures[0]);endRaid(s);
  assert.ok(s.workers.every(w=>w.status==='returning'&&w.displacedDay===1));
  Game.tick(s,30,nav);assert.ok(s.workers.every(w=>w.status==='home'));
  s=deserialize(serialize(s));const ids=s.workers.map(w=>w.id),cash=numberOf(s.ledger.balance);
  Game.placeStructure(s,'replacement',{x:25,z:0},nav);
  assert.deepEqual(s.workers.map(w=>w.id),ids);assert.equal(numberOf(s.ledger.balance),cash-800);
  assert.ok(s.workers.every(w=>w.centerId===s.structures[1].id&&w.status==='arriving'&&w.displacedDay===undefined));
  Game.recoverDisplacedWorkers(s);assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,4);
});
test('Rebuilt center recovers displaced contracts while surviving staff keep assignments',()=>{
  const s=fixture(),[lost,survivor]=s.structures;const resident=s.workers.find(w=>w.centerId===survivor.id);
  destroy(s,lost);s.workers.filter(w=>w.centerId===lost.id).forEach(w=>{w.displacedDay=1;w.status='home';});
  lost.hp=lost.maxHp;lost.status='intact';Game.recoverDisplacedWorkers(s);
  assert.equal(resident.centerId,survivor.id);assert.ok(s.workers.filter(w=>w!==resident).some(w=>w.centerId===lost.id&&w.status==='arriving'));
});
test('Worker arrival reconstructs a ruined center and recovers its displaced staff without rebalance',()=>{
  const s=fixture(),[lost,survivor]=s.structures,displaced=s.workers.filter(w=>w.centerId===lost.id);
  const repairing=s.workers.find(w=>w.centerId===survivor.id);destroy(s,lost);
  displaced.forEach(w=>{w.displacedDay=1;w.status='home';});
  Game.requestRepair(s,'rebuild-request',lost.id);
  const task=s.tasks.find(t=>t.kind==='repair');task.workerId=repairing.id;
  Object.assign(repairing,{x:lost.x+3.2,z:lost.z,status:'walking',taskId:task.id,path:null});
  const cash=numberOf(s.ledger.balance);Game.tick(s,.1,nav);
  assert.equal(lost.status,'intact');assert.equal(numberOf(s.ledger.balance),cash-800);
  assert.equal(repairing.centerId,survivor.id);
  assert.ok(displaced.every(w=>w.centerId===lost.id&&w.status==='arriving'&&w.displacedDay===undefined));
  assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,2);
});
test('Recovery excludes incapacitated, expired, shift-ended and foreign-village workers',()=>{
  const s=fixture(1),lost=s.structures[0];destroy(s,lost);
  s.workers.forEach(w=>{w.displacedDay=1;w.status='home';});
  s.workers[0].incapacitated=true;s.workers[1].contractDay=0;
  s.workers[2].villageId='other-village';s.time=250;
  Game.placeStructure(s,'replacement',{x:25,z:0},nav);
  assert.ok(s.workers.every(w=>w.centerId===lost.id&&w.status==='home'));
  s.time=249;Game.recoverDisplacedWorkers(s);
  assert.equal(s.workers[3].centerId,s.structures[1].id);
  assert.ok(s.workers.slice(0,3).every(w=>w.centerId===lost.id));
});
test('New construction during an active attack cannot recall fleeing employees',()=>{
  const s=fixture(1);destroy(s,s.structures[0]);s.raid={id:'fixture-raid',animals:[]};
  const before=s.workers.map(w=>w.centerId);Game.recoverDisplacedWorkers(s);
  assert.deepEqual(s.workers.map(w=>w.centerId),before);assert.ok(s.workers.every(w=>w.status==='fleeing'));
});
