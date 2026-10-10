import {cropCollectionKind} from '../../src/rendering/crop-runtime.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {Assets} from '../../src/rendering/assets.js';
import {WorldScene} from '../../src/rendering/scene.js';
const manifest={biomes:{savanna:[{slot:0,localBase:[0,0,0]}]}};
const routes={
 '/content/biome-savanna.json':{profile:{colors:{water:'#567890'}},assets:[]},
 '/content/destruction.json':{buildings:[]},'/content/models.json':JSON.parse(fs.readFileSync('public/content/models.json')),
 '/content/worker-actions.json':{},'/content/watering-emitters.json':{profiles:{}},
 '/content/crop-bridges.json':JSON.parse(fs.readFileSync('public/content/crop-bridges.json')),'/content/walls.json':{},'/content/vfx.json':{atlas:'/vfx.png'},'/content/far-vegetation.json':manifest};
const calls={workers:[],attach:[],json(path){assert.ok(path in routes,path);return routes[path];}};globalThis.__worldLoadCpu=calls;globalThis.matchMedia=()=>({matches:false});
globalThis.self=globalThis;globalThis.ProgressEvent=class {constructor(type,fields){Object.assign(this,{type},fields);}};
const requests=[];globalThis.fetch=async request=>{const url=typeof request==='string'?request:request.url,path=new URL(url,'http://localhost/').pathname;if(path in routes)return new Response(JSON.stringify(routes[path]));assert.ok(path.startsWith('/assets/crop-partition-v1-'),path);requests.push(path);const bytes=fs.readFileSync('public'+path);return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});};
for(const saved of [false,true]){
 const enabled=false,cropCalls=[],pairOverlap=process.argv.includes('--pair-overlap');
 const world=Object.create(WorldScene.prototype),events=[];
 const assets=new Assets();const originalModel=assets.model.bind(assets);assets.model=(url,...args)=>{const kind=cropCollectionKind(url);if(kind)cropCalls.push(kind+':start');return originalModel(url,...args).then(gltf=>{if(kind)cropCalls.push(kind+':end');return gltf;});};assets.biome=async()=>[];assets.village=async()=>[];assets.walls=async()=>[];assets.textures.loadAsync=async()=>new THREE.Texture();
 Object.assign(world,{loading:new AbortController(),loadingCpuBudget:enabled,loadingCropPairOverlap:pairOverlap,disposed:false,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),controls:{target:new THREE.Vector3()},renderer:{},wateringEmitters:new Map(),destructionPass:{},
 sky:{load:async()=>{},environmentTextures:[],uniforms:{uSkyYaw:{value:0}}},toon:{environment(){},environmentUniforms:{},uniforms:{},shadowUniforms:{}},
 assets,
 loadingMilestone:async id=>events.push(id),ensureBuilding:async()=>{},warmAnimalModels:async()=>{},prepareSavedAnimalRigs:async()=>{},sync(){},syncChunks(){},focusFarm(){this.camera.position.set(70,20,30);events.push('actual focus');},
 horizon:{whenReady:async()=>{}},loadedAnimalActors:async()=>{},loadedWorkerActors:async()=>{},warmAnimalGpu:async()=>{events.push('GPU warm');}});
 const state={seed:'712',elapsed:0,biome:'sabana',culture:'mapungubwe',villages:[],structures:[],workers:[],plants:saved?[{id:'saved',species:'maiz',growth:210}]:[]},nav={config:{seed:'712',biome:'savanna'},field:{surface:()=>0}};
 await WorldScene.prototype.load.call(world,state,nav,{}, {farVegetation:{includeFarGround:true},loadingProgress:{}});
 if(pairOverlap){const steady=cropCalls.findIndex(v=>v.includes('steady:start')),bridge=cropCalls.findIndex(v=>v.includes('bridges:start')),steadyEnd=cropCalls.findIndex(v=>v.includes('steady:end'));assert.ok(steady>=0&&bridge>steady&&bridge<steadyEnd,JSON.stringify(cropCalls));}assert.equal(world.cropPartition,undefined);assert.ok(assets.cropPartition);assert.equal(world.cropModels.filter(Boolean).length,40);assert.equal(world.cropBridgeData.bakedTemplates.size,32);assert.ok(events.indexOf('crops')<events.indexOf('GPU warm'));
 const options=calls.attach.at(-1);assert.equal(options.parallelAssets,enabled);
 assert.equal(Boolean(options.initialRegion),enabled);if(enabled){assert.equal(calls.workers.length,1);assert.equal(calls.workers[0].request.treeBounds.minX,-330);assert.equal(calls.workers[0].request.treeBounds.minZ,-370);}
 assert.ok(events.indexOf('actual focus')<events.indexOf('GPU warm'));assert.ok(events.includes('far-assets'));
 assert.equal(requests.length,saved?10:5);assets.disposeModels();world.loading.abort();
}
console.log('WorldScene.load generic default Assets callpath: New + saved Continue PASS');
