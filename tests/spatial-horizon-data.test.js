import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {buildSpatialHorizonData} from '../src/rendering/spatial-horizon-data.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const profile=id=>JSON.parse(readFileSync(new URL(`../public/content/biome-${id}.json`,import.meta.url))).profile;

for(const biome of ['canyons','desert'])test(`one spatial source builds ${biome} foreground and far horizon`,()=>{
  const core=createSpatialWorld(module),seed=712,region=activeChunkRegion({x:0,z:0},'media');
  core.generate(seed,0,0,biome);
  core.buildNavigation(.28,true);
  const before=core.metrics(),selected=core.currentChunk();
  const start=performance.now();
  const result=buildSpatialHorizonData(core,{config:{biome,river:true},profile:profile(biome),region});
  const elapsed=performance.now()-start;
  assert.ok(result.terrain.length>0&&result.terrain.length%27===0);
  assert.equal(result.water.length>0,biome==='canyons');
  assert.ok(result.terrain.every(Number.isFinite));
  assert.ok(result.water.every(Number.isFinite));
  assert.deepEqual(core.currentChunk(),selected);
  assert.deepEqual(core.metrics(),before,'far horizon must not make chunks or navigation sectors resident');
  const edge=new Map();
  for(let i=0;i<result.terrain.length;i+=9){
    const x=result.terrain[i],z=result.terrain[i+2];
    if(Number.isInteger(x)&&Number.isInteger(z))edge.set(`${x},${z}`,result.terrain[i+1]);
  }
  const [x0,z0,x1,z1]=region.bounds;
  for(let x=x0;x<=x1;x++)for(const z of [z0,z1])
    assert.equal(edge.get(`${x},${z}`),Math.fround(core.surfaceAnywhere(x,z)),`${x},${z} seam`);
  for(let z=z0;z<=z1;z++)for(const x of [x0,x1])
    assert.equal(edge.get(`${x},${z}`),Math.fround(core.surfaceAnywhere(x,z)),`${x},${z} seam`);
  const again=buildSpatialHorizonData(core,{config:{biome,river:true},profile:profile(biome),region});
  assert.deepEqual(result,again,'same native world and region must generate the same buffers');
  console.log(`${biome} native horizon: ${elapsed.toFixed(1)} ms, ${result.terrain.length/9} ground vertices`);
});

test('C++ canyon horizon preserves the QA mesh and selected navigation context',()=>{
  const core=createSpatialWorld(module),biome='canyons',seed=712;
  core.generate(seed,0,0,biome);core.buildNavigation(.28,true);
  const selected=core.currentChunk();
  const waterColor=[58/255,173/255,182/255];
  for(const eye of [{x:0,z:0},{x:-48,z:48}]){
    const region=activeChunkRegion(eye,'media'),before=core.metrics();
    const expected=buildSpatialHorizonData(core,{config:{biome,river:true},profile:profile(biome),region});
    const actual=core.canyonHorizon(region,waterColor);
    assert.equal(actual.terrain.length,expected.terrain.length);
    assert.equal(actual.water.length,expected.water.length);
    let largestHeightDelta=0,largestColorDelta=0,largestNormalDelta=0,largestWaterDelta=0;
    for(let i=0;i<actual.terrain.length;i+=9){
      assert.equal(actual.terrain[i],expected.terrain[i]);
      assert.equal(actual.terrain[i+2],expected.terrain[i+2]);
      largestHeightDelta=Math.max(largestHeightDelta,Math.abs(actual.terrain[i+1]-expected.terrain[i+1]));
      for(let k=3;k<6;k++)largestNormalDelta=Math.max(largestNormalDelta,Math.abs(actual.terrain[i+k]-expected.terrain[i+k]));
      for(let k=6;k<9;k++)largestColorDelta=Math.max(largestColorDelta,Math.abs(actual.terrain[i+k]-expected.terrain[i+k]));
    }
    for(let i=0;i<actual.water.length;i++)largestWaterDelta=Math.max(largestWaterDelta,Math.abs(actual.water[i]-expected.water[i]));
    assert.ok(largestHeightDelta<.001,`height drift ${largestHeightDelta}`);
    assert.ok(largestColorDelta<.001,`color drift ${largestColorDelta}`);
    assert.ok(largestNormalDelta<.001,`normal drift ${largestNormalDelta}`);
    assert.ok(largestWaterDelta<.01,`water drift ${largestWaterDelta}`);
    assert.deepEqual(core.currentChunk(),selected);
    const after=core.metrics();
    assert.ok(after.memoryBytes>=before.memoryBytes);
    delete after.memoryBytes;delete before.memoryBytes;
    assert.deepEqual(after,before);
  }
  const dry=core.canyonHorizon(activeChunkRegion({x:0,z:0},'media'),waterColor,false);
  assert.equal(dry.water.length,0);
});
