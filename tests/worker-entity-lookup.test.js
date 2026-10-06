import test from 'node:test';import assert from 'node:assert/strict';
import {workerEntityLookup} from '../src/simulation/worker-entity-lookup.js';
test('worker lookups retain first-match semantics and observe live field changes',()=>{
 const first={id:'crop',alive:true},second={id:'crop',alive:false},rows=[first,second,{id:'crate',delivered:false},...Array.from({length:70},(_,i)=>({id:'history-'+i}))],lookup=workerEntityLookup(()=>rows);
 assert.equal(lookup('crop'),first);assert.equal(lookup('crate'),rows[2]);assert.equal(lookup('crop'),first);first.alive=false;rows[2].delivered=true;assert.equal(lookup('crop').alive,false);assert.equal(lookup('crate').delivered,true);assert.equal(lookup('missing'),undefined);
});
test('same-pass appended crates and replaced task arrays invalidate previous misses and reservations',()=>{
 const history=Array.from({length:70},(_,i)=>({id:'history-'+i}));let rows=[{id:'old-task',workerId:null},...history],lookup=workerEntityLookup(()=>rows);lookup('old-task');assert.equal(lookup('new-crate'),undefined);
 rows.push({id:'new-crate',carrierId:'worker'});assert.equal(lookup('new-crate'),rows.at(-1));lookup('old-task');
 rows=[...history,{id:'replacement',workerId:'other'},{id:'new-crate',carrierId:null}];assert.equal(lookup('old-task'),undefined);assert.equal(lookup('replacement'),rows.at(-2));assert.equal(lookup('new-crate').carrierId,null);
 rows.pop();assert.equal(lookup('new-crate'),undefined);
});
test('no assignment avoids history and independent update scopes never reuse old entities',()=>{
 const unused=workerEntityLookup(()=>{throw Error('No collection access');});assert.equal(unused(null),undefined);assert.equal(unused(undefined),undefined);
 const original={id:'crop'},restored={id:'crop'},a=workerEntityLookup(()=>[original]),b=workerEntityLookup(()=>[restored]);assert.equal(a('crop'),original);assert.equal(b('crop'),restored);
});
