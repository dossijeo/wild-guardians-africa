import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareInitialFarWorld} from '../src/app/far-world-loading.js';
function fixture(){const adapters=[0,1].map(()=>({stats:{errors:[]},layer:{current:null}}));const world={loading:new AbortController(),farVegetation:{adapters},renders:[],render(dt){this.renders.push(dt);}};return {world,adapters};}
test('initial loading waits for every prepared region using render zero only',async()=>{
 const {world,adapters}=fixture();let frames=0;
 await prepareInitialFarWorld(world,{now:()=>0,nextFrame:async()=>{adapters[frames++].layer.current={prepared:true};}});
 assert.deepEqual(world.renders,[0,0,0]);assert.equal(frames,2);
});
test('no horizon skips loading while disposal, owner replacement and resource errors reject',async()=>{
 await prepareInitialFarWorld({farVegetation:null});
 for(const change of [w=>{w.disposed=true;},w=>w.loading.abort(),w=>{w.farVegetation=null;},(w,a)=>a[0].stats.errors.push('GPU failure')]){
  const {world,adapters}=fixture();await assert.rejects(prepareInitialFarWorld(world,{now:()=>0,nextFrame:async()=>change(world,adapters)}));
  assert.ok(world.renders.every(dt=>dt===0));
 }
});
test('missing regions time out without treating an empty adapter list as ready',async()=>{
 const {world}=fixture();world.farVegetation.adapters=[];let clock=0;
 await assert.rejects(prepareInitialFarWorld(world,{timeout:2,now:()=>clock,nextFrame:async()=>{clock++;}}),/timed out/);
 assert.deepEqual(world.renders,[0,0]);
});


test('suspended far-loading frame cancels without rendering or adopting late regions',async()=>{
 const {world,adapters}=fixture();let finish;
 const pending=prepareInitialFarWorld(world,{nextFrame:()=>new Promise(resolve=>finish=resolve)});world.loading.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(world.renders,[0]);
 adapters.forEach(a=>a.layer.current={prepared:true});finish();await Promise.resolve();assert.deepEqual(world.renders,[0]);
});
test('suspended far-loading frame reaches its real deadline without another RAF',async()=>{
 const {world}=fixture();await assert.rejects(prepareInitialFarWorld(world,{timeout:5,nextFrame:()=>new Promise(()=>{})}),/timed out/);assert.deepEqual(world.renders,[0]);
});
test('phase-yield callback given to rendering shares the cancellable far owner',async()=>{
 const {world}=fixture();world.renderLoadingFrame=async({nextFrame})=>{world.renders.push(0);await nextFrame();};
 const pending=prepareInitialFarWorld(world,{nextFrame:()=>new Promise(()=>{})});world.loading.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(world.renders,[0]);
});
