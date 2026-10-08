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

test('explicit history reuse avoids rebuilding or scanning immutable memberships across worker updates',()=>{
 let reads=0;const rows=Array.from({length:100},(_,i)=>({get id(){reads++;return 'p'+i;},alive:true}));const first=workerEntityLookup(()=>rows,{reuse:true});first('p99');first('p98');reads=0;for(let step=0;step<100;step++){const lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('p99'),rows[99]);rows[99].alive=false;assert.equal(lookup('p99').alive,false);}assert.equal(reads,0);
});
test('reused history indexes observe appends, removals, replacement and restored objects on later passes',()=>{
 let rows=Array.from({length:100},(_,i)=>({id:'p'+i}));let lookup=workerEntityLookup(()=>rows,{reuse:true});lookup('p0');lookup('p99');rows.push({id:'new'});lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('new'),rows.at(-1));lookup('p0');rows.pop();lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('new'),undefined);lookup('p0');const prior=rows[0];rows=rows.map(p=>({...p}));lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('p0'),rows[0]);assert.notEqual(lookup('p0'),prior);
});
test('reused task queues keep reservations live and discard same-length rebuilt or restored queues',()=>{
 let rows=Array.from({length:100},(_,i)=>({id:'task-'+i,workerId:null,blocked:false}));
 let lookup=workerEntityLookup(()=>rows,{reuse:true});lookup('task-99');lookup('task-98');
 rows[99].workerId='worker-a';rows[99].blocked=true;
 lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('task-99').workerId,'worker-a');assert.equal(lookup('task-99').blocked,true);
 const old=rows[99];rows=rows.filter(t=>t!==old);rows.push({id:'replacement',workerId:'worker-b',blocked:false});
 lookup=workerEntityLookup(()=>rows,{reuse:true});assert.equal(lookup('task-99'),undefined);assert.equal(lookup('replacement').workerId,'worker-b');
 const prior=lookup('replacement');rows=JSON.parse(JSON.stringify(rows));lookup=workerEntityLookup(()=>rows,{reuse:true});
 assert.notEqual(lookup('replacement'),prior);rows.at(-1).workerId=null;assert.equal(lookup('replacement').workerId,null);
 assert.equal(lookup('appended'),undefined);rows.push({id:'appended',workerId:null});assert.equal(lookup('appended'),rows.at(-1));
});
test('append-only histories index only new members and preserve first matches, live fields and prior misses',()=>{
 let reads=0;const rows=Array.from({length:100},(_,i)=>({get id(){reads++;return 'crop-'+i;},alive:true}));
 let lookup=workerEntityLookup(()=>rows,{reuse:true,appendOnly:true});lookup('crop-99');lookup('crop-98');assert.equal(lookup('crate-new'),undefined);
 reads=0;const crate={id:'crate-new',delivered:false};rows.push(crate);assert.equal(lookup('crate-new'),crate);assert.equal(reads,0);
 rows.push({id:'crop-99',alive:false});assert.equal(lookup('crop-99'),rows[99]);rows[99].alive=false;assert.equal(lookup('crop-99').alive,false);
 lookup=workerEntityLookup(()=>rows,{reuse:true,appendOnly:true});crate.delivered=true;assert.equal(lookup('crate-new').delivered,true);
});
for(const appendOnly of [false,true])test(`small collection regrowth retires removed members of a reused index (appendOnly=${appendOnly})`,()=>{
 let rows=Array.from({length:100},(_,i)=>({id:'old-'+i}));const lookup=workerEntityLookup(()=>rows,{reuse:true,appendOnly});lookup('old-99');lookup('old-98');
 rows.length=32;assert.equal(lookup('old-0'),rows[0]);for(let i=32;i<100;i++)rows.push({id:'new-'+i});
 assert.equal(lookup('old-99'),undefined);assert.equal(lookup('new-99'),rows[99]);
 rows=rows.map(r=>({...r}));assert.equal(lookup('new-99'),rows[99]);
});
