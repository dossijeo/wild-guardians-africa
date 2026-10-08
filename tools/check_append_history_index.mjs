import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
assert.ok(process.argv[2]&&process.argv[3]&&process.argv[4],'Pass reference, candidate and output');
const load=root=>import(pathToFileURL(resolve(root,'src/simulation/worker-entity-lookup.js')));
const a=await load(process.argv[2]),b=await load(process.argv[3]);
let rows=Array.from({length:100},(_,i)=>({id:'p'+i,alive:true})),queries=0;
let left,right;
const reset=()=>{left=a.workerEntityLookup(()=>rows,{reuse:true});right=b.workerEntityLookup(()=>rows,{reuse:true,appendOnly:true});};
const query=id=>{assert.equal(right(id),left(id));queries++;};
reset();query(null);query(undefined);query('p99');query('p98');query('new');
for(let i=0;i<100;i++){
 rows.push({id:'new'+i,alive:true});query('new'+i);query('p99');rows[99].alive=!rows[99].alive;query('p99');
 reset();query('new'+i);query('missing');
}
// Duplicate appends must retain the same first matching member.
rows.push({id:'p99',alive:false});query('p99');assert.equal(right('p99'),rows[99]);
rows.pop();query('p99');rows=rows.filter(p=>p.id!=='p99');query('p99');query('p98');
rows=rows.map(p=>({...p}));query('p98');const restored=rows[98];assert.equal(right('p98'),restored);
// A shrink invalidates; later growth starts from that new membership.
rows.length=65;query('new0');query('p64');rows.push({id:'replacement'});query('replacement');query('new0');
// Confirm only the new tail is read by an existing index, not old history.
let reads=0;rows=Array.from({length:100},(_,i)=>({get id(){reads++;return 'q'+i;}}));reset();query('q99');query('q98');
reads=0;rows.push({id:'tail'});assert.equal(right('tail'),rows.at(-1));assert.equal(reads,0);
// Baseline reproduces this edge-case defect. Validate the candidate against
// direct collection membership here, rather than treating baseline as oracle.
rows=Array.from({length:100},(_,i)=>({id:'edge'+i}));reset();query('edge99');query('edge98');
rows.length=32;query('edge0');for(let i=32;i<100;i++)rows.push({id:'replacement'+i});
assert.equal(right('edge99'),undefined);assert.equal(right('replacement99'),rows[99]);
assert.notEqual(left('edge99'),undefined);assert.equal(left('replacement99'),undefined);
const out={queries,tailPreviousMemberIdReads:reads,baselineStaleIndexReproduced:true,candidateSmallCollectionRegrowthSafe:true,scope:'Helper parity for append-only immutable-ID collections, live fields, duplicates, shrink, replacement, restore; direct-membership regression for small-collection regrowth. Not whole gameplay, timing or unsupported same-length in-place edits'};
writeFileSync(process.argv[4],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
