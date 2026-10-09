import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldScene} from '../src/rendering/scene.js';
function fixture(){const calls=[],owner={disposed:false,loading:new AbortController(),*renderFrameUpdates(){for(const phase of ['chunks','entities','far','batches','vfx']){calls.push(phase);yield;}},drawRenderFrame(){calls.push('draw');return 'rendered';}};return {owner,calls};}
test('loading render yields only between the shared update phases and draws after every phase',async()=>{const f=fixture();let yields=0;const result=await WorldScene.prototype.renderLoadingFrame.call(f.owner,{nextFrame:async()=>{yields++;f.calls.push('frame');},afterRender:()=>f.calls.push('diorama')});assert.equal(result,'rendered');assert.equal(yields,5);assert.deepEqual(f.calls,['chunks','diorama','frame','entities','diorama','frame','far','diorama','frame','batches','diorama','frame','vfx','diorama','frame','draw']);});
test('cancelled loading cannot execute the next phase or draw a disposed world',async()=>{const f=fixture();await assert.rejects(WorldScene.prototype.renderLoadingFrame.call(f.owner,{nextFrame:async()=>{f.owner.disposed=true;}}),/cancelled/);assert.deepEqual(f.calls,['chunks']);});
test('ordinary gameplay consumes the same phases without yielding or changing delta',()=>{const f=fixture();let delta;f.owner.renderFrameUpdates=function*(dt){delta=dt;yield;f.calls.push('updates');};assert.equal(WorldScene.prototype.render.call(f.owner,.016),'rendered');assert.equal(delta,.016);assert.deepEqual(f.calls,['updates','draw']);});

test('loading frame retains native far fog before yielding to concurrent GPU preparation; gameplay keeps normal sync',()=>{
 const fog={native:true};
 const owner={shaderFailure:{current:null},resize(){},cinematic:true,strokePreview:{render(){}},camera:{position:{toArray:()=>[0,0,0]}},nav:{field:{}},renderOrigin:{update:()=>false},controls:{target:{}},syncChunks(){},chunks:new Map(),quality:{},state:{elapsed:0},simElapsed:0,scene:{fog},loadingProgress:{ready:false},farVegetation:{enabled:true},sync(){this.scene.fog=null;}};
 const iterator=WorldScene.prototype.renderFrameUpdates.call(owner,0);iterator.next();iterator.next();assert.equal(owner.scene.fog,fog);iterator.return();
 owner.loadingProgress.ready=true;owner.scene.fog=fog;const gameplay=WorldScene.prototype.renderFrameUpdates.call(owner,0);gameplay.next();gameplay.next();assert.equal(owner.scene.fog,null);gameplay.return();
});

test('pending loading-frame yields expose coherent fog and cancellation cannot leave a fog-free scene',async()=>{
 const fog={native:true},waiting=[],loading=new AbortController();
 const owner={shaderFailure:{current:null},resize(){},cinematic:true,strokePreview:{render(){}},camera:{position:{toArray:()=>[0,0,0]}},nav:{field:{}},renderOrigin:{update:()=>false},controls:{target:{}},syncChunks(){},chunks:new Map(),quality:{},state:{elapsed:0},simElapsed:0,scene:{fog},loadingProgress:{ready:false},farVegetation:{enabled:true},loading,disposed:false,sync(){this.scene.fog=null;},renderFrameUpdates:WorldScene.prototype.renderFrameUpdates,drawRenderFrame(){assert.fail('cancelled draw');}};
 const pending=WorldScene.prototype.renderLoadingFrame.call(owner,{nextFrame:()=>new Promise(resolve=>waiting.push(resolve))});assert.equal(owner.scene.fog,fog);waiting[0]();await Promise.resolve();await Promise.resolve();assert.equal(waiting.length,2);assert.equal(owner.scene.fog,fog);loading.abort();waiting[1]();await assert.rejects(pending,/cancelled/);assert.equal(owner.scene.fog,fog);
});
