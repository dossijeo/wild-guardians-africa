import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedCandidateKey} from '../tools/embedded-candidate-key.mjs';
test('models sharing an image never overwrite each other; provider image dedup remains independent',()=>{
 const first='a'.repeat(64),second='b'.repeat(64);
 assert.notEqual(embeddedCandidateKey(first,1),embeddedCandidateKey(second,1));
 assert.notEqual(embeddedCandidateKey(first,1),embeddedCandidateKey(first,4));
 assert.equal(embeddedCandidateKey(first,1),first+'-1');
});
test('candidate directories reject unsafe model and image identities',()=>{
 for(const hash of ['../escape','A'.repeat(64),'x'.repeat(64),'a'.repeat(63)])assert.throws(()=>embeddedCandidateKey(hash,1));
 for(const index of [-1,1.5,NaN,Infinity,'1'])assert.throws(()=>embeddedCandidateKey('a'.repeat(64),index));
});
