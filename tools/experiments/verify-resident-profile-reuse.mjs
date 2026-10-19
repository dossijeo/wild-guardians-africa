// Compare two builds of the same Wild Engine source, with and without a
// profile-preparation change. Pass both WASM paths explicitly.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/wild-engine/spatial-movement-profiles.js';

const [baselinePath,candidatePath]=process.argv.slice(2);
if(!baselinePath||!candidatePath)
  throw Error('Usage: verify-resident-profile-reuse.mjs BASELINE.wasm CANDIDATE.wasm');
const baseline=new WebAssembly.Module(readFileSync(baselinePath));
const candidate=new WebAssembly.Module(readFileSync(candidatePath));
const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)];
const biomes=['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'];
for(const biome of biomes){
  const worlds=[baseline,candidate].map(module=>createSpatialWorld(module));
  const [a,b]=worlds;
  for(const world of worlds){
    world.generate(712,0,0,biome);
    world.addChunk(1,0);
    world.selectChunk(0,0);
  }
  assert.deepEqual(b.chunkPayload(),a.chunkPayload(),`${biome}: initial visual chunk`);
  for(const profile of profiles.slice(0,2)){
    assert.equal(b.buildNavigationProfile(profile.index,profile.radius,profile.worker),
      a.buildNavigationProfile(profile.index,profile.radius,profile.worker));
  }
  const removable=a.props().find(prop=>prop.group>=0&&prop.group<=5);
  if(removable)for(const world of worlds)
    assert.equal(world.removeProp(removable),1,`${biome}: prop removal`);
  for(const profile of profiles.slice(2)){
    assert.equal(b.buildNavigationProfile(profile.index,profile.radius,profile.worker),
      a.buildNavigationProfile(profile.index,profile.radius,profile.worker));
  }
  for(const profile of profiles){
    a.selectNavigationProfile(profile.index);
    b.selectNavigationProfile(profile.index);
    for(let z=-16;z<=16;z+=4)for(let x=-16;x<=56;x+=4){
      assert.equal(b.walkable(x,z),a.walkable(x,z),
        `${biome}: profile ${profile.index} at ${x},${z}`);
      if(x<=52)assert.deepEqual(b.route({x,z},{x:x+4,z}),
        a.route({x,z},{x:x+4,z}),
        `${biome}: profile ${profile.index} route ${x},${z}`);
    }
  }
  assert.equal(b.setSettlement(10,8,7,6),a.setSettlement(10,8,7,6));
  for(const cx of [0,1]){
    a.selectChunk(cx,0);b.selectChunk(cx,0);
    assert.deepEqual(b.chunkPayload(),a.chunkPayload(),
      `${biome}: visual chunk ${cx} after settlement`);
  }
  assert.deepEqual(b.snapshot(),a.snapshot(),`${biome}: saved spatial state`);
  console.log(JSON.stringify({biome,profiles:profiles.length,
    chunks:2,removedProp:Boolean(removable),equal:true}));
}
