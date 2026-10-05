import {centerServicePoint} from '../src/world/centers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {contractExpired} from '../src/simulation/workforce.js';
import {numberOf,rational,multiply,transact} from '../src/simulation/money.js';
import {serialize,deserialize,SaveRepository} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[{x:b.x,z:b.z}],walkable:()=>true};
// Isolated late-postgame snapshot fixture with a delivery crossing midnight.
// Earlier proceeds are fixture history, not an end-to-end profitability claim.
function carrying(profile='olderMale'){
  const s=Game.newGame({seed:712,slotId:'contract'});Game.resume(s,'intro');s.day=101;s.completedNights=100;s.postgame=true;
  Game.placeStructure(s,'center',{x:4,z:0},nav);Game.plant(s,'seed','mijo',8,0,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});transact(s.ledger,'earlier-proceeds',rational(405));
  const worker=s.workers[0],plant=s.plants[0];plant.alive=false;plant.harvestRequested=false;
  const crate={id:'crate-late',x:8,z:0,value:profile.endsWith('Male')?multiply(rational(9),6,5):rational(9),profile,carrierId:worker.id,delivered:false,centerId:worker.centerId};
  Object.assign(worker,{x:8,z:0,status:'carrying',crateId:crate.id,path:null});s.crates=[crate];s.tasks=[];
  s.time=599.9;return {s,worker,crate,plant};
}
test('A harvest begun before shift end completes its native action and physical transport across dawn',()=>{
  const {s,worker,plant}=carrying('olderFemale');s.crates=[];s.time=299.8;
  Object.assign(worker,{x:400,z:0,status:'idle',crateId:null,taskId:null,path:null});
  Object.assign(plant,{x:400,z:0,alive:true,growth:140,harvestRequested:false});plant.water.forEach(w=>w.status='manual');
  Game.harvest(s,'late-harvest',plant.id);Game.tick(s,.01,nav);assert.equal(worker.status,'walking');
  Game.tick(s,.01,nav);assert.equal(worker.status,'acting');Game.tick(s,4,nav);
  assert.equal(plant.alive,false);assert.equal(worker.status,'carrying');assert.equal(s.crates.length,1);assert.equal(numberOf(s.ledger.balance),1070);
  Game.tick(s,300,nav);assert.equal(s.day,102);assert.equal(worker.status,'carrying');assert.ok(worker.x>7.2);
  const loaded=deserialize(serialize(s));Game.hire(loaded,'hire-next',{});Game.tick(loaded,100,nav);
  assert.equal(loaded.crates[0].delivered,true);assert.equal(loaded.workers[0].status,'home');assert.equal(numberOf(loaded.ledger.balance),1081);
  assert.equal(loaded.events.filter(e=>e.type==='CropPicked').length,1);assert.equal(loaded.events.filter(e=>e.type==='CrateDelivered').length,1);
});
test('A delivery crossing dawn retains its carrier, position and unpaid value through zero hiring and reload',()=>{
  const {s,worker,crate}=carrying();Game.tick(s,.2,nav);
  assert.equal(s.day,102);assert.equal(s.workers[0].id,worker.id);assert.equal(worker.contractDay,101);assert.equal(contractExpired(worker,s),true);
  assert.equal(crate.carrierId,worker.id);assert.equal(numberOf(s.ledger.balance),1070);assert.deepEqual(s.pauses,['hiring']);
  const loaded=deserialize(serialize(s));Game.hire(loaded,'hire-next',{});
  assert.equal(loaded.workers.length,1);assert.equal(numberOf(loaded.ledger.balance),1070);
  Game.tick(loaded,2,nav);assert.equal(loaded.crates[0].delivered,true);assert.equal(numberOf(loaded.ledger.balance),1081);
  assert.equal(loaded.workers[0].status,'returning');assert.equal(loaded.workers[0].taskId,null);
  Game.tick(loaded,20,nav);assert.equal(loaded.workers[0].status,'home');assert.equal(numberOf(loaded.ledger.balance),1081);
  assert.equal(loaded.events.filter(e=>e.type==='CrateDelivered').length,1);
});
test('A busy person cannot be hired twice; only the new daily contract is charged',()=>{
  const {s,worker}=carrying();Game.tick(s,.2,nav);Game.hire(s,'hire-next',{olderMale:1});
  assert.equal(s.workers.length,2);const current=s.workers.find(w=>w.contractDay===102);
  assert.notEqual(current.personId,worker.personId);assert.equal(current.profile,worker.profile);assert.equal(numberOf(s.ledger.balance),1040);
  assert.equal(Game.hire(s,'hire-next-again',{olderMale:1}),false);assert.equal(s.workers.length,2);
  Game.tick(s,2,nav);assert.equal(numberOf(s.ledger.balance),1051);
});
test('An expired carrier finishes its chain but cannot take ordinary tasks from the new day',()=>{
  const {s,worker}=carrying();Game.tick(s,.2,nav);Game.hire(s,'hire-next',{});
  Game.plant(s,'new-crop','mijo',9.5,0,nav);const plant=s.plants.at(-1);
  Game.tick(s,25,nav);assert.equal(worker.status,'home');assert.equal(plant.water[0].status,'due');assert.equal(plant.growth,0);
  assert.ok(s.tasks.some(t=>t.targetId===plant.id&&!t.workerId));
});
test('Replaying a hiring transaction from the previous day leaves hiring open and grants no free new contract',()=>{
  const {s}=carrying();Game.tick(s,.2,nav);const before=serialize(s);
  assert.equal(Game.hire(s,'hire',{olderMale:1}),false);assert.equal(serialize(s),before);
  assert.equal(Game.plant(s,'earlier-proceeds','mijo',10,0,nav),false);assert.equal(serialize(s),before);
});
test('Cargo coordinates follow the actual carrier after every movement step',()=>{
  const {s,worker,crate}=carrying();const point=centerServicePoint(s.structures[0],s);worker.x=point.x+2;worker.z=point.z;crate.x=worker.x;crate.z=worker.z;const start=worker.x;s.time=598;Game.tick(s,.5,nav);
  assert.equal(crate.x,worker.x);assert.equal(crate.z,worker.z);assert.ok(worker.x<start);assert.equal(crate.delivered,false);
});
test('Losing the carrier center drops the box at its physical position without paying or deleting it',()=>{
  const {s,worker,crate}=carrying();s.time=598;s.structures[0].status='ruined';s.structures[0].hp=0;
  Game.tick(s,.1,nav);assert.equal(worker.crateId,null);assert.equal(crate.carrierId,null);assert.equal(crate.x,worker.x);assert.equal(crate.z,worker.z);
  assert.equal(crate.delivered,false);assert.equal(numberOf(s.ledger.balance),1070);assert.equal(worker.status,'returning');
  assert.equal(s.events.filter(e=>e.type==='CrateDropped').length,1);
});
test('Snapshot validation rejects orphaned, duplicated or inconsistent carrier links',()=>{
  const {s}=carrying(),text=serialize(s);
  for(const corrupt of [state=>state.workers=[],state=>state.workers[0].crateId=null,state=>state.crates[0].delivered=true,state=>state.crates[0].carrierId=null]){
    const bad=JSON.parse(text);corrupt(bad);assert.throws(()=>deserialize(JSON.stringify(bad)),/caja|carga|Carga/);
  }
});
test('Fractional wallet balances and settled ledger entries are rejected while a pending harvest formula remains valid',()=>{
  const {s}=carrying(),text=serialize(s);
  assert.equal(deserialize(text).crates[0].value.d,'5');
  const balance=JSON.parse(text);balance.ledger.balance=rational(1001,2);assert.throws(()=>serialize(balance),/Saldo/);
  const entry=JSON.parse(text);entry.ledger.entries['wrong-charge']=rational(-945,100);assert.throws(()=>serialize(entry),/monetario/);
});

test('New harvest provenance survives reload and rejects an orphan, species mismatch, living source or duplicated yield',()=>{
  const {s,crate,plant}=carrying();crate.sourcePlantId=plant.id;crate.species=plant.species;const text=serialize(s);
  assert.equal(deserialize(text).crates[0].sourcePlantId,plant.id);
  for(const corrupt of [state=>state.crates[0].sourcePlantId='missing',state=>state.crates[0].species='yuca',state=>state.plants[0].alive=true,
    state=>state.crates.push({...state.crates[0],id:'duplicate-yield',carrierId:null})]){
    const bad=JSON.parse(text);corrupt(bad);assert.throws(()=>deserialize(JSON.stringify(bad)),/Origen de cosecha/);
  }
  const legacy=JSON.parse(text);delete legacy.crates[0].sourcePlantId;delete legacy.crates[0].species;assert.doesNotThrow(()=>serialize(legacy));
});
test('A corrupt latest carrier relation falls back to the last valid saved snapshot',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)},repository=new SaveRepository(storage);
  const {s}=carrying();repository.save(s);s.savedAt=2;repository.save(s);
  const bad=JSON.parse(map.get(repository.key(s.slotId)));bad.workers=[];map.set(repository.key(s.slotId),JSON.stringify(bad));
  const loaded=repository.load(s.slotId);assert.equal(loaded.workers[0].id,loaded.crates[0].carrierId);assert.equal(loaded.savedAt,undefined);
});
