import test from 'node:test';
import assert from 'node:assert/strict';
import {uniform} from 'three/tsl';
import NodeUniform from 'three/src/nodes/core/NodeUniform.js';
import NodeUniformsGroup from 'three/src/renderers/common/nodes/NodeUniformsGroup.js';
import {NumberNodeUniform} from 'three/src/renderers/common/nodes/NodeUniform.js';
import {markRemoteClockNode,installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {copyNativeTaskActionReference} from '../src/world/native-task-action-presentation.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

function reference(at=10){return copyNativeTaskActionReference({kind:'native-task-action-reference',version:1,request:{kind:'native-task-action-resource-request',version:1,nativeRoute:{actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'owner',session:1,slot:0,generation:2}},taskId:8,targetId:9,bodyId:1,requestedAt:9,executedThrough:at,actionKind:'harvest',duration:2.4,heading:.3,authorizedAutonomy:false},worldBoundary:{version:1,authorityEpoch:'owner',nativeSession:1,ticket:2,effectiveTime:at},sourceControlSequence:4,origin:{x:3,z:4},radius:.28,profile:1,motionFlags:0,startTime:at,endTime:at+2.4,runPhase:3,walkPhase:4,carryPhase:0,runRemaining:0});}
const tag=(node,r)=>markRemoteClockNode(node,'relative',r.startTime,null,null,null,null,null,null,null,r);

test('action clock metadata stays immutable and retargets its existing physical uniform without rebuilding or uploading',()=>{
 const before=reference(),after=reference(10.5),next={...after,worldBoundary:{...after.worldBoundary,ticket:3}},input=structuredClone(before),node=uniform(0),keys=Object.keys(node),key=node.getCacheKey();tag(node,input);input.request.heading++;
 const group=new NodeUniformsGroup('action-time',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('padding','float',uniform(2))));group.addUniform(new NumberNodeUniform(new NodeUniform('age','float',node)));void group.buffer;
 let buffer={id:1},uploads=0;const calls=[],backend={get:()=>({buffer}),updateBinding(){uploads++;}},hook=installRemoteClockBindings({backend},{registerClockBinding:(target,binding)=>calls.push({target,binding})});
 try{backend.updateBinding(group);assert.equal(calls.length,1);assert.deepEqual(calls[0].binding.nativeAction,before);assert(Object.isFrozen(calls[0].binding.nativeAction.request));assert.equal(hook.retagNativeTaskAction(node,before,next),true);assert.equal(calls.length,2);assert.equal(calls[1].target,buffer);assert.equal(calls[1].binding.byteOffset,4);assert.deepEqual(calls[1].binding.nativeAction,next);assert.equal(uploads,1);assert.equal(node.value,0);assert.equal(node.getCacheKey(),key);assert.deepEqual(Object.keys(node),keys);assert.throws(()=>hook.retagNativeTaskAction(node,before,next),/cannot be retagged/);assert.throws(()=>hook.retagNativeTaskAction(node,next,{...next,request:{...next.request,bodyId:2},worldBoundary:{...next.worldBoundary,ticket:4}}),/cannot be retagged/);buffer={id:2};backend.updateBinding(group);assert.deepEqual(calls.at(-1).binding.nativeAction,next);assert.equal(calls.at(-1).target,buffer);hook.dispose();assert.throws(()=>hook.retagNativeTaskAction(node,next,{...next,worldBoundary:{...next.worldBoundary,ticket:4}}),/cannot be retagged/);}finally{hook.dispose();}
});

test('action phase tagging refuses wrong origins, resource extensions, other semantics and conflicting authority',()=>{
 const r=reference();assert.throws(()=>markRemoteClockNode(uniform(0),'relative',9,null,null,null,null,null,null,null,r),/phase clock/);assert.throws(()=>markRemoteClockNode(uniform(0),'absolute',10,null,null,null,null,null,null,null,r),/phase clock/);assert.throws(()=>markRemoteClockNode(uniform(0),'relative',10,null,null,null,null,null,13,null,r),/phase clock/);assert.throws(()=>markRemoteClockNode(uniform(0),'relative',10,r.request.nativeRoute,null,null,null,null,null,null,r),/Conflicting/);
});

test('action pick age retains the submitted float at large epochs without absolute-time cancellation',()=>{
 const r=reference(1e12),age=Math.fround(.1234567),executionEpoch=r.startTime+.25,consumer={nativeRouteFrame:{sequence:1,clockElapsed:executionEpoch+.2,worldBoundary:r.worldBoundary,bindings:[{nativeAction:r,semantic:'relative',epoch:r.startTime,executionEpoch,elapsed:r.startTime+age,relativeTime:age}]}};
 const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getActionElapsed(r),age);assert.notEqual(consumer.nativeRouteFrame.bindings[0].elapsed-r.startTime,age);assert.equal(pick.getActionExecutionTime(r),executionEpoch+age);assert.throws(()=>pick.getActionElapsed({...r,request:{...r.request,heading:1}}),/no submitted/);
 for(const change of [{relativeTime:NaN},{relativeTime:3},{relativeTime:.1},{executionEpoch:r.startTime-1},{epoch:r.startTime+1},{elapsed:r.startTime+1},{semantic:'absolute'}])assert.throws(()=>captureNativeRoutePickFrame({...consumer,nativeRouteFrame:{...consumer.nativeRouteFrame,bindings:[{...consumer.nativeRouteFrame.bindings[0],...change}]}}),/native (action pick|consumer pick clock)/);
});
