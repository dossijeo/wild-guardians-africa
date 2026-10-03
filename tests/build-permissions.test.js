import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshBuildPermissions} from '../src/ui/build-permissions.js';
import {newGame,resume} from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';

test('an already open construction panel follows sunset, live raids, pauses, recovery and available coins',()=>{
  const state=newGame({seed:712});resume(state,'intro');
  state.structures.push({kind:'center',status:'intact'});state.ledger.balance=rational(1000);
  const center={},wall={},choices=['zarzas','piedra','unknown'].map(material=>({dataset:{wall:material}}));
  const root={querySelector:id=>id==='#native-center'?center:wall,querySelectorAll:()=>choices};
  const read=()=>{refreshBuildPermissions(root,state);return [center.disabled,wall.disabled,...choices.map(b=>b.disabled)];};
  assert.deepEqual(read(),[false,false,false,false,true]);
  state.time=300;assert.deepEqual(read(),[true,true,true,true,true]);
  state.time=0;state.raid={animals:[{id:'active-beast'}]};assert.deepEqual(read(),[true,true,true,true,true]);
  state.raid=null;state.pauses.push('hiring');assert.deepEqual(read(),[true,true,true,true,true]);
  resume(state,'hiring');state.ledger.balance=rational(10);assert.deepEqual(read(),[false,false,false,true,true]);
  state.ledger.balance=rational(0);assert.deepEqual(read(),[false,false,true,true,true]);
  state.ledger.balance=rational(1000);assert.deepEqual(read(),[false,false,false,false,true]);
  state.structures=[];assert.deepEqual(read(),[false,true,true,true,true]);
});
test('refreshing permissions tolerates a closed construction panel',()=>{
  const state=newGame({seed:712});
  assert.doesNotThrow(()=>refreshBuildPermissions({querySelector:()=>null,querySelectorAll:()=>[]},state));
});
