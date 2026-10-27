import test from 'node:test';
import assert from 'node:assert/strict';
import {withCropShadowRecipe,prepareCropDepthPrograms} from '../src/rendering/crop-depth-preparation.js';
function fixture(){
 const renderer={shadowMap:{enabled:false}},world={fog:{}},material={map:'old',alphaMap:null};
 const object={material,customDepthMaterial:material},sources=new WeakMap([[object,{map:'crop',alphaMap:'cutout'}]]);
 return {renderer,world,material,object,sources,view:{traverse:fn=>fn(object)}};
}
for(const throws of [false,true])test(`shadow recipe restores borrowed state before readiness; throws=${throws}`,async()=>{
 const f=fixture(),fog=f.world.fog;let resolve;
 const readiness=new Promise(r=>{resolve=r;});
 const submit=()=>{assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.world.fog,null);assert.equal(f.material.map,'crop');assert.equal(f.material.alphaMap,'cutout');if(throws)throw Error('driver failure');return readiness;};
 if(throws)assert.throws(()=>withCropShadowRecipe(f.renderer,f.world,f.view,f.sources,submit),/driver failure/);
 else assert.equal(withCropShadowRecipe(f.renderer,f.world,f.view,f.sources,submit),readiness);
 assert.equal(f.renderer.shadowMap.enabled,false);assert.equal(f.world.fog,fog);assert.equal(f.material.map,'old');assert.equal(f.material.alphaMap,null);assert.equal(f.material.needsUpdate,true);
 resolve();await readiness;
});
test('aborted preparation does not traverse or borrow scene resources',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(prepareCropDepthPrograms({getContext:()=>({})},{traverse:()=>assert.fail('traversed')},null,null,{signal:controller.signal}),/cancelled/);
});
test('resource disposal during a yield cancels later recipes and releases listeners',async()=>{
 const listeners=new Map();const material={customProgramCacheKey:()=> 'bioma-local-bridge-depth-v3',addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n)=>listeners.delete(n)};
 const object={material,customDepthMaterial:material},gl={isContextLost:()=>false};
 const renderer={getContext:()=>gl,info:{programs:[]}};let batches=0;
 await assert.rejects(prepareCropDepthPrograms(renderer,{traverse:fn=>fn(object)},null,{prepareDepth:async()=>{batches++;listeners.get('dispose')();}}),/cancelled/);
 assert.equal(batches,1);assert.equal(listeners.size,0);
});

test('disposing a borrowed crop resource aborts queued admission without another frame',async()=>{
 let dispose;const material={customProgramCacheKey:()=> 'bioma-local-bridge-depth-v3',addEventListener:(n,f)=>{dispose=f;},removeEventListener:()=>{dispose=null;}};
 const object={material,customDepthMaterial:material},gl={isContextLost:()=>false};let signal;
 const pending=prepareCropDepthPrograms({getContext:()=>gl,info:{programs:[]}},{traverse:fn=>fn(object)},null,{prepareDepth:(_camera,_view,options)=>{signal=options.signal;return new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));}});
 assert.equal(signal.aborted,false);dispose();assert.equal(signal.aborted,true);
 await assert.rejects(pending,/cancelled/);assert.equal(dispose,null);
});
