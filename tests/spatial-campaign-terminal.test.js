import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

// A synthetic night-100 state tests the terminal pipeline on the real C++
// spatial world. It is not evidence that a virtual-player campaign survived.
for(const [balance,expected,event] of [
  [10000,'victory','CampaignWon'],
  [0,'defeat','GameOver']
])test(`a native spatial raid resolves before night-100 ${expected}`,async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:`spatial-terminal-${expected}`
  });
  try{
    const crop=start.farm[0];
    assert.equal(Game.plant(state,'terminal-crop','mijo',crop.x,crop.z,nav),true);
    state.tutorial.step='done';state.initialPreparation=false;
    state.day=100;state.completedNights=99;state.time=599.5;
    state.dayPlan={done:true};state.nightPlan={done:true};
    state.ledger.balance=rational(balance);
    assert.notEqual(spawnRaid(state,{at:599.5,group:['warthog'],
      done:false,introductory:false},nav),false);
    assert.equal(state.result,null);
    const spawn=state.raid.animals[0],origin={x:spawn.x,z:spawn.z};
    Game.tick(state,.5,nav);
    assert.equal(state.result,null,'the terminal event must wait for the raid');
    for(let step=0;step<2500&&state.raid&&!state.result;step++)
      Game.tick(state,.25,nav);
    assert.equal(state.raid,null,'the physical raid must finish within the bound');
    assert(state.events.some(item=>item.type==='RaidEnded'));
    assert(Math.hypot(spawn.x-origin.x,spawn.z-origin.z)>1||spawn.status==='gone');
    assert.equal(state.result,expected);
    const ended=state.events.findIndex(item=>item.type==='RaidEnded');
    const terminal=state.events.findIndex(item=>item.type===event);
    assert(terminal>ended,'the raid resolves before the terminal event');
    assert.equal(state.events.filter(item=>item.type===event).length,1);
    const restored=deserialize(serialize(state));
    assert.equal(serialize(restored),serialize(state));
    const frozen=serialize(restored);
    Game.tick(restored,30,nav);
    assert.equal(serialize(restored),frozen,'a terminal save stays inert');
  }finally{session.dispose();}
});
