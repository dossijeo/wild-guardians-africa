import test from 'node:test';
import assert from 'node:assert/strict';
import {uniform} from 'three/tsl';
import NodeUniform from 'three/src/nodes/core/NodeUniform.js';
import NodeUniformsGroup from 'three/src/renderers/common/nodes/NodeUniformsGroup.js';
import {NumberNodeUniform} from 'three/src/renderers/common/nodes/NodeUniform.js';
import {nativeHomeRouteFixture} from './helpers/native-home-route.js';
import {markRemoteClockNode,installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

test('Home retags the same compiled clock scalar, resource horizon and typed origin without another upload',()=>{
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome().proposal,r=p.nativeHome,node=markRemoteClockNode(uniform(0),'relative',p.startTime,null,null,null,null,null,p.endTime,null,null,null,null,r),key=node.getCacheKey(),keys=Object.keys(node),group=new NodeUniformsGroup('home-time',node.groupNode);group.addUniform(new NumberNodeUniform(new NodeUniform('age','float',node)));void group.buffer;const calls=[],buffer={};let uploads=0;const backend={get:()=>({buffer}),updateBinding(){uploads++;}},hook=installRemoteClockBindings({backend},{registerClockBinding:(target,binding)=>calls.push({target,binding})});try{backend.updateBinding(group);assert.deepEqual(calls[0].binding.nativeHome,r);f.advance(.3);const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket).proposal;assert(hook.retagNativeHomeRoute(node,r,next.nativeHome,next.endTime));assert.equal(calls[1].target,buffer);assert.equal(calls[1].binding.resourceEnd,next.endTime);assert.deepEqual(calls[1].binding.nativeHome,next.nativeHome);assert.equal(uploads,1);assert.equal(node.getCacheKey(),key);assert.deepEqual(Object.keys(node),keys);assert.throws(()=>hook.retagNativeHomeRoute(node,r,next.nativeHome,next.endTime),/cannot be retagged/);}finally{hook.dispose();}
 }finally{f.close();}
});

test('Home clock metadata and input reject conflicting, obsolete or invented phase witnesses',()=>{
 const f=nativeHomeRouteFixture();try{const p=f.prepareHome().proposal,r=p.nativeHome,t=p.startTime;assert.throws(()=>markRemoteClockNode(uniform(0),'absolute',t,null,null,null,null,null,null,null,null,null,null,r),/Home clock/);assert.throws(()=>markRemoteClockNode(uniform(0),'relative',t,null,null,null,null,null,null,null,null,null,r.sourceSettlement.reference,r),/Conflicting/);const frame={sequence:1,clockElapsed:t+1,worldBoundary:p.worldBoundary,bindings:[{nativeHome:r,semantic:'relative',epoch:t,elapsed:t+.5,executionEpoch:t,relativeTime:.5}]};const pick=captureNativeRoutePickFrame({nativeRouteFrame:frame});assert.equal(pick.getHomeElapsed(r),.5);assert.equal(pick.getHomeExecutionTime(r),t+.5);assert.equal(pick.getHomeTime(r),t+.5);for(const change of [{relativeTime:.1},{relativeTime:2},{executionEpoch:t-1},{nativeHome:{...r,worldBoundary:{...r.worldBoundary,ticket:r.worldBoundary.ticket+1}}}])assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...frame,bindings:[{...frame.bindings[0],...change}]}}),/Home pick/);
 }finally{f.close();}
});
