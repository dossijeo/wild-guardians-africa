import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldEventGate} from '../tools/trees/prototype_world_event_order.mjs';

test('failed, duplicate, missing and foreign changes never advance world version',()=>{
 const gate=createWorldEventGate('world'),msg=(version,session='world')=>({session,version});let applied=0;
 assert.equal(gate.query(msg(1),()=>{throw Error('must not run');}).reason,'gap');
 assert.throws(()=>gate.edit(msg(1),()=>{throw Error('edit failed');}),/edit failed/);
 assert.deepEqual(gate.query(msg(0),()=>7),{accepted:true,version:0,value:7});
 assert.equal(gate.edit(msg(1,'old'),()=>++applied).reason,'session');
 assert.equal(gate.edit(msg(2),()=>++applied).reason,'gap');
 assert.deepEqual(gate.edit(msg(1),()=>++applied),{accepted:true,version:1,value:1});
 assert.equal(gate.edit(msg(1),()=>++applied).reason,'stale');
 assert.equal(gate.query(msg(0),()=>++applied).reason,'stale');
 assert.equal(applied,1);
 assert.deepEqual(gate.edit(msg(2),()=>++applied),{accepted:true,version:2,value:2});
});
