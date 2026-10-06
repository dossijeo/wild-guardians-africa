import test from 'node:test';
import assert from 'node:assert/strict';
import {idleFarmAnchor} from '../src/simulation/game.js';

test('Living farm anchors do not read historical coordinates; mutations affect the next query',()=>{
  const old={id:'old',centerId:'center',alive:false,get x(){throw Error('Historical distance computed');},get z(){throw Error('Historical distance computed');}};
  const live={id:'live',centerId:'center',alive:true,x:10,z:0};
  const state={plants:[old,live]},worker={centerId:'center',x:0,z:0},center={id:'center'};
  assert.equal(idleFarmAnchor(state,worker,center).id,'farm-live');
  state.plants=[{id:'old',centerId:'center',alive:false,x:1,z:0},live];
  live.alive=false;
  assert.equal(idleFarmAnchor(state,worker,center).id,'farm-old');
  live.alive=true;live.x=-1;
  assert.equal(idleFarmAnchor(state,worker,center).id,'farm-live');
});
