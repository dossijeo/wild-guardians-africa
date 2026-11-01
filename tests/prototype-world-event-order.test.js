import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldEventGate} from '../tools/trees/prototype_world_event_order.mjs';

test('failed, duplicate, missing and foreign changes never advance world version',()=>{
 const gate=createWorldEventGate('world'),msg=(version,session='world')=>({session,version});let applied=0;
 assert.equal(gate.query(msg(1),()=>{throw Error('must not run');}).reason,'gap');
 assert.equal(gate.edit(msg(1,'old'),()=>++applied).reason,'session');
 assert.equal(gate.edit(msg(2),()=>++applied).reason,'gap');
 assert.deepEqual(gate.edit(msg(1),()=>++applied),{accepted:true,version:1,value:1});
 assert.equal(gate.edit(msg(1),()=>++applied).reason,'stale');
 assert.equal(gate.query(msg(0),()=>++applied).reason,'stale');
 assert.equal(applied,1);
 assert.deepEqual(gate.edit(msg(2),()=>++applied),{accepted:true,version:2,value:2});
});

test('a partially applied edit or failing query poisons the gate until a new session',()=>{
 const gate=createWorldEventGate('old'),msg=(version,session='old')=>({session,version});let world=0;
 assert.throws(()=>gate.edit(msg(1),()=>{world++;throw Error('partial');}),/partial/);
 assert.equal(world,1);
 assert.equal(gate.query(msg(0),()=>world).reason,'poisoned');
 assert.equal(gate.edit(msg(1),()=>world++).reason,'poisoned');
 const replacement=createWorldEventGate('new');world=0;
 assert.equal(replacement.query(msg(0),()=>world).reason,'session');
 assert.deepEqual(replacement.query(msg(0,'new'),()=>world),{accepted:true,version:0,value:0});
 assert.throws(()=>replacement.query(msg(0,'new'),()=>{throw Error('query failed');}),/query failed/);
 assert.equal(replacement.query(msg(0,'new'),()=>world).reason,'poisoned');
});
