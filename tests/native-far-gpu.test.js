import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Vector4} from 'three';
import {prepareNativeFarGpu} from '../tools/experiments/prepare-native-far-gpu.js';

function fixture({renderError=false}={}){
 const scene=new Scene(),parent=new Group(),root=new Group();parent.add(root);const original={},calls=[];let current=original,waits=0,viewport=new Vector4(2,3,100,200),scissor=new Vector4(4,5,60,70),scissorTest=false;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>{calls.push('fence');return {};},flush:()=>calls.push('flush'),clientWaitSync:()=>++waits<2?0:3,deleteSync:()=>calls.push('delete'),getError:()=>0};
 const renderer={getContext:()=>gl,initTexture:()=>calls.push('texture'),compileAsync:async(r,c,s)=>{assert.equal(r,root);assert.equal(s,scene);calls.push('compile');},autoClear:true,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setViewport:(...v)=>{viewport=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissor:(...v)=>{scissor=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissorTest:v=>{scissorTest=v;if(!v)calls.push('restore');},render:()=>{assert.equal(root.parent,scene);assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.deepEqual(scissor.toArray(),[0,0,0,0]);assert.equal(scissorTest,true);assert.equal(renderer.autoClear,false);calls.push('render');if(renderError)throw Error('Draw failed');}};
 return {scene,parent,root,original,calls,renderer,current:()=>current,restored(){assert.deepEqual(viewport.toArray(),[2,3,100,200]);assert.deepEqual(scissor.toArray(),[4,5,60,70]);assert.equal(scissorTest,false);assert.equal(renderer.autoClear,true);}};
}
test('GPU preparation compiles, uploads through zero-pixel draw and yields until fence signals',async()=>{
 const f=fixture(),texture={};let frames=0;
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture,texture],{nextFrame:async()=>{frames++;}});
 assert.equal(result.textures,1);assert.equal(frames,1);assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);f.restored();
 assert.deepEqual(f.calls,['texture','compile','render','restore','fence','flush','delete']);
});
test('failed zero-pixel draw restores renderer and parent before rejecting',async()=>{
 const f=fixture({renderError:true});await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[]),/Draw failed/);
 assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);f.restored();assert.deepEqual(f.calls,['compile','render','restore']);
});
test('cancelled preparation never compiles or draws',async()=>{
 const f=fixture();await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>true}),/cancelled/);assert.deepEqual(f.calls,[]);
});
test('cancellation during fence polling releases the sync and leaves rendering restored',async()=>{
 const f=fixture();let cancelled=false;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);
 f.restored();assert.equal(f.root.parent,f.parent);assert.equal(f.calls.at(-1),'delete');
});
test('texture preparation deduplicates and yields between bounded batches before compilation',async()=>{
 const f=fixture(),a={},b={},c={},d={},e={};
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[a,b,c,a,d,e],{texturesPerFrame:2,nextFrame:async()=>f.calls.push('frame')});
 assert.equal(result.textures,5);assert.equal(result.textureBatches,3);assert.equal(result.maxTextureBatchCount,2);
 assert.deepEqual(f.calls.slice(0,8),['texture','texture','frame','texture','texture','frame','texture','compile']);
});
test('cancelling between texture batches prevents remaining uploads and compilation',async()=>{
 const f=fixture();let cancelled=false;
 await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[{},{}],{cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);
 assert.deepEqual(f.calls,['texture']);f.restored();
 for(const texturesPerFrame of [0,-1,1.5,Infinity])await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{texturesPerFrame}),/budget/);
});
