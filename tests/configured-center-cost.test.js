import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import * as Game from '../src/simulation/game.js';
import {dawnMinimum,hitStructure,operational} from '../src/simulation/rules.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {numberOf,rational,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';

function fixture(){
  const s=Game.newGame({seed:712,slotId:'configured-center-cost'});
  Game.resume(s,'intro');s.tutorial.step='done';
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
  return {s,nav};
}

test('configured centre price controls preview, debit, repair basis and dawn recovery',()=>{
  const original=B.work_center.cost;
  try{
    for(const cost of [800,600]){
      B.work_center.cost=cost;const {s,nav}=fixture();
      assert.equal(Game.previewCenter(s,{x:10,z:0},nav).cost,cost);
      assert.equal(dawnMinimum(s),cost+35);
      Game.placeStructure(s,'center',{x:10,z:0},nav);
      assert.equal(numberOf(s.ledger.balance),1500-cost);
      assert.equal(s.structures[0].cost,cost);
      assert.deepEqual(Game.repairCost({...s.structures[0],hp:0,status:'ruined'}),rational(cost));
      assert.equal(dawnMinimum(s),35);
      const rejected=Game.previewCenter(s,{x:10,z:0},{...nav,placement:()=>({valid:false,reason:'fixture rejection'})});
      assert.equal(rejected.cost,cost);
    }
  }finally{B.work_center.cost=original;}
});

test('already purchased centres retain their paid repair cost after configuration changes and reload',()=>{
  const original=B.work_center.cost;
  try{
    B.work_center.cost=800;const {s,nav}=fixture();Game.placeStructure(s,'center',{x:10,z:0},nav);
    B.work_center.cost=600;const restored=deserialize(serialize(s));
    assert.equal(restored.structures[0].cost,800);
    assert.deepEqual(Game.repairCost({...restored.structures[0],hp:0,status:'ruined'}),rational(800));
  }finally{B.work_center.cost=original;}
});

test('real restored last-centre attack uses the configured strict recovery boundary before dawn',()=>{
  const original=B.work_center.cost;
  try{
    for(const cost of [800,600])for(const balance of [cost-1,cost]){
      B.work_center.cost=cost;let {s,nav}=fixture();nav.activeBounds=[-24,-24,24,24];
      Game.placeStructure(s,'center',{x:-12,z:0},nav);
      transact(s.ledger,'fixture-balance',rational(balance-numberOf(s.ledger.balance)));
      s.initialPreparation=false;s.day=3;s.completedNights=2;s.dayPlan={done:true};s.nightPlan={done:true};
      hitStructure(s.structures[0],400,s.elapsed);s.time=400;spawnRaid(s,{group:['rhino']},nav);
      s=deserialize(serialize(s));nav.setState(s);
      for(let i=0;s.raid&&!s.result&&i<4000;i++)Game.tick(s,.05,nav);
      assert.equal(s.raid,null);assert.ok(!s.structures.some(operational));
      assert.ok(s.events.some(e=>e.type==='StructureHit'));
      assert.equal(numberOf(s.ledger.balance),balance);
      assert.equal(s.result,balance<cost?'defeat':null);
      assert.equal(s.completedNights,2);assert.ok(s.time<600);
      assert.equal(s.events.filter(e=>e.type==='Dawn').length,0);
      if(balance<cost)assert.ok(s.events.findIndex(e=>e.type==='RaidEnded')<s.events.findIndex(e=>e.type==='GameOver'));
    }
  }finally{B.work_center.cost=original;}
});
