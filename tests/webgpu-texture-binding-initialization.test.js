import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {DataTexture,FloatType,RGBAFormat} from 'three';
import {texture} from 'three/tsl';
import Bindings from 'three/src/renderers/common/Bindings.js';
import Textures from 'three/src/renderers/common/Textures.js';
import BindGroup from 'three/src/renderers/common/BindGroup.js';
import NodeBuilderState from 'three/src/renderers/common/nodes/NodeBuilderState.js';
import NodeSampler from 'three/src/renderers/common/nodes/NodeSampler.js';
import {NodeSampledTexture} from 'three/src/renderers/common/nodes/NodeSampledTexture.js';
import {objectGroup} from 'three/tsl';
import {installWebGpuTextureBindingInitialization} from '../src/rendering/webgpu-texture-binding-initialization.js';

const originalVideoFrame=globalThis.VideoFrame;
before(()=>{globalThis.VideoFrame??=class VideoFrame{};});
after(()=>{if(originalVideoFrame===undefined)delete globalThis.VideoFrame;else globalThis.VideoFrame=originalVideoFrame;});

function fixture(){
 const uploaded=[],backend={isWebGPUBackend:true,createSampler(){},createTexture(){},createDefaultTexture(){},updateTexture(value){uploaded.push(value);},destroySampler(){},destroyTexture(){},delete(){},createBindings(){}},renderer={backend},textures=new Textures(renderer,backend,{memory:{textures:0}}),bindings=new Bindings(backend,{},textures,{}, {},{});renderer._bindings=bindings;
 const palette=()=>{const value=new DataTexture(new Float32Array(16),2,2,RGBAFormat,FloatType);value.generateMipmaps=false;value.needsUpdate=true;return value;},first=palette(),second=palette(),third=palette(),node=texture(first).onObjectUpdate(({object})=>object.palette),group=new BindGroup('object',[new NodeSampler('palette_sampler',node,objectGroup),new NodeSampledTexture('palette',node,objectGroup)],0),state=new NodeBuilderState('', '', '', [], [group], [node], [], [],null);
 const object=value=>{const groups=state.createBindings();return {palette:value,getBindings:()=>groups};};
 return {renderer,bindings,uploaded,node,first,second,third,state,object};
}

test('actual Three Bindings and Textures reproduce disposed shared-template failure before node texture update',()=>{
 const f=fixture();try{const initial=f.object(f.first);f.node.update({object:initial});f.bindings.getForRender(initial);f.first.dispose();const next=f.object(f.second);f.node.update({object:next});assert.equal(next.getBindings()[0].bindings[1].texture,null);assert.equal(f.node.value,f.second);assert.throws(()=>f.bindings.getForRender(next),/Invalid value used as weak map key/);}finally{f.first.dispose();f.second.dispose();f.third.dispose();}
});

test('new binding initialization resolves actual node sampler and sampled texture after COW retirement',()=>{
 const f=fixture(),original=f.bindings._init,handle=installWebGpuTextureBindingInitialization(f.renderer);assert.equal(installWebGpuTextureBindingInitialization(f.renderer),handle);
 try{
  const first=f.object(f.first);f.node.update({object:first});f.bindings.getForRender(first);assert.equal(f.uploaded.at(-1),f.first);f.first.dispose();
  for(const palette of [f.second,f.third]){
   const next=f.object(palette);f.node.update({object:next});f.bindings.getForRender(next);const [sampler,sampled]=next.getBindings()[0].bindings;assert.equal(sampler.texture,palette);assert.equal(sampled.texture,palette);assert.equal(f.uploaded.at(-1),palette);const count=f.uploaded.length;f.bindings.getForRender(next);assert.equal(f.uploaded.length,count,'initialized groups do not resolve or reupload on each frame');palette.dispose();
  }
 }finally{handle.dispose();handle.dispose();assert.equal(f.bindings._init,original);f.first.dispose();f.second.dispose();f.third.dispose();}
});

test('binding hook validates supported layout and never substitutes a missing node texture',()=>{
 assert.throws(()=>installWebGpuTextureBindingInitialization({_bindings:{_init(){}},backend:{isWebGPUBackend:true}}),/initialized Three/);
 const f=fixture(),handle=installWebGpuTextureBindingInitialization(f.renderer);try{assert.throws(()=>f.bindings._init({}),/bind group layout/);f.node.value=null;assert.throws(()=>f.bindings.getForRender(f.object(f.first)),/no current object texture/);}finally{handle.dispose();f.first.dispose();f.second.dispose();f.third.dispose();}
});
