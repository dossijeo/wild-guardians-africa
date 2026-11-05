import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationWorkerHeadings,mergePresentationWorkerHeadings} from '../src/simulation/presentation-worker-headings.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';

test('tracks legacy worker heading changes without mutating confirmed state',()=>{
 const tracker=createPresentationWorkerHeadings([{id:'w',yaw:1.2}]),worker={id:'w',status:'walking',x:0,z:0,heading:-.5,path:[{x:1,z:0}]},state={workers:[worker],tasks:[]},before=structuredClone(state);
 assert.deepEqual(tracker.capture(state),[{id:'w',yaw:Math.PI/2}]);assert.deepEqual(state,before);worker.path=[];worker.heading=-2;assert.deepEqual(tracker.capture(state),[]);
 worker.status='acting';worker.taskId='t';state.tasks.push({id:'t',kind:'water'});assert.deepEqual(tracker.capture(state),[{id:'w',yaw:-2}]);worker.downHeading=.7;worker.fallRemaining=1;worker.path=[{x:1,z:1}];assert.deepEqual(tracker.capture(state),[{id:'w',yaw:.7}]);
 worker.status='home';assert.deepEqual(tracker.capture(state),[{id:'w',yaw:null}]);assert.deepEqual(tracker.snapshot(),[]);worker.status='walking';assert.deepEqual(tracker.capture(state),[]);
});
test('collapsed visual heading deltas retain the latest per identity and removals',()=>{
 assert.deepEqual(mergePresentationWorkerHeadings([{id:'a',yaw:1},{id:'b',yaw:2}],[{id:'a',yaw:3},{id:'b',yaw:null}]),[{id:'a',yaw:3},{id:'b',yaw:null}]);
 assert.throws(()=>mergePresentationWorkerHeadings([{id:'x',yaw:1},{id:'x',yaw:2}]),/delta/);assert.throws(()=>createPresentationWorkerHeadings([{id:'a',yaw:NaN}]),/baseline/);
});
test('publication sampling is not identical to sampling only presented frames',()=>{
 const tracker=createPresentationWorkerHeadings([{id:'w',yaw:1.2}]),state={workers:[{id:'w',status:'walking',x:0,z:0,path:[{x:-1,z:0}]}],tasks:[]};
 assert.deepEqual(tracker.capture(state),[{id:'w',yaw:-Math.PI/2}]);state.workers[0].path=[];assert.deepEqual(tracker.capture(state),[]);
 // If both publications arrive before the next legacy frame, the old mesh
 // retains 1.2: a QA comparison must account for the different sampling.
});
test('heading baseline is optional and sent with the authority initialization',()=>{
 const create=seed=>{const sent=[],worker={postMessage:value=>sent.push(value),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',...(seed?{presentationWorkerHeadingSeed:seed}:{}),workerFactory:()=>worker});client.ready.catch(()=>{});client.dispose();return sent[0];};
 const seed=[{id:'w',yaw:.7}];assert.deepEqual(create(seed).presentationWorkerHeadingSeed,seed);assert.equal(create(null).presentationWorkerHeadingSeed,undefined);
});
test('only new identities are adopted, and removal prevents reuse',()=>{
 const tracker=createPresentationWorkerHeadings([],{initialWorkerIds:['old']}),state={workers:[{id:'old',status:'walking'},{id:'new',status:'walking',x:0,z:0,path:[{x:1,z:0}]}],tasks:[]};
 assert.deepEqual(tracker.capture(state),[{id:'new',yaw:Math.PI/2,add:true}]);state.workers[1].status='home';assert.deepEqual(tracker.capture(state),[{id:'new',yaw:null}]);state.workers[1].status='walking';assert.deepEqual(tracker.capture(state),[]);
});
