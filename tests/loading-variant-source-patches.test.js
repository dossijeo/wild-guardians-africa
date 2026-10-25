import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchGroundCandidate,patchSharedSmoothCandidate,patchEligibleObstructionWarmup,installLoadingVariantRoutes} from '../tools/experiments/loading-variant-source-patches.js';
test('QA patches accept current source and fail closed on drift',async()=>{
 const ground=await readFile(new URL('../src/rendering/african-toon.js',import.meta.url),'utf8');
 const smooth=await readFile(new URL('../src/rendering/smooth-far-transitions.js',import.meta.url),'utf8');
 assert.ok(!ground.includes('production-ground-source'));
 assert.ok(!smooth.includes('sharedSmoothProgram'));
 assert.ok(patchGroundCandidate(ground).includes('/tools/experiments/production-ground-source.js'));
 assert.equal(patchSharedSmoothCandidate(smooth),smooth.replace('|smooth-standby-v1','|native-partial-blend-v1'));
 assert.throws(()=>patchGroundCandidate('changed'),/anchor changed/);
 assert.throws(()=>patchSharedSmoothCandidate('changed'),/anchor changed/);
});
test('normal harness installs no candidate routes',async()=>{
 const routes=[];await installLoadingVariantRoutes({route:async(...args)=>routes.push(args)});
 assert.equal(routes.length,0);
});

test('eligible warmup retains every LOD recipe with coverage and excludes ineligible merged materials',async()=>{
 const source=await readFile(new URL('../src/rendering/asset-groups.js',import.meta.url),'utf8');
 const patched=patchEligibleObstructionWarmup(source);
 const selection=patched.slice(patched.indexOf('const eligible=new Set(),sources=[];'),patched.indexOf('if(this.smoothObstruction)',patched.indexOf('const eligible=new Set(),sources=[];')));
 const select=new Function('chunks',selection+'return sources;');
 const material={},other={},unused={};
 const near={material},far={material:other},excluded={material:unused};
 const colors=new Map([['eligible',{mesh:near}],['excluded',{mesh:excluded}]]);
 const chunk={userData:{lodBatches:[
  {meshes:[{geometry:{attributes:{nativeVisibility:{}}}}],levels:[near,far]},
  {meshes:[{geometry:{attributes:{}}}],levels:[excluded]}
 ]}};
 const selected=select.call({colors},new Map([['chunk',chunk]]));
 assert.ok(selected.includes(near));assert.ok(selected.includes(far));assert.ok(!selected.includes(excluded));
 assert.deepEqual(select.call({colors},new Map()),[near,excluded]);
 assert.throws(()=>patchEligibleObstructionWarmup('changed'),/anchor changed/);
});
