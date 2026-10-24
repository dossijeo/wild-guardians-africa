import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialChunkStream} from '../../src/world/wild-engine/spatial-chunk-stream.js';
import {WorldScene} from '../../src/rendering/scene.js';
import {raidEntryChunks} from '../../src/world/raid-entry-residency.js';
const rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const handle=await createThreadedSpatialWorld(factory),core=handle.core,chunks=new Map();let publications=0;
 core.generate(712,0,0,biome);core.buildNavigationProfile(1,.28,true);
 core.addChunk=()=>{throw Error('Unexpected synchronous generation');};
 const publish=core.preparation.publish;core.preparation.publish=function(...args){const result=publish.apply(this,args);if(result>0){assert.equal(core.preparation.metric(0),1);publications++;}return result;};
 const entry={entries:[{x:0,z:320}],exits:[{x:0,z:323}]},pins=raidEntryChunks(entry,[1.1]);
 const nav={config:{biome,layers:[]},suppressed:new Set(),raidEntryDemand:{entry,radii:[1.1]},setActiveBounds(bounds){this.activeBounds=bounds;}};
 const w={nav,state:{raid:null},prototypes:[],camera:{position:{x:0,y:10,z:0}},quality:'media',pack:{profile:{}},horizon:{update(){}},chunks,terrainMeshes:[],scene:{remove(){}},controls:{target:{x:0,y:0,z:0}},syncResidentProps(){},contacts:{update(){}},removeInstalledChunk(key){chunks.delete(key);const [cx,cz]=key.split(',').map(Number);core.removeChunk(cx,cz);}};
 const stream=w.chunkStream=createSpatialChunkStream(core,{loaded:()=>chunks,onData:data=>chunks.set(`${data.cx},${data.cz}`,{userData:{},data}),onError:error=>{throw error;}});
 try{
  WorldScene.prototype.syncChunks.call(w);assert.equal(stream.desired.size,25+pins.size);assert(!stream.desired.has('0,4'));
  await stream.whenIdle();for(const key of pins)assert(chunks.has(key));assert.equal(core.metrics().loadedChunks,25+pins.size);
  const loaded=chunks.size;delete nav.raidEntryDemand;WorldScene.prototype.syncChunks.call(w);await stream.whenIdle();
  for(const key of pins)assert(!chunks.has(key));assert.equal(chunks.size,25);assert.equal(core.metrics().loadedChunks,25);
  rows.push({biome,pins:[...pins],loadedWithDemand:loaded,remaining:chunks.size,workerPublications:publications,stream:stream.summary(),synchronousAddChunkCalls:0});
 }finally{stream.dispose();await handle.dispose();}
}
await writeFile('docs/qa/wild-engine-pthreads/thread-raid-residency.json',JSON.stringify({scope:'Production WorldScene.syncChunks with real pthread stream; stub mesh installation, no active raid AI or GPU',rows},null,2)+'\n');console.log(JSON.stringify(rows));
