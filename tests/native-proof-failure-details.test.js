import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeProofFailureDetails} from '../tools/native-proof-failure-details.mjs';
test('worker check objects preserve genuine failures without assuming Array.at',()=>{
 const proof={valid:false,reason:'native-worker-home-route-unproven',workerId:'worker',checks:{workers:[],crops:[]}};
 assert.deepEqual(nativeProofFailureDetails(proof),{valid:false,reason:proof.reason,workerId:'worker',targetId:null});
});
test('animal and incremental failures expose their native target IDs',()=>{
 assert.equal(nativeProofFailureDetails({valid:false,reason:'open',checks:[{services:{targetId:'crop'}}]}).targetId,'crop');
 assert.equal(nativeProofFailureDetails({valid:false,reason:'open',incrementalFailure:{services:{targetId:'new'}}}).targetId,'new');
 assert.equal(nativeProofFailureDetails({valid:false,reason:'delivery',targetId:'direct',checks:{crops:[]}}).targetId,'direct');
});
test('empty and successful proof diagnostics stay unchanged in validity',()=>{
 assert.equal(nativeProofFailureDetails({valid:false,reason:'empty',checks:[]}).valid,false);
 assert.equal(nativeProofFailureDetails({valid:true,reason:'complete',checks:[]}).valid,true);
});
