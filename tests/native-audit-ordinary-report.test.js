import test from 'node:test';
import assert from 'node:assert/strict';
import {ordinarySequenceComplete} from '../tools/guardian/native-audit-ordinary-report.mjs';
const stages=['start','packet-bytes','retained-preparations','draw-world-checks','combined-bytes','validate-operations','clock-contract','references','dependencies-wait','dependencies-ready','snapshot','control-rendezvous','clock-admission','classify-ownership','replay-analysis','pipeline-identities','pin-and-publish-pending','admitted'];
const marks=()=>stages.map((stage,at)=>({stage,at}));
test('all ordered admission stages are required, including internal work between start and admitted',()=>{
 assert.equal(ordinarySequenceComplete(marks()),true);
 for(let i=0;i<stages.length;i++)assert.equal(ordinarySequenceComplete(marks().filter((_,j)=>i!==j)),false,stages[i]);
 assert.equal(ordinarySequenceComplete([]),false);
});
test('duplicated or reordered stages cannot masquerade as a complete admission',()=>{
 const duplicate=marks();duplicate.splice(5,0,duplicate[5]);assert.equal(ordinarySequenceComplete(duplicate),false);
 const swapped=marks();[swapped[6],swapped[7]]=[swapped[7],swapped[6]];assert.equal(ordinarySequenceComplete(swapped),false);
});
test('unknown stages and invalid or reversed timestamps are incomplete evidence',()=>{
 for(const replacement of [{stage:'unknown'},{at:NaN},{at:-1}]){const rows=marks();Object.assign(rows[8],replacement);assert.equal(ordinarySequenceComplete(rows),false);}
});
