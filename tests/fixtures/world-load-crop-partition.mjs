import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../../src/rendering/scene.js';
const manifest={biomes:{savanna:[{slot:0,localBase:[0,0,0]}]}};
const routes={
 '/content/biome-savanna.json':{profile:{colors:{water:'#567890'}},assets:[]},
 '/content/destruction.json':{buildings:[]},'/content/models.json':[{source:'Cultivos',url:'/crop.glb'}],
 '/content/worker-actions.json':{},'/content/watering-emitters.json':{profiles:{}},
 '/content/crop-bridges.json':{},'/content/walls.json':{},'/content/vfx.json':{atlas:'/vfx.png'},'/content/far-vegetation.json':manifest};
const calls={workers:[],attach:[],json(path){assert.ok(path in routes,path);return routes[path];}};globalThis.__worldLoadCpu=calls;globalThis.matchMedia=()=>({matches:false});
for(const saved of [false,true]){
 const enabled=false,cropCalls=[];
 const world=Object.create(WorldScene.prototype),events=[];
 const cropPartition={models:async scope=>{cropCalls.push(["models",scope]);const scene=new THREE.Scene();for(let i=0;i<40;i++){const mesh=new THREE.Mesh();mesh.userData={cropIndex:Math.floor(i/5),stage:i%5+1};scene.add(mesh);}return {scene};},bridges:async(data,scope)=>{cropCalls.push(["bridges",scope]);return {bakedTemplates:new Map(Array.from({length:32},(_,i)=>[i,{}]))};}};
 Object.assign(world,{cropPartition,loading:new AbortController(),loadingCpuBudget:enabled,disposed:false,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),controls:{target:new THREE.Vector3()},renderer:{},wateringEmitters:new Map(),destructionPass:{},
 sky:{load:async()=>{},environmentTextures:[],uniforms:{uSkyYaw:{value:0}}},toon:{environment(){},environmentUniforms:{},uniforms:{},shadowUniforms:{}},
 assets:{biome:async()=>[],village:async()=>[],model:async()=>{throw Error('Original full crop must not load');},walls:async()=>[],texture:async()=>new THREE.Texture(),releaseLoadingImageDecoder(){events.push('release decoder');}},
 loadingMilestone:async id=>events.push(id),ensureBuilding:async()=>{},warmAnimalModels:async()=>{},prepareSavedAnimalRigs:async()=>{},sync(){},syncChunks(){},focusFarm(){this.camera.position.set(70,20,30);events.push('actual focus');},
 horizon:{whenReady:async()=>{}},loadedAnimalActors:async()=>{},loadedWorkerActors:async()=>{},warmAnimalGpu:async()=>{events.push('GPU warm');}});
 const state={seed:'712',elapsed:0,biome:'sabana',culture:'mapungubwe',villages:[],structures:[],workers:[],plants:saved?[{id:'saved',species:'maiz',growth:210}]:[]},nav={config:{seed:'712',biome:'savanna'},field:{surface:()=>0}};
 await WorldScene.prototype.load.call(world,state,nav,{}, {farVegetation:{includeFarGround:true},loadingProgress:{}});
 assert.deepEqual(cropCalls,[['models','all'],['bridges','all']]);assert.equal(world.cropModels.filter(Boolean).length,40);assert.equal(world.cropBridgeData.bakedTemplates.size,32);assert.ok(events.indexOf('crops')<events.indexOf('GPU warm'));
 const options=calls.attach.at(-1);assert.equal(options.parallelAssets,enabled);
 assert.equal(Boolean(options.initialRegion),enabled);if(enabled){assert.equal(calls.workers.length,1);assert.equal(calls.workers[0].request.treeBounds.minX,-330);assert.equal(calls.workers[0].request.treeBounds.minZ,-370);}
 assert.ok(events.indexOf('actual focus')<events.indexOf('GPU warm'));assert.ok(events.includes('far-assets'));assert.ok(events.includes('release decoder'));
 world.loading.abort();
}
console.log('WorldScene.load partition callpath: New + saved Continue PASS');
