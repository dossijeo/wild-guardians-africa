import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedNativePreparation} from '../tools/experiments/shared-native-preparation.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('same-turn species share one preparation with the complete texture union',async()=>{
 const a={},b={},c={},calls=[];
 const batch=new SharedNativePreparation(async(textures,cancelled)=>{calls.push(textures);assert.equal(cancelled(),false);return 'fenced';});
 const first=batch.request([a,b]),second=batch.request([b,c]);
 assert.deepEqual(await Promise.all([first,second]),['fenced','fenced']);
 assert.deepEqual(calls,[[a,b,c]]);assert.equal(batch.pending,null);
});
test('later packing never borrows an in-flight or completed fence',async()=>{
 const first=deferred(),calls=[];
 const batch=new SharedNativePreparation(textures=>{calls.push(textures);return calls.length===1?first.promise:Promise.resolve('new-fence');});
 const a=batch.request(['a']);await Promise.resolve();
 assert.equal(await batch.request(['b']),'new-fence');
 first.resolve('old-fence');assert.equal(await a,'old-fence');
 assert.equal(await batch.request(['c']),'new-fence');assert.deepEqual(calls,[['a'],['b'],['c']]);
});
test('cancelling one species does not cancel another owner, and rejects its late adoption',async()=>{
 const fence=deferred();let cancelled=false,check,required;
 const batch=new SharedNativePreparation((textures,allCancelled)=>{required=textures;check=allCancelled;return fence.promise;});
 const a=batch.request(['a'],()=>cancelled),b=batch.request(['b']);
 const rejected=assert.rejects(a,{name:'AbortError'});await Promise.resolve();
 cancelled=true;assert.equal(check(),false);assert.deepEqual(required,['a','b']);
 fence.resolve('fenced');await rejected;assert.equal(await b,'fenced');
});
test('cancelled admission uploads nothing and all cancelled owners interrupt the shared wait',async()=>{
 let calls=0;const fence=deferred();let cancelled=false,check;
 const batch=new SharedNativePreparation((textures,allCancelled)=>{calls++;check=allCancelled;return fence.promise;});
 await assert.rejects(batch.request(['not-live'],()=>true),{name:'AbortError'});assert.equal(calls,0);
 const a=batch.request(['a'],()=>cancelled),b=batch.request(['b'],()=>cancelled);
 const rejected=Promise.all([assert.rejects(a,{name:'AbortError'}),assert.rejects(b,{name:'AbortError'})]);
 await Promise.resolve();cancelled=true;assert.equal(check(),true);
 fence.resolve('fenced');await rejected;assert.equal(calls,1);
});
test('GPU faults remain faults for every subscriber and do not poison future batches',async()=>{
 const fault=new Error('GPU fence failed');let fail=true;
 const batch=new SharedNativePreparation(async()=>{if(fail)throw fault;return 'restored';});
 await Promise.all([assert.rejects(batch.request(['a']),e=>e===fault),assert.rejects(batch.request(['b']),e=>e===fault)]);
 fail=false;assert.equal(await batch.request(['c']),'restored');
});
