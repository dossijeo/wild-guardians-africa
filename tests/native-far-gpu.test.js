import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group} from 'three';
import {prepareNativeFarGpu} from '../tools/experiments/prepare-native-far-gpu.js';

function fixture({renderError=false}={}){
 const scene=new Scene(),parent=new Group(),root=new Group();parent.add(root);const original={},calls=[];let current=original,waits=0;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,WAIT_FAILED:4,NO_ERROR:0,isContextLost:()=>false,fenceSync:()=>{calls.push('fence');return {};},flush:()=>calls.push('flush'),clientWaitSync:()=>++waits<2?0:3,deleteSync:()=>calls.push('delete'),getError:()=>0};
 const renderer={getContext:()=>gl,initTexture:()=>calls.push('texture'),compileAsync:async(r,c,s)=>{assert.equal(r,root);assert.equal(s,scene);calls.push('compile');},getRenderTarget:()=>current,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,setRenderTarget:(t,face,mip)=>{current=t;if(t===original){assert.equal(face,2);assert.equal(mip,1);calls.push('restore');}},render:()=>{assert.equal(root.parent,scene);calls.push('render');if(renderError)throw Error('Draw failed');}};
 return {scene,parent,root,original,calls,renderer,current:()=>current};
}
test('GPU preparation compiles, uploads through offscreen draw and yields until fence signals',async()=>{
 const f=fixture(),texture={};let frames=0;
 const result=await prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[texture,texture],{nextFrame:async()=>{frames++;}});
 assert.equal(result.textures,1);assert.equal(frames,1);assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);
 assert.deepEqual(f.calls,['texture','compile','render','restore','fence','flush','delete']);
});
test('failed offscreen draw restores renderer and parent before rejecting',async()=>{
 const f=fixture({renderError:true});await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[]),/Draw failed/);
 assert.equal(f.root.parent,f.parent);assert.equal(f.current(),f.original);assert.deepEqual(f.calls,['compile','render','restore']);
});
test('cancelled preparation never compiles or draws',async()=>{
 const f=fixture();await assert.rejects(prepareNativeFarGpu(f.renderer,f.root,f.scene,{},[],{cancelled:()=>true}),/cancelled/);assert.deepEqual(f.calls,[]);
});
