import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

test('a paid native center preview cannot obstruct its village worker entry',async()=>{
  const {state,nav,session}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',slotId:'native-center-entry-preview'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const entry=state.villages[0].entry;
    assert(nav.walkable(entry.x,entry.z,.28,null,true));
    const preview=Game.previewCenter(state,{x:entry.x-1,z:entry.z},nav);
    assert.equal(preview.valid,false,
      'the candidate footprint covers the only worker departure point');
    assert(nav.walkable(entry.x,entry.z,.28,null,true),
      'provisional center barriers must be removed after inspection');
    assert.throws(()=>Game.placeStructure(state,'paid-entry-blocker',{
      kind:'center',x:entry.x-1,z:entry.z},nav));
    assert.equal(state.structures.filter(item=>item.kind==='center').length,1);
  }finally{session.dispose();}
});
