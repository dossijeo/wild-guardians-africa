import test from 'node:test';
import assert from 'node:assert/strict';
import {initialIdleOutsideGame} from './helpers/native-initial-idle-outside-game.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleProposal,copyNativeIdleCycleNextRequest} from '../src/world/native-idle-cycle.js';

for(const mode of ['rest','watch'])test(`exterior20 ${mode} typed descriptor rejects forged versions, horizon, origin and phase`,async()=>{
 const f=await initialIdleOutsideGame({mode});try{const p=f.prepareCycle(),r=p.nativeIdleCycle;assert.deepEqual(copyNativeIdleCycleProposal(structuredClone(p)),p);assert.equal(copyNativeIdleCycleReference(r),r);for(const mutate of [v=>v.version=1,v=>v.duration+=.01,v=>v.initialState.remaining+=.01,v=>v.initialState.rng^=1,v=>v.initialState.mode=mode==='rest'?'watch':'rest',v=>v.initialState.approachRetry+=.01,v=>v.sourceBody.bodySequence+=1,v=>v.sourceBody.reference.sourceRequest.pose.x+=.1,v=>v.worldBoundary.nativeSession+=1,v=>v.durations.rest+=.1,v=>v.extra=true,v=>v.sourceBody.sourceRequest={}]){const v=structuredClone(r);mutate(v);Object.freeze(v);assert.throws(()=>copyNativeIdleCycleReference(v));}f.commitCycle(p);f.advance(r.duration+1e-7);const n=f.planner.nativeIdleCycleNextRequest(f.actor);assert.deepEqual(copyNativeIdleCycleNextRequest(structuredClone(n)),n);for(const delta of [{version:1},{approach:undefined},{idleState:{...n.idleState,remaining:n.idleState.remaining+.01}},{idleState:{...n.idleState,rng:n.idleState.rng^1}}])assert.throws(()=>copyNativeIdleCycleNextRequest({...n,...delta}));}finally{await f.dispose();}
});

test('exterior20 preparation rejects changed semantics and projection rejects a substituted physical pose',async()=>{
 const f=await initialIdleOutsideGame();try{const original=structuredClone(f.worker);for(const mutate of [w=>w.idleState.remaining+=.01,w=>w.idleState.rng^=1,w=>w.idleState.elapsed+=.01,w=>w.idleState.approachRetry+=.01,w=>w.idleState.anchorId='farm-plant-1',w=>w.x+=.01]){Object.assign(f.worker,structuredClone(original));mutate(f.worker);const before=structuredClone(f.worker),body=f.body(1);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.deepEqual(f.worker,before);assert.deepEqual(f.body(1),body);}Object.assign(f.worker,structuredClone(original));const p=f.prepareCycle();f.commitCycle(p,{project:false});f.worker.x+=.01;const invalid=structuredClone(f.worker);assert.throws(()=>f.planner.projectNativeIdleCycle(f.state,f.worker));assert.deepEqual(f.worker,invalid);Object.assign(f.worker,original);assert(f.planner.projectNativeIdleCycle(f.state,f.worker));}finally{await f.dispose();}
});

test('a semantic outside request is unsupported before actual20 acquisition',async()=>{
 const f=await initialIdleOutsideGame({acquireBody:false});try{const before=structuredClone(f.worker),body=f.body(1);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.deepEqual(f.worker,before);assert.deepEqual(f.body(1),body);f.commitBody(f.prepareBody());assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'proposed');}finally{await f.dispose();}
});
