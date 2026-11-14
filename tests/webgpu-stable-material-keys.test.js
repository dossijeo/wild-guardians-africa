import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MeshBasicNodeMaterial,NodeMaterial} from 'three/webgpu';
import {uniform,vec4} from 'three/tsl';
import {Texture,RepeatWrapping,NearestFilter} from 'three';
import {createStableMaterialKeys} from '../src/rendering/webgpu-stable-material-keys.js';
import {patchStableMaterialKeys} from '../tools/patch-three-stable-material-keys.mjs';
import RenderObject from 'three/src/renderers/common/RenderObject.js';

// Execute the actual installed Three key implementation with minimal context.
const source=readFileSync('node_modules/three/src/renderers/common/RenderObject.js','utf8');
test('patch is idempotent and fails on an incompatible dependency',()=>{assert.equal(patchStableMaterialKeys(source),source);assert.throws(()=>patchStableMaterialKeys('changed dependency'),/Unexpected/);});
test('unchanged material keys do not traverse graphs; uniforms stay dynamic',()=>{
 const keys=createStableMaterialKeys(),material=new MeshBasicNodeMaterial(),phase=uniform(0);material.colorNode=vec4(phase,0,0,1);let builds=0;const build=()=>{builds++;return material.customProgramCacheKey();};
 const first=keys.get(material,build);for(let i=0;i<100;i++){phase.value=i;material.color.setRGB(i/100,0,0);assert.equal(keys.get(material,build),first);}assert.equal(builds,1);
 material.colorNode=vec4(0,1,0,1);assert.notEqual(keys.get(material,build),first);assert.equal(builds,2);
 material.colorNode.needsUpdate=true;keys.get(material,build);assert.equal(builds,3);keys.dispose();
});
test('sampler changes notify all owners; texture data uploads do not invalidate keys',()=>{
 const keys=createStableMaterialKeys(),texture=new Texture(),a=new MeshBasicNodeMaterial(),b=new MeshBasicNodeMaterial();a.map=b.map=texture;
 let count=0;const get=m=>keys.get(m,()=>{count++;return [m.map?.wrapS,m.map?.minFilter,m.alphaTest!==0].join(':');});get(a);get(b);texture.needsUpdate=true;get(a);get(b);assert.equal(count,2);
 texture.wrapS=RepeatWrapping;get(a);get(b);assert.equal(count,4);texture.minFilter=NearestFilter;get(a);get(b);assert.equal(count,6);a.alphaTest=.5;get(a);assert.equal(count,7);a.alphaTest=.25;get(a);assert.equal(count,7);
 a.dispose();b.dispose();assert.equal(keys.status().materials,0);assert.ok(Object.getOwnPropertyDescriptor(texture,'wrapS').value!==undefined);keys.dispose();
});
test('custom program functions fall back and explicit invalidation permits new structural fields',()=>{
 const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial();let count=0;const build=()=>{count++;return m.customProgramCacheKey();};keys.get(m,build);m.customProgramCacheKey=()=>String(count);keys.get(m,build);keys.get(m,build);assert.equal(count,3);
 m.customProgramCacheKey=NodeMaterial.prototype.customProgramCacheKey;keys.invalidate(m);keys.get(m,build);keys.get(m,build);assert.equal(count,4);keys.dispose();
});
test('real Three material keys agree across shadow variants, states and sampler changes',()=>{
 const keys=createStableMaterialKeys({audit:true}),material=new MeshBasicNodeMaterial(),renderer={backend:{isWebGPUBackend:true},_wgMaterialKeys:keys},context={material,renderer,object:{receiveShadow:true},clippingContextCacheKey:'test'},a=vec4(1,0,0,1),b=vec4(0,1,0,1),texture=new Texture();material.map=texture;
 const compare=()=>{const cached=RenderObject.prototype.getMaterialCacheKey.call(context);renderer._wgMaterialKeys=null;const reference=RenderObject.prototype.getMaterialCacheKey.call(context);renderer._wgMaterialKeys=keys;assert.equal(cached,reference);};
 for(let i=0;i<40;i++){material.colorNode=i%2?a:b;material.needsUpdate=true;compare();}assert.equal(keys.status().builds,2);assert.equal(keys.status().discoveries,1);
 material.alphaTest=.5;compare();texture.wrapS=RepeatWrapping;compare();texture.minFilter=NearestFilter;compare();texture.needsUpdate=true;compare();material.transparent=true;compare();material.color.setHex(0x234567);compare();keys.dispose();
});
test('added optional sampler fields survive subscription disposal',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial(),texture=new Texture();m.map=texture;keys.get(m,()=>String(texture.wrapR));texture.wrapR=RepeatWrapping;assert.equal(keys.get(m,()=>String(texture.wrapR)),String(RepeatWrapping));keys.dispose();assert.equal(texture.wrapR,RepeatWrapping);});

test('primitive type changes invalidate even when their string shapes coincide',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial();m.testField=null;let count=0;const build=()=>{count++;return typeof m.testField+String(m.testField);};keys.get(m,build);m.testField='null';assert.equal(keys.get(m,build),'stringnull');assert.equal(count,2);keys.dispose();});

test('replacement node collections stay on the reference path until readmitted',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial();m.testField=null;let count=0;const build=()=>String(++count);keys.get(m,build);m.testField=[vec4(1)];keys.get(m,build);m.needsUpdate=true;keys.get(m,build);assert.equal(count,3);m.testField=null;keys.invalidate(m);keys.get(m,build);keys.get(m,build);assert.equal(count,4);keys.dispose();});

test('revisiting shadow variants never rereads unrelated material fields',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial(),a=vec4(1),b=vec4(0);let reads=0,value=1;Object.defineProperty(m,'structuralProbe',{configurable:true,enumerable:true,get(){reads++;return value;},set(v){value=v;}});const get=()=>keys.get(m,()=>m.customProgramCacheKey());m.colorNode=a;get();m.colorNode=b;get();const before=reads;for(let i=0;i<100;i++){m.colorNode=i%2?a:b;m.needsUpdate=true;get();}assert.equal(reads,before);assert.equal(keys.status().builds,2);keys.dispose();});

test('unsupported root keys cannot become cacheable through needsUpdate',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial();m.colorNode=vec4(1);m.colorNode.getCacheKey=()=>1;let builds=0;const get=()=>keys.get(m,()=>String(++builds));get();m.needsUpdate=true;get();get();assert.equal(builds,3);keys.dispose();});

test('bounded tuple interning preserves identities after sustained structural changes',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial();m.testField='initial';const get=()=>keys.get(m,()=>m.testField);assert.equal(get(),'initial');for(let i=0;i<10000;i++){m.testField='state:'+i;if(i%333===0)assert.equal(get(),m.testField);}assert.equal(get(),'state:9999');m.testField='initial';assert.equal(get(),'initial');keys.dispose();});

test('absent and null optional sampler values have distinct reference keys',()=>{const keys=createStableMaterialKeys({audit:true}),m=new MeshBasicNodeMaterial();m.map=new Texture();const get=()=>keys.get(m,()=>String(m.map.wrapR));assert.equal(get(),'undefined');m.map.wrapR=null;assert.equal(get(),'null');m.map.wrapR=undefined;assert.equal(get(),'undefined');keys.dispose();});

test('admission structural snapshots reuse identity and observe exact fixed state and texture binding changes',()=>{
 const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial(),texture=new Texture();m.map=texture;let builds=0;
 const build=()=>{builds++;return [m.customProgramCacheKey(),m.side,m.depthFunc,m.map.type,m.map.channel,m.map.renderTarget?.samples,m.map.wrapS];},get=()=>keys.admissionInputs(m,build);
 const initial=get();for(let i=0;i<100;i++)assert.equal(get(),initial);assert.equal(builds,1);
 m.opacity=.3;m.color.setHex(0xff0000);texture.needsUpdate=true;assert.equal(get(),initial);assert.equal(builds,1);
 for(const change of [()=>m.side=2,()=>m.depthFunc=7,()=>texture.type=1015,()=>texture.channel=1,()=>texture.renderTarget={samples:4},()=>texture.renderTarget.samples=8,()=>texture.wrapS=RepeatWrapping]){const before=get();change();assert.notEqual(get(),before);}
 const before=get();m.colorNode=vec4(1);assert.notEqual(get(),before);const node=get();m.colorNode.needsUpdate=true;get();assert.ok(builds>8);keys.dispose();
});

test('readmission and custom key fallback preserve equivalent admission identities',()=>{const keys=createStableMaterialKeys(),m=new MeshBasicNodeMaterial(),build=()=>[m.customProgramCacheKey(),m.side],first=keys.admissionInputs(m,build);keys.invalidate(m);assert.equal(keys.admissionInputs(m,build),first);m.customProgramCacheKey=()=> 'custom';const custom=keys.admissionInputs(m,build);assert.equal(keys.admissionInputs(m,build),custom);m.side=2;assert.notEqual(keys.admissionInputs(m,build),custom);keys.dispose();});
