import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createPlant,waterPlant,advancePlant} from '../src/simulation/crops.js';
import {applyEvent} from '../src/simulation/events.js';
import {cropSpec} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Funded post-campaign state isolates agricultural events from random raids.
// The straight-route navigation double does not certify original terrain.
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const species=['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'];
function season(s,magnitude){s.eventPlan={id:'season',kind:'season',negative:false,magnitude};applyEvent(s);}
function farm(){
  const s=Game.newGame({seed:712,slotId:'event-water'});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:0,z:0},nav);s.ledger.balance=rational(10000);
  s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
  return s;
}

test('season expires at the next magical watering for all eight species and three intensities',()=>{
  for(const id of species)for(const magnitude of [.1,.2,.3]){
    const p=createPlant('p',id,0,0,'center');waterPlant(p);p.growth=p.water[1].at-1;
    const s=farm();s.plants=[p];season(s,magnitude);
    close(p.toleranceBonus,magnitude);advancePlant(p,1,true);
    assert.equal(p.water[1].status,'magic',id);close(p.growth,p.water[1].at+.5);
    assert.equal(p.toleranceBonus,0,`${id}, season ${magnitude}`);
    assert.ok(p.water.slice(2).every(w=>w.status==='future'));
  }
});

test('successful manual or magical water clears season, but a request without due water does not',()=>{
  for(const magic of [false,true]){
    const p=createPlant('p','platano',0,0,'center');p.toleranceBonus=.3;
    assert.equal(waterPlant(p,magic),true);assert.equal(p.toleranceBonus,0);
    p.toleranceBonus=.2;assert.equal(waterPlant(p,magic),false);assert.equal(p.toleranceBonus,.2);
  }
});

test('diluted Growth preserves the watering checkpoint and its season penalty across reload',()=>{
  let s=farm();Game.plant(s,'seed','platano',6,0,nav);const p=s.plants[0];waterPlant(p);
  p.growth=94;season(s,.3);Game.cast(s,'growth','growth',p.x,p.z,nav);
  const coins=JSON.stringify(s.ledger);Game.tick(s,1,nav);
  assert.equal(p.water[1].status,'due');assert.equal(p.toleranceBonus,.3);
  const before=JSON.stringify(p);
  s=deserialize(serialize(s));const restored=s.plants[0];assert.equal(JSON.stringify(restored),before);
  Game.tick(s,29,nav);assert.equal(s.spells.length,0);
  assert.equal(restored.water[1].status,'due');assert.equal(restored.water[2].status,'future');
  assert.equal(restored.alive,true);
  assert.equal(s.tasks.filter(t=>t.kind==='water'&&t.targetId===restored.id).length,1);
  assert.equal(JSON.stringify(s.ledger),coins);close(s.cooldowns.growth,0);
});

test('a worker consumes season on physical first care without a second charge',()=>{
  const s=farm();Game.plant(s,'seed','platano',6,0,nav);const p=s.plants[0];season(s,.2);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});const coins=JSON.stringify(s.ledger);
  for(let i=0;i<100&&p.water[0].status==='due';i++)Game.tick(s,.5,nav);
  assert.equal(p.water[0].status,'manual');assert.equal(p.toleranceBonus,0);
  assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===p.id).length,1);
  assert.equal(JSON.stringify(s.ledger),coins);
});
