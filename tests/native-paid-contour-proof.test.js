import test from 'node:test';
import assert from 'node:assert/strict';
import {nativePaidContourProof} from '../tools/native-paid-contour-proof.mjs';

for(const [label,pieces,updates] of [['unpaid pieces',[{id:'proposal'}],[]],['uncommitted gate conversion',[],[{id:'gate',gate:true}]],['both',[{}],[{}]]]){
 test(`paid completion defers exhaustive proof for ${label}`,()=>{
  const state={marker:'unchanged'},plan={pieces,updates,suppressed:[]},before=structuredClone({state,plan});
  const nav={get field(){throw Error('An incomplete paid contour must not enter terrain or physical proof');}};
  const proof=nativePaidContourProof(state,nav,plan,[0,0,10,10],{outline:[[0,0],[10,0],[10,10],[0,10],[0,0]]});
  assert.equal(proof.valid,false);assert.equal(proof.deferred,true);assert.equal(proof.reason,'incomplete-paid-native-contour');assert.deepEqual(proof.checks,[]);
  assert.deepEqual({state,plan},before);
 });
}
test('zero proposed geometry still enters the actual native physical proof',()=>{
 const nav={get field(){throw Error('native-proof-entered');}};
 assert.throws(()=>nativePaidContourProof({},nav,{pieces:[],updates:[],suppressed:[]},[0,0,10,10],{}),/native-proof-entered/);
});
