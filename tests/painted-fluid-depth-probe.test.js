import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WorldScene} from '../src/rendering/scene.js';
import * as THREE from 'three';
import {comparePackedFluidDepth,probePaintedFluidDepth,installPaintedFluidDepthProbe} from '../src/rendering/painted-fluid-depth-probe.js';

test('actual Three RGBA depth decoding distinguishes depth from color alpha and rejects mismatch',()=>{
  const a=new Uint8Array([128,0,0,0,255,255,255,255]);
  assert.deepEqual(comparePackedFluidDepth(a,a),{mismatches:0,maxDelta:0,occupied:1,clear:1,pixels:2,tolerance:2/16777216});
  assert.equal(comparePackedFluidDepth(a,new Uint8Array([129,0,0,0,255,255,255,255])).mismatches,1);
  assert.throws(()=>comparePackedFluidDepth(a,new Uint8Array(4)),/Invalid/);
});

function fixture(fault){
  let target=null,loss=false,watched=new Set(),disposed=new Map(),initialized=new Set();const previous={};target=previous;
  const viewport=new THREE.Vector4(2,3,4,5),scissor=new THREE.Vector4(6,7,8,9),clear=new THREE.Color(0x123456);
  let alpha=.7,scissorTest=true,reads=0;
  const observe=resource=>{if(resource&&!watched.has(resource)){watched.add(resource);if(resource.addEventListener)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)??0)+1));else{const original=resource.dispose;resource.dispose=function(...args){disposed.set(resource,(disposed.get(resource)??0)+1);return original.apply(this,args);};}}};
  const world={loading:new AbortController(),disposed:false};
  const renderer=world.renderer={capabilities:{reverseDepthBuffer:false},shadowMap:{enabled:true},xr:{enabled:true},autoClear:true,
    properties:{get:()=>({currentProgram:{id:7,cacheKey:'mock-not-native-raster'}})},getContext:()=>({isContextLost:()=>loss}),
    getRenderTarget:()=>target,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>3,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,
    getClearColor:v=>{if(fault==='snapshot')throw Error('snapshot');return v.copy(clear);},getClearAlpha:()=>alpha,
    setRenderTarget(value){if(value===previous&&fault==='restore')throw Error('restore');target=value;if(value!==previous){observe(value);observe(value?.depthTexture);if(fault==='bind')throw Error('bind');if(value?.depthTexture&&!initialized.has(value)){initialized.add(value);const deallocate=()=>{value.removeEventListener('dispose',deallocate);value.depthTexture.dispose();};value.addEventListener('dispose',deallocate);}}},
    setViewport(v,...rest){if(typeof v==='number')viewport.set(v,...rest);else viewport.copy(v);},setScissor:v=>scissor.copy(v),setScissorTest:v=>{scissorTest=v;},setClearColor(v,a){clear.set(v);alpha=a;},clear(){},
    render(scene){scene.traverse(object=>{observe(object.geometry);if(object.material){observe(object.material);if(object.material.displacementMap)observe(object.material.displacementMap);}observe(object.skeleton);});if(fault==='render')throw Error('render');},
    readRenderTargetPixels(rt,x,y,w,h,bytes){reads++;if(fault==='read')throw Error('read');for(let i=0;i<bytes.length;i+=4){if(i<bytes.length/2){bytes[i]=128;}else bytes.fill(255,i,i+4);}if(fault==='cancel')world.loading.abort();if(fault==='loss')loss=true;}
  };
  return {world,verify(){assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.xr.enabled,true);assert.deepEqual(viewport.toArray(),[2,3,4,5]);assert.deepEqual(scissor.toArray(),[6,7,8,9]);assert.equal(scissorTest,true);assert.equal(alpha,.7);assert.equal(clear.getHex(),0x123456);if(fault!=='restore')assert.equal(target,previous);for(const resource of watched)assert.equal(disposed.get(resource),1,'exactly one private disposal: '+resource.type);}};
}
function run(world){const old=globalThis.__desktopSmokeFluidDepth;globalThis.__desktopSmokeFluidDepth=true;try{return probePaintedFluidDepth(world);}finally{if(old===undefined)delete globalThis.__desktopSmokeFluidDepth;else globalThis.__desktopSmokeFluidDepth=old;}}
test('CPU double exercises fallback/specialized paths, form matrix and resource/state cleanup; not native proof',()=>{
  const f=fixture();const report=run(f.world);assert.equal(report.passed,true);assert.equal(report.steps.length,28);assert.deepEqual([...new Set(report.steps.map(s=>s.form))],['plain','instanced','batched','morph','skinned','displaced']);assert.ok(report.scope.includes('depth attachment'));f.verify();
});
for(const fault of ['snapshot','bind','render','read','cancel','loss','restore'])test('private ownership and independent renderer restoration after '+fault,()=>{const f=fixture(fault);assert.throws(()=>run(f.world),fault==='cancel'||fault==='loss'?/cancelled/:new RegExp(fault));f.verify();});
test('CLI is explicit smoke-only; tester invokes depth proof only after unchanged genuine world gate',()=>{
  const rust=readFileSync(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8'),smoke=readFileSync(new URL('../src-tauri/smoke.js',import.meta.url),'utf8');
  assert.ok(rust.indexOf('--smoke-fluid-depth')>rust.indexOf('arg == "--smoke-report"'));
  assert.ok(smoke.includes('fluidDepth:window.__desktopSmokeFluidDepth===true'));
  assert.ok(smoke.indexOf('report.checks.fluidDepthBinding=probe()')>smoke.indexOf("throw Error('Production world did not finish loading')"));
  assert.ok(smoke.includes('performance.now() + 90000'));
});


test('real failed World constructor never publishes a fluid probe owner',()=>{
  const oldFlag=globalThis.__desktopSmokeFluidDepth,oldProbe=globalThis.__desktopSmokeFluidDepthProbe,sentinel=()=>{};
  globalThis.__desktopSmokeFluidDepth=true;globalThis.__desktopSmokeFluidDepthProbe=sentinel;
  try{assert.throws(()=>new WorldScene({},()=>{}));assert.equal(globalThis.__desktopSmokeFluidDepthProbe,sentinel);
    const scene=readFileSync(new URL('../src/rendering/scene.js',import.meta.url),'utf8');
    assert.ok(scene.indexOf('this.releaseFluidDepthProbe=installPaintedFluidDepthProbe(this)')>scene.indexOf("canvas.addEventListener('webglcontextrestored'"));
  }finally{if(oldFlag===undefined)delete globalThis.__desktopSmokeFluidDepth;else globalThis.__desktopSmokeFluidDepth=oldFlag;if(oldProbe===undefined)delete globalThis.__desktopSmokeFluidDepthProbe;else globalThis.__desktopSmokeFluidDepthProbe=oldProbe;}
});
test('actual World.dispose releases its callback before cleanup failure and cannot erase replacement owner',()=>{
  const oldFlag=globalThis.__desktopSmokeFluidDepth,oldProbe=globalThis.__desktopSmokeFluidDepthProbe;
  globalThis.__desktopSmokeFluidDepth=true;
  try{
    const world={loading:new AbortController(),spellPreview:{dispose(){throw Error('later cleanup');}}};
    world.releaseFluidDepthProbe=installPaintedFluidDepthProbe(world);const ownCallback=globalThis.__desktopSmokeFluidDepthProbe;
    assert.equal(typeof ownCallback,'function');assert.throws(()=>WorldScene.prototype.dispose.call(world),/later cleanup/);assert.equal(globalThis.__desktopSmokeFluidDepthProbe,undefined);world.releaseFluidDepthProbe();
    const first={loading:new AbortController()},next={loading:new AbortController()};const releaseFirst=installPaintedFluidDepthProbe(first),releaseNext=installPaintedFluidDepthProbe(next),nextCallback=globalThis.__desktopSmokeFluidDepthProbe;
    first.loading.abort();releaseFirst();assert.equal(globalThis.__desktopSmokeFluidDepthProbe,nextCallback);next.loading.abort();releaseNext();assert.equal(globalThis.__desktopSmokeFluidDepthProbe,undefined);
    const aborted={loading:new AbortController()};aborted.loading.abort();installPaintedFluidDepthProbe(aborted);assert.equal(globalThis.__desktopSmokeFluidDepthProbe,undefined);
  }finally{if(oldFlag===undefined)delete globalThis.__desktopSmokeFluidDepth;else globalThis.__desktopSmokeFluidDepth=oldFlag;if(oldProbe===undefined)delete globalThis.__desktopSmokeFluidDepthProbe;else globalThis.__desktopSmokeFluidDepthProbe=oldProbe;}
});
