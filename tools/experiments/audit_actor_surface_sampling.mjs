import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as THREE from 'three';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createActorTerrainSampler} from '../../src/rendering/webgpu-actor-terrain.js';

const wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),core=createSpatialWorld(wasm);core.generate(712,0,0,'mangrove');
const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),water=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material,waterMaterial:water});residency.replace(core.chunkPayload(),1);
const previous=createActorTerrainSampler({get:residency.get}),current=createActorTerrainSampler(residency),points=[];let seed=617;
for(let i=0;i<256;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed/4294967296*47.8-23.9;seed=(Math.imul(seed,1664525)+1013904223)>>>0;points.push([x,seed/4294967296*47.8-23.9]);}
let maxDifference=0;for(const [x,z] of points)maxDifference=Math.max(maxDifference,Math.abs(previous(x,z)-current(x,z)));if(maxDifference>.00005)throw Error('Surface differs from mesh raycast: '+maxDifference);
const measure=sample=>{const start=performance.now();for(const [x,z] of points)sample(x,z);return performance.now()-start;},a=[],b=[];
for(let i=0;i<20;i++){let before,after;if(i%2){after=measure(current);before=measure(previous);}else{before=measure(previous);after=measure(current);}if(i>=4){a.push(before);b.push(after);}}
const stats=values=>{const sorted=[...values].sort((x,y)=>x-y),at=q=>sorted[Math.ceil(q*sorted.length)-1];return {mean:values.reduce((sum,value)=>sum+value,0)/values.length,p95:at(.95),p99:at(.99),max:sorted.at(-1)};};
console.log(JSON.stringify({samplesPerBatch:points.length,batches:a.length,maxDifference,raycastMs:stats(a),residentSurfaceMs:stats(b),scope:'Node CPU sampling of one real Wild Engine mangrove chunk; alternating order after warmup, not full game, WebGPU, water or FPS.'}));
residency.dispose();material.dispose();water.dispose();
