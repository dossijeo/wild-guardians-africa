import test from 'node:test';
import assert from 'node:assert/strict';
import {uniform} from 'three/tsl';
import NodeUniform from 'three/src/nodes/core/NodeUniform.js';
import NodeUniformsGroup from 'three/src/renderers/common/nodes/NodeUniformsGroup.js';
import {NumberNodeUniform} from 'three/src/renderers/common/nodes/NodeUniform.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {markRemoteClockNode,installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {copyNativeTaskSettlementReference} from '../src/world/native-task-settlement.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

function source(){const f=nativeTaskSettlementFixture();try{return f.prepareSettlement().proposal.nativeSettlement;}finally{f.close();}}
const tag=(node,r,semantic='relative',resourceEnd=null,route=null)=>markRemoteClockNode(node,semantic,r.worldBoundary.effectiveTime,route,null,null,null,null,resourceEnd,null,null,null,r);
const later=(r,dt=.5)=>copyNativeTaskSettlementReference({...r,worldBoundary:{...r.worldBoundary,ticket:r.worldBoundary.ticket+1,effectiveTime:r.worldBoundary.effectiveTime+dt}});

test('stationary metadata retags the existing compiled uniform without another upload, node or cache key',()=>{
 const before=source(),after=later(before),input=structuredClone(before),node=uniform(0),keys=Object.keys(node),key=node.getCacheKey();tag(node,input);input.pose.yaw++;
 const group=new NodeUniformsGroup('settlement-time',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('padding','float',uniform(2))));group.addUniform(new NumberNodeUniform(new NodeUniform('age','float',node)));void group.buffer;
 let buffer={id:1},uploads=0;const calls=[],backend={get:()=>({buffer}),updateBinding(){uploads++;}},hook=installRemoteClockBindings({backend},{registerClockBinding:(target,binding)=>calls.push({target,binding})});
 try{backend.updateBinding(group);assert.deepEqual(calls[0].binding.nativeSettlement,before);assert(Object.isFrozen(calls[0].binding.nativeSettlement.pose));assert(hook.retagNativeTaskSettlement(node,before,after));assert.equal(calls.length,2);assert.equal(calls[1].binding.byteOffset,4);assert.equal(calls[1].target,buffer);assert.deepEqual(calls[1].binding.nativeSettlement,after);assert.equal(uploads,1);assert.equal(node.value,0);assert.equal(node.getCacheKey(),key);assert.deepEqual(Object.keys(node),keys);assert.throws(()=>hook.retagNativeTaskSettlement(node,before,after),/cannot be retagged/);assert.throws(()=>hook.retagNativeTaskSettlement(node,after,{...later(after),pose:{...after.pose,yaw:after.pose.yaw+.1}}),/cannot be retagged/);buffer={id:2};backend.updateBinding(group);assert.equal(calls.at(-1).target,buffer);assert.deepEqual(calls.at(-1).binding.nativeSettlement,after);hook.dispose();assert.throws(()=>hook.retagNativeTaskSettlement(node,after,later(after)),/cannot be retagged/);}finally{hook.dispose();}
});

test('stationary clocks cannot borrow a route, a finite action, a resource extension or an absolute timer',()=>{
 const r=source();assert.throws(()=>tag(uniform(0),r,'absolute'),/settlement phase clock/);assert.throws(()=>tag(uniform(0),r,'relative',r.worldBoundary.effectiveTime+1),/settlement phase clock/);assert.throws(()=>tag(uniform(0),r,'relative',null,{actorId:r.actorId,assignmentSequence:r.sourceCarry.assignmentSequence,routeHandle:r.sourceCarry.reference.expectedRouteHandle}),/Conflicting/);assert.throws(()=>markRemoteClockNode(uniform(0),'relative',r.worldBoundary.effectiveTime+1,null,null,null,null,null,null,null,null,null,r),/settlement phase clock/);
});

test('stationary references require their own newer native ticket and retagging cannot reuse a ticket at another time',()=>{
 const r=source(),node=tag(uniform(0),r),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){}});
 try{assert.throws(()=>copyNativeTaskSettlementReference({...r,worldBoundary:{...r.worldBoundary,ticket:r.sourceCarry.reference.worldBoundary.ticket}}),/arrived Carry/);assert.throws(()=>hook.retagNativeTaskSettlement(node,r,r),/cannot be retagged/);assert.throws(()=>hook.retagNativeTaskSettlement(node,r,{...r,worldBoundary:{...r.worldBoundary,effectiveTime:r.worldBoundary.effectiveTime+.1}}),/cannot be retagged/);}finally{hook.dispose();}
});

test('stationary picks retain exact submitted float ages, actual issued origins and native world coverage',()=>{
 const r=later(source(),1e12),epoch=r.worldBoundary.effectiveTime,age=Math.fround(.1234567),executionEpoch=epoch+.25,binding={nativeSettlement:r,semantic:'relative',epoch,executionEpoch,elapsed:epoch+age,relativeTime:age},consumer={nativeRouteFrame:{sequence:1,clockElapsed:executionEpoch+.2,worldBoundary:r.worldBoundary,bindings:[binding]}};
 const pick=captureNativeRoutePickFrame(consumer);assert.equal(pick.getSettlementElapsed(r),age);assert.notEqual(binding.elapsed-epoch,age);assert.equal(pick.getSettlementExecutionTime(r),executionEpoch+age);assert.throws(()=>pick.getSettlementElapsed({...r,pose:{...r.pose,yaw:r.pose.yaw+.1}}),/no submitted/);
 for(const change of [{relativeTime:NaN},{relativeTime:.1},{relativeTime:-1},{executionEpoch:epoch-1},{executionEpoch:consumer.nativeRouteFrame.clockElapsed+1},{epoch:epoch+1},{elapsed:epoch+1},{semantic:'absolute'}])assert.throws(()=>captureNativeRoutePickFrame({...consumer,nativeRouteFrame:{...consumer.nativeRouteFrame,bindings:[{...binding,...change}]}}),/native (settlement pick|consumer pick clock)/);
 for(const worldBoundary of [{...r.worldBoundary,ticket:r.worldBoundary.ticket-1},{...r.worldBoundary,nativeSession:r.worldBoundary.nativeSession+1},{...r.worldBoundary,effectiveTime:epoch-1}])assert.throws(()=>captureNativeRoutePickFrame({...consumer,nativeRouteFrame:{...consumer.nativeRouteFrame,worldBoundary}}),/settlement pick phase/);
 const future={...consumer,nativeRouteFrame:{...consumer.nativeRouteFrame,clockElapsed:executionEpoch+10000,bindings:[{...binding,elapsed:epoch+8192,relativeTime:8192}]}};assert.equal(captureNativeRoutePickFrame(future).getSettlementElapsed(r),8192,'Idle has no invented action duration; the submitted consumer clock still bounds input');
});
