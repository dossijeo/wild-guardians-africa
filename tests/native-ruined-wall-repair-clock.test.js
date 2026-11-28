import test from 'node:test';import assert from 'node:assert/strict';import {uniform} from 'three/tsl';
import NodeUniform from '../node_modules/three/src/nodes/core/NodeUniform.js';
import NodeUniformsGroup from '../node_modules/three/src/renderers/common/nodes/NodeUniformsGroup.js';
import {NumberNodeUniform} from '../node_modules/three/src/renderers/common/nodes/NodeUniform.js';
import {installRemoteClockBindings,copyNativeBarrierClock,markRemoteBarrierClockNode} from '../src/rendering/remote-clock-bindings.js';
import {fixture} from './helpers/remote-webgpu-fixture.js';
const ref=()=>({kind:'native-barrier-addition-reference',version:1,worldBoundary:{version:1,authorityEpoch:'ruin',nativeSession:1,ticket:2,effectiveTime:10},sourceControlSequence:1,additions:[{entityId:'structure-749',x:0,z:0,halfX:1,halfZ:1,yaw:0,passMask:0}]});
test('solid Repair clock uses a real Three scalar layout and immutable identity across physical binding forks',()=>{
 const reference=ref(),node=uniform(0),keys=Object.keys(node),cacheKey=node.getCacheKey();markRemoteBarrierClockNode(node,reference);assert.deepEqual(Object.keys(node),keys);assert.equal(node.getCacheKey(),cacheKey);
 reference.additions[0].x=5;const group=new NodeUniformsGroup('repair',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('age','float',node)));void group.buffer;
 let buffer={id:1};const registered=[],backend={get:()=>({buffer}),updateBinding(){}};const hook=installRemoteClockBindings({backend},{registerClockBinding:(target,value)=>registered.push({target,...value})});
 try{backend.updateBinding(group);backend.updateBinding(group);assert.equal(registered.length,1);assert.equal(registered[0].byteOffset,0);assert.equal(registered[0].nativeBarrierAddition.additions[0].x,0);buffer={id:2};backend.updateBinding(group);assert.equal(registered.length,2);assert.deepEqual(registered[1].nativeBarrierAddition,registered[0].nativeBarrierAddition);assert.throws(()=>markRemoteBarrierClockNode(node,ref()));}finally{hook.dispose();}
});
test('solid Repair clocks reject producer origins, mixed ownership and incompatible references',()=>{
 const binding=()=>({semantic:'relative',epoch:10,nativeBarrierAddition:ref()});
 for(const change of [b=>b.executionEpoch=10.6,b=>b.barrierOrigin={proof:{}},b=>b.nativeRoute={},b=>b.semantic='absolute',b=>b.epoch=11,b=>b.resourceEnd=12,b=>b.nativeBarrierAddition.additions.push({...b.nativeBarrierAddition.additions[0],entityId:'structure-750'})]){const b=binding();change(b);assert.throws(()=>copyNativeBarrierClock(b));}
 assert.equal(copyNativeBarrierClock(binding()).epoch,10);
});
test('an old Host capability cannot silently accept an unretimed Repair uniform',async()=>{
 const f=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeBarrierAdditionVersion:1}});try{assert.throws(()=>f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'relative',epoch:10,nativeBarrierAddition:ref()}),/does not support/);}finally{f.client.dispose();await f.host.dispose();}
});

import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
test('solid Repair picking consumes the submitted local age and rejects foreign, stale or incomplete evidence',()=>{
 const reference=ref(),worldBoundary={...reference.worldBoundary,ticket:3,effectiveTime:11},proof={kind:'native-barrier-addition-attestation',version:1,preparedReference:reference,reference:{...reference,worldBoundary},nativeIds:[7]},age=floorFloat32(11.15-11);
 const base={sequence:1,clockElapsed:11.15,presentationElapsed:10,worldBoundary,bindings:[{nativeBarrierAddition:reference,nativeBarrierAdditionBinding:proof,semantic:'relative',epoch:10,executionEpoch:11,relativeTime:age,elapsed:11+age}]};
 const read=value=>captureNativeRoutePickFrame({nativeRouteFrame:value}),frame=read(base);assert.equal(frame.getBarrierRepairElapsed(reference),age);assert.equal(frame.getBarrierRepairExecutionTime(reference),11+age);assert.equal(frame.getPresentationTime(),10);
 const foreign=ref();foreign.additions[0].entityId='structure-750';assert.throws(()=>frame.getBarrierRepairElapsed(foreign),/no submitted/);assert.throws(()=>read({...base,bindings:[]}).getBarrierRepairElapsed(reference),/no submitted/);
 for(const mutate of [f=>f.bindings[0].relativeTime=.2,f=>f.bindings[0].executionEpoch=10,f=>f.bindings[0].nativeAction={},f=>f.bindings[0].nativeBarrierAdditionBinding=null,f=>f.worldBoundary={...worldBoundary,ticket:2},f=>f.worldBoundary={...worldBoundary,nativeSession:2},f=>f.bindings.push(f.bindings[0]),f=>f.bindings[0].nativeBarrierAddition=foreign]){const value=structuredClone(base);mutate(value);assert.throws(()=>read(value));}
});
