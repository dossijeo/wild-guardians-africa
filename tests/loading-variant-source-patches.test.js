import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchGroundCandidate,patchSharedSmoothCandidate,installLoadingVariantRoutes} from '../tools/experiments/loading-variant-source-patches.js';
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
