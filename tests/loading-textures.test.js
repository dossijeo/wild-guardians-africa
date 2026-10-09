import test from 'node:test';import assert from 'node:assert/strict';
import {initializeLoadingTextures} from '../src/rendering/loading-textures.js';
function fixture(){const shared={isTexture:true},shaderOnly={isTexture:true},target={isTexture:true,isRenderTargetTexture:true},video={isTexture:true,isVideoTexture:true},a={map:shared},b={normalMap:shared},depth={map:shaderOnly},objects=[{material:[a,b],customDepthMaterial:depth}],uniforms=new Map([[a,{environment:{value:shaderOnly},shadow:{value:target}}],[b,{array:{value:[shared,video]}}]]),calls=[];return {shared,shaderOnly,calls,scene:{traverse:fn=>objects.forEach(fn)},renderer:{properties:{get:m=>({uniforms:uniforms.get(m),currentProgram:{getUniforms:()=>({seq:[{id:'map'},{id:'normalMap'},...Object.keys(uniforms.get(m)??{}).map(id=>({id}))]})}})},getContext:()=>({isContextLost:()=>false}),initTexture:t=>calls.push(t)}};}
test('loading uploads deduplicated resident textures and shader samplers without touching framebuffer or video owners',async()=>{const f=fixture();let frames=0;assert.deepEqual(await initializeLoadingTextures(f.renderer,f.scene,{nextFrame:async()=>{frames++;}}),{textures:2});assert.deepEqual(f.calls,[f.shared,f.shaderOnly]);assert.equal(frames,2);});
test('cancelled upload stops before submitting any later native texture',async()=>{const f=fixture();let stop=false;await assert.rejects(initializeLoadingTextures(f.renderer,f.scene,{cancelled:()=>stop,nextFrame:async()=>{stop=true;}}),/cancelled/);assert.deepEqual(f.calls,[f.shared]);});


test('empty instanced crop variants compile but do not force unused atlas uploads',async()=>{
 const unused={isTexture:true},used={isTexture:true},empty={map:unused},live={map:used},calls=[];
 const renderer={properties:{get:()=>({currentProgram:{getUniforms:()=>({seq:[{id:'map'}]})}})},getContext:()=>({isContextLost:()=>false}),initTexture:texture=>calls.push(texture)};
 const objects=[{isInstancedMesh:true,count:0,material:empty,customDepthMaterial:empty},{isInstancedMesh:true,count:4,material:live}];
 const scene={traverse:callback=>objects.forEach(callback)};
 assert.deepEqual(await initializeLoadingTextures(renderer,scene,{nextFrame:async()=>{}}),{textures:1});assert.deepEqual(calls,[used]);
 // A real plant appearing later needs exactly the original sampler object.
 objects[0].count=1;calls.length=0;
 assert.deepEqual(await initializeLoadingTextures(renderer,scene,{nextFrame:async()=>{}}),{textures:2});assert.deepEqual(calls,[unused,used]);
});
test('an empty crop does not suppress its sampler shared by a drawable actor',async()=>{
 const shared={isTexture:true},material={map:shared},calls=[];
 const scene={traverse:callback=>[{isInstancedMesh:true,count:0,material},{material}].forEach(callback)};
 const renderer={properties:{get:()=>({currentProgram:{getUniforms:()=>({seq:[{id:'map'}]})}})},getContext:()=>({isContextLost:()=>false}),initTexture:texture=>calls.push(texture)};
 await initializeLoadingTextures(renderer,scene,{nextFrame:async()=>{}});assert.deepEqual(calls,[shared]);
});


test('already-aborted owner submits no texture or material queries',async()=>{
 const f=fixture(),owner=new AbortController();owner.abort();f.renderer.properties.get=()=>assert.fail('Late material query');
 await assert.rejects(initializeLoadingTextures(f.renderer,f.scene,{signal:owner.signal}),/cancelled/);assert.deepEqual(f.calls,[]);
});
test('native upload that aborts its owner stops before progress callback and subsequent samplers',async()=>{
 const f=fixture(),owner=new AbortController();f.renderer.initTexture=texture=>{f.calls.push(texture);owner.abort();};
 await assert.rejects(initializeLoadingTextures(f.renderer,f.scene,{signal:owner.signal,onTexture:()=>assert.fail('Late progress')}),/cancelled/);assert.deepEqual(f.calls,[f.shared]);
});
