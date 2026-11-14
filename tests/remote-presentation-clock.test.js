import test from 'node:test';
import assert from 'node:assert/strict';
import {uniform} from 'three/tsl';
import NodeUniform from '../node_modules/three/src/nodes/core/NodeUniform.js';
import NodeUniformsGroup from '../node_modules/three/src/renderers/common/nodes/NodeUniformsGroup.js';
import {NumberNodeUniform} from '../node_modules/three/src/renderers/common/nodes/NodeUniform.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {evaluateRemoteClock} from '../src/rendering/remote-presentation-clock.js';
import {installRemoteClockBindings,markRemoteClockNode} from '../src/rendering/remote-clock-bindings.js';

const preview=()=>({sequence:1,start:10,end:13,safeForAutonomousPlayback:true,reasons:[],clockSegments:{version:1,start:10,end:13,startPauses:[],endPauses:[],complete:true,segments:[{start:10,end:11,realDuration:1,rate:1},{start:11,end:13,realDuration:.4,rate:5}]}});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('remote playback is opt-in and never mutates the preparing clock',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now,timeOrigin:10000});clock.begin(preview());
 const frozen=clock.remoteLease(),lease=clock.remoteLease({allowAdvance:true});
 assert.equal(evaluateRemoteClock(frozen,11100),10);close(evaluateRemoteClock(lease,11100),11.5);
 assert.equal(clock.elapsed,10);assert.equal(evaluateRemoteClock(lease,1e8),13);
 assert.equal(evaluateRemoteClock(lease,9999),10);
});

test('leases preserve mixed rates, partially consumed segments and distinct worker origins',()=>{
 let now=250;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now,timeOrigin:9000});clock.begin(preview());now=750;clock.advance();
 const lease=structuredClone(clock.remoteLease({allowAdvance:true}));assert.equal(lease.elapsed,10.5);
 // Draw worker origin 9500, local time 850 => absolute 10350.
 close(evaluateRemoteClock(lease,9500+850),11.5);
 close(evaluateRemoteClock(lease,lease.anchorAbsoluteMs-100),10.5);
});

test('exact event limits hold until explicitly released and retain carried elapsed time',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now,timeOrigin:1000});clock.begin(preview());
 clock.advanceUntil(10.5);const bounded=clock.remoteLease({allowAdvance:true});assert.equal(evaluateRemoteClock(bounded,5000),10.5);
 now=1200;clock.advance();assert.equal(evaluateRemoteClock(clock.remoteLease({allowAdvance:true}),5000),10.5);
 clock.releaseLimit(10.5);close(evaluateRemoteClock(clock.remoteLease({allowAdvance:true}),2200),12);
});

test('pause, invalidation and inactive clocks cannot extrapolate',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now,timeOrigin:1000});
 assert.equal(evaluateRemoteClock(clock.remoteLease({allowAdvance:true}),1e8),10);
 clock.begin(preview());now=300;clock.suspend();assert.equal(evaluateRemoteClock(clock.remoteLease({allowAdvance:true}),1e8),10.3);
 now=10000;clock.resume();const resumed=clock.remoteLease({allowAdvance:true});close(evaluateRemoteClock(resumed,11200),10.5);
 clock.invalidate();assert.equal(evaluateRemoteClock(clock.remoteLease({allowAdvance:true}),1e8),10.3);
 const committed=createConfirmedPresentationClock(10);committed.commit(11);assert.equal(evaluateRemoteClock(committed.remoteLease({allowAdvance:true}),1e8),11);
});

test('malformed leases cannot invent coverage or reverse time',()=>{
 const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>0,timeOrigin:1000});clock.begin(preview());const lease=clock.remoteLease({allowAdvance:true});
 assert.throws(()=>evaluateRemoteClock({...lease,segments:[]},2000),/coverage/);
 assert.throws(()=>evaluateRemoteClock({...lease,safeUntil:9},2000),/lease/);
 assert.throws(()=>evaluateRemoteClock({...lease,segments:[{start:10,end:13,rate:-1,realDuration:3}]},2000),/segment/);
 assert.throws(()=>evaluateRemoteClock(lease,NaN),/lease/);
});

test('binding registration uses real Three uniform offsets and only repeats on GPU buffer replacement',()=>{
 const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>0,timeOrigin:1000}),group=new NodeUniformsGroup('clock',clock.node.groupNode);
 group.addUniform(new NumberNodeUniform(new NodeUniform('unrelated','float',uniform(99))));
 group.addUniform(new NumberNodeUniform(new NodeUniform('absolute','float',clock.node)));
 group.addUniform(new NumberNodeUniform(new NodeUniform('relative','float',clock.motionNode)));
 void group.buffer;
 let buffer={id:1},writes=0;const calls=[],backend={get:()=>({buffer}),updateBinding(){writes++;}};
 const original=backend.updateBinding,hook=installRemoteClockBindings({backend},{registerClockBinding:(target,metadata)=>calls.push({target,...metadata})});
 backend.updateBinding(group);backend.updateBinding(group);
 assert.equal(writes,2);assert.deepEqual(calls.map(({byteOffset,semantic,epoch})=>({byteOffset,semantic,epoch})),[{byteOffset:4,semantic:'absolute',epoch:10},{byteOffset:8,semantic:'relative',epoch:10}]);
 buffer={id:2};backend.updateBinding(group);assert.equal(calls.length,4);assert.equal(calls[2].target,buffer);
 hook.dispose();assert.equal(backend.updateBinding,original);
});

test('clock metadata does not alter enumerable node structure or its structural cache key',()=>{
 const node=uniform(1),keys=Object.keys(node),key=node.getCacheKey();markRemoteClockNode(node,'absolute',0);
 assert.deepEqual(Object.keys(node),keys);assert.equal(node.getCacheKey(),key);
});

test('a real Three uniform registers its captured native assignment at the physical buffer offset',()=>{
 const reference={actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'native-owner',session:1,slot:2,generation:4}},node=uniform(0),keys=Object.keys(node),key=node.getCacheKey();markRemoteClockNode(node,'relative',10,reference);
 reference.actorId=99;reference.assignmentSequence=9;reference.routeHandle.generation=99;
 const group=new NodeUniformsGroup('native',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('padding','float',uniform(5))));group.addUniform(new NumberNodeUniform(new NodeUniform('native-time','float',node)));void group.buffer;
 let buffer={id:1};const calls=[],backend={get:()=>({buffer}),updateBinding(){}},hook=installRemoteClockBindings({backend},{registerClockBinding:(target,metadata)=>calls.push({target,metadata})});
 try{backend.updateBinding(group);backend.updateBinding(group);assert.equal(calls.length,1);assert.deepEqual(calls[0],{target:buffer,metadata:{byteOffset:4,semantic:'relative',epoch:10,nativeRoute:{actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'native-owner',session:1,slot:2,generation:4}}}});assert(Object.isFrozen(calls[0].metadata.nativeRoute));assert(Object.isFrozen(calls[0].metadata.nativeRoute.routeHandle));buffer={id:2};backend.updateBinding(group);assert.equal(calls.length,2);assert.equal(calls[1].target,buffer);assert.deepEqual(Object.keys(node),keys);assert.equal(node.getCacheKey(),key);assert.throws(()=>markRemoteClockNode(node,'relative',10,reference),/redefine/);}finally{hook.dispose();}
});

for(const field of ['actorId','assignmentSequence','authorityEpoch','session','slot','generation'])test(`native clock tagging rejects invalid ${field} before binding`,()=>{
 const reference={actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'native-owner',session:1,slot:2,generation:4}};if(['actorId','assignmentSequence'].includes(field))reference[field]=0;else reference.routeHandle[field]=field==='authorityEpoch'?'':field==='slot'?-1:0;assert.throws(()=>markRemoteClockNode(uniform(0),'relative',10,reference),/native route/);
});
