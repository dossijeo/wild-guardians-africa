import test from 'node:test';
import assert from 'node:assert/strict';
import {instrumentNodeBuilders} from '../tools/experiments/node-builder-diagnostics.mjs';

test('node diagnostics record cache misses and preserve render results',async()=>{
 const data=new WeakMap(),nodes={nodeBuilderCache:new Map(),get(object){if(!data.has(object))data.set(object,{});return data.get(object);},getForRenderCacheKey(object){return object.key;},getForRender(object){const state=this.get(object);if(!state.nodeBuilderState){state.nodeBuilderState=this.nodeBuilderCache.get(object.key)??{value:object.key};this.nodeBuilderCache.set(object.key,state.nodeBuilderState);}return state.nodeBuilderState;}},renderer={_nodes:nodes,_compilationPromises:null,backend:{isWebGPUBackend:true},async init(){}},scope={},before="await renderer.init();checkBootstrap();if(!renderer.backend?.isWebGPUBackend)throw Error('backend');";
 const run=new Function('renderer','globalThis','checkBootstrap',`return (async()=>{${instrumentNodeBuilders(before)}})()`);await run(renderer,scope,()=>{});
 const object={key:1,object:{type:'Mesh',userData:{}},material:{type:'Material'}};assert.deepEqual(nodes.getForRender(object),{value:1});assert.deepEqual(nodes.getForRender(object),{value:1});assert.equal(scope.qaNodeBuilds.length,1);assert.equal(scope.qaNodeBuilds[0].phase,'draw');
 const duplicate={...object};assert.deepEqual(nodes.getForRender(duplicate),{value:1});assert.equal(scope.qaNodeBuilds.length,1,'a cached state is not a build');renderer._compilationPromises=[];nodes.getForRender({...object,key:2});assert.equal(scope.qaNodeBuilds.length,2);assert.equal(scope.qaNodeBuilds[1].phase,'compile');assert.throws(()=>instrumentNodeBuilders('unexpected'),/anchor missing/);
});
