import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareNaturalWaterBed,prepareNaturalWater} from '../src/rendering/natural-water-edges.js';
import {prepareCanyonWater} from '../tools/experiments/qa-canyon-water-worldbank-20261022.js';
import {NativeHorizon,nativeNearRegion} from '../src/rendering/horizon.js';

test('incremental maximum-size Canyon bed preserves original packed bytes without resampling at adoption',()=>{
 const geometry=new THREE.PlaneGeometry(300,300,1,1).rotateX(-Math.PI/2).toNonIndexed();
 const original=geometry.clone(),material=new THREE.MeshStandardMaterial();material.onBeforeCompile=()=>{};
 let samples=0;
 const world={state:{biome:'gran-canon'},nav:{field:{canyon:true,surface:(x,z)=>{samples++;return Math.sin(x*.2)+Math.cos(z*.13);}}}};
 prepareCanyonWater(world,original,-3,4,material);
 const baseline={uniforms:{},fragmentShader:'#include <opaque_fragment>'};original.userData.qaMaterial.onBeforeCompile(baseline,{});
 samples=0;const iterator=prepareNaturalWaterBed(world,geometry,-3,4);let step,yields=0;
 do{const before=samples;step=iterator.next();assert(samples-before<=128);if(!step.done)yields++;}while(!step.done);
 assert(yields>2000);assert.equal(samples,513*513);const before=samples;
 prepareNaturalWater(world,geometry,-3,4,material,step.value);assert.equal(samples,before);
 const actual={uniforms:{},fragmentShader:'#include <opaque_fragment>'};material.onBeforeCompile(actual,{});
 assert.deepEqual(actual.uniforms.qaBed.value.image.data,baseline.uniforms.qaBed.value.image.data);
 assert.deepEqual(actual.uniforms.qaBedBounds.value,baseline.uniforms.qaBedBounds.value);
 assert.deepEqual(actual.uniforms.qaBedRange.value,baseline.uniforms.qaBedRange.value);
 original.userData.qaMaterial.dispose();material.dispose();geometry.dispose();original.dispose();
});

test('pending bed keeps old horizon and clipping until adoption, cancels on revision and releases on disposal',()=>{
 const worker={requests:[],postMessage(r){this.requests.push(r);},terminate(){},reply(){const r=this.requests.at(-1);this.onmessage({data:{id:r.id,data:{terrain:new Float32Array(27),water:new Float32Array(27)}}});}};
 let revision=1,clock=0,cancelled=0,applied=0;
 const scene=new THREE.Scene(),horizon=new NativeHorizon(scene,()=>new THREE.MeshBasicMaterial(),null,null,{
  workerFactory:()=>worker,spatial:{revision:()=>revision,snapshot:()=>({})},now:()=>clock++,preparationBudgetMs:1,
  prepareWaterBed:function*(){try{yield;yield;return {marker:123};}finally{cancelled++;}},
  prepareWater:(_mesh,_region,bed)=>{if(bed){assert.equal(bed.marker,123);applied++;}}
 });
 const config={biome:'canyons',seed:712,river:true},profile={colors:{water:'#123456'}},first=nativeNearRegion({x:0,z:0}),next=nativeNearRegion({x:48,z:0});
 horizon.update(config,profile,first,'media');worker.reply();horizon.update(config,profile,first,'media');
 const old=horizon.group,clip=old.children[0].material.userData.horizonBounds;
 horizon.update(config,profile,next,'media');worker.reply();assert.deepEqual(horizon.update(config,profile,next,'media'),first);
 let released=0;horizon.pendingPreparation.geometry.addEventListener('dispose',()=>released++);
 horizon.update(config,profile,next,'media');assert.equal(horizon.group,old);assert.deepEqual(clip.toArray(),first.bounds);
 revision++;horizon.update(config,profile,next,'media');assert.equal(released,1);assert.equal(cancelled,1);assert.equal(applied,0);
 worker.reply();horizon.update(config,profile,next,'media');
 for(let i=0;i<3;i++)horizon.update(config,profile,next,'media');
 assert.notEqual(horizon.group,old);assert.deepEqual(horizon.region,next);assert.equal(applied,1);assert.deepEqual(clip.toArray(),next.bounds);
 horizon.update(config,profile,first,'media');worker.reply();horizon.update(config,profile,first,'media');
 horizon.update(config,profile,first,'media');let disposed=0;horizon.pendingPreparation.geometry.addEventListener('dispose',()=>disposed++);
 horizon.dispose();horizon.dispose();assert.equal(disposed,1);assert.equal(horizon.pendingPreparation,null);assert.equal(scene.children.length,0);
});
