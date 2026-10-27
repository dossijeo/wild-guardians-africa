import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/wild-engine/spatial-movement-profiles.js';

const [baselinePath,candidatePath]=process.argv.slice(2);
if(!baselinePath||!candidatePath)
  throw Error('Usage: compare-spatial-surface-sample.mjs baseline.wasm candidate.wasm');
const bytes=[baselinePath,candidatePath].map(path=>readFileSync(path));
const modules=bytes.map(data=>new WebAssembly.Module(data));
const hash=data=>createHash('sha256').update(data).digest('hex');
const biomes=['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'];
const profiles=[WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES.hyena,
  ANIMAL_SPATIAL_PROFILES.rhino];
const chunks=[];
for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)chunks.push([x,z]);
let surfaces=0,walkability=0,routes=0;
for(const biome of biomes){
  const worlds=modules.map(module=>createSpatialWorld(module));
  for(const world of worlds){
    world.generate(712,0,0,biome);
    for(const [cx,cz] of chunks)if(cx||cz)world.addChunk(cx,cz);
    for(const profile of profiles)
      assert(world.buildNavigationProfile(profile.index,profile.radius,profile.worker)>0);
  }
  let seed=712;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/2**32;
  const positions=[];
  for(let i=0;i<2500;i++)positions.push({x:random()*200-100,z:random()*200-100});
  for(const x of [-100,-72,-29,-28,-27,-24,24,27,28,29,72,100])
    for(const z of [-100,-72,-29,-28,-27,-24,24,27,28,29,72,100])
    for(const dx of [-.001,0,.001])for(const dz of [-.001,0,.001])
      positions.push({x:x+dx,z:z+dz});
  const compareSurfaces=label=>{
    for(const selected of [[0,0],[1,1],[-1,-1]]){
      for(const world of worlds)world.selectChunk(...selected);
      for(const point of positions){
        const values=worlds.map(world=>[world.surface(point.x,point.z),
          world.surfaceAnywhere(point.x,point.z),world.slope(point.x,point.z),
          world.fluidLevel(point.x,point.z)]);
        assert(values[0].every((value,index)=>Object.is(value,values[1][index])),
          `${biome} ${label} selected ${selected} at ${point.x},${point.z}: ${values}`);
        surfaces++;
      }
    }
  };
  compareSurfaces('initial');
  for(const world of worlds)world.setSettlement(5,7,3,2);
  compareSurfaces('settlement');
  for(const world of worlds){
    world.removeChunk(1,-1);
    world.addChunk(1,-1);
  }
  compareSurfaces('reloaded');
  for(const profile of profiles){
    for(const world of worlds)world.selectNavigationProfile(profile.index);
    for(let i=0;i<350;i++){
      const x=Math.floor(random()*142-71),z=Math.floor(random()*142-71);
      const values=worlds.map(world=>[world.walkable(x,z),
        world.edge(x,z,x+1,z)]);
      assert.deepEqual(values[1],values[0],`${biome} profile ${profile.index} at ${x},${z}`);
      walkability++;
    }
    for(let i=0;i<16;i++){
      const a={x:random()*100-50,z:random()*100-50};
      const b={x:random()*100-50,z:random()*100-50};
      const values=worlds.map(world=>world.routeWorldNative(a,b));
      assert.deepEqual(values[1],values[0],`${biome} profile ${profile.index} route ${i}`);
      routes++;
    }
  }
}
console.log(JSON.stringify({status:'exact-match',biomes,surfaces,walkability,routes,
  baselineSha256:hash(bytes[0]),candidateSha256:hash(bytes[1])}));
