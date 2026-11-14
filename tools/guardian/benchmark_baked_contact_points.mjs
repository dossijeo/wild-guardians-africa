import {readFile,writeFile} from 'node:fs/promises';
import {AnimationMixer,Group,Vector3} from 'three';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {animalFootSamples} from '../../src/rendering/animal-terrain-support.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createSpatialTerrainView} from '../../src/world/wild-engine/spatial-terrain-view.js';

// Isolated Node benchmark: one actor; timed regions calculate the lift only.
// Pose preparation, applying the result, rendering and bank creation are excluded.
const module=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const world=createSpatialWorld(module);world.generate(712,0,0,'savanna',{});
for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)if(world.selectChunk(x,z)<0)world.addChunk(x,z);
const terrain=createSpatialTerrainView(world),surface=(x,z)=>terrain.surface(x,z);
const results=[],point=new Vector3();
const stats=values=>{const a=[...values].sort((x,y)=>x-y);return {count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],max:a.at(-1)};};
for(const species of Object.keys(ANIMAL_ACTIONS.animals).sort()){
 const gltf=await actorAsset('public'+ANIMAL_ACTIONS.animals[species].url),model=prepareAnimalModel(gltf.scene,species),root=new Group();root.add(model);
 const data={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model),cachedSkinning:2},animal={species,status:'walking',motionPhase:0},contacts=animalFootSamples(model),duration=ANIMAL_ACTIONS.animals[species].clips.Walking.duration,rate=30,count=Math.ceil(duration*rate),last=(count-1)/rate,times=Array.from({length:count},(_,i)=>i/rate).concat(duration-Math.min(1e-7,(duration-last)/2));
 if(!contacts.length)throw Error('No contacts: '+species);
 const bank=times.map(time=>{animal.motionPhase=time;applyAnimalPose(data,animal,time);root.updateMatrixWorld(true);return contacts.map(({mesh,index})=>Float32Array.from(mesh.getVertexPosition(index,new Vector3()).applyMatrix4(mesh.matrixWorld).toArray()));});
 const prepare=t=>{const x=15+.35*Math.sin(t*.65),z=-35+.65*Math.sin(t*.4);root.position.set(x,surface(x,z),z);root.rotation.y=.7*Math.sin(t*.55);animal.motionPhase=t;applyAnimalPose(data,animal,t);root.updateMatrixWorld(true);const phase=t%duration;let lo=0;while(lo+1<times.length&&times[lo+1]<=phase)lo++;const hi=Math.min(lo+1,times.length-1),alpha=hi===lo?0:(phase-times[lo])/(times[hi]-times[lo]);return {lo,hi,alpha};};
 const original=()=>{let lift=0;model.updateWorldMatrix(true,true);for(const {mesh,index} of contacts){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);lift=Math.max(lift,.01+surface(point.x,point.z)-point.y);}return lift;};
 const baked=({lo,hi,alpha})=>{let lift=0;for(let i=0;i<contacts.length;i++){const a=bank[lo][i],b=bank[hi][i];point.set(a[0]+(b[0]-a[0])*alpha,a[1]+(b[1]-a[1])*alpha,a[2]+(b[2]-a[2])*alpha).applyMatrix4(root.matrixWorld);lift=Math.max(lift,.01+surface(point.x,point.z)-point.y);}return lift;};
 let maxLiftError=0,checksum=0;for(let i=0;i<120;i++){const args=prepare(i/60+.003);maxLiftError=Math.max(maxLiftError,Math.abs(original()-baked(args)));}
 const runs=[];for(const mode of ['original','baked','baked','original']){const fn=mode==='original'?original:baked,measurements=[];for(let i=0;i<150;i++){const args=prepare((i%120)/60+.003),start=performance.now();for(let j=0;j<20;j++)checksum+=fn(args);const elapsed=(performance.now()-start)/20;if(i>=30)measurements.push(elapsed);}runs.push({mode,msPerLift:stats(measurements),terrainQueriesPerLift:contacts.length});}
 if(!(checksum>0))throw Error('Benchmark never required a support correction: '+species);
 results.push({species,contactCount:contacts.length,bankFloatBytes:times.length*contacts.length*12,maxLiftError,checksum,runs});
 console.log(JSON.stringify({species,maxLiftError,runs}));
}
const report={scope:'Isolated Node/WASM microbenchmark, fixed synthetic root and one savanna terrain location with nominal slope 0.246, five real models. Four blocks original/baked/baked/original per species, 30 warm and 120 measured batches, 20 lift computations per batch. Each block prepares the same poses outside timing. Original includes model.updateWorldMatrix and deformed contact sampling; candidate interpolates baked local points. Both issue identical numbers of native terrain height queries. No timing of animation, baking, applying lift, GPU, simulation, rendering, resource load or gameplay; not a frame-time benchmark. Small timings and serial execution may be affected by JIT, GC and host load.',node:process.version,results};
await writeFile(process.env.OUTPUT??'docs/guardian/gpu-animation/contact-bank-node-performance.json',JSON.stringify(report,null,2)+'\n');
