import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from
  '../src/world/hierarchical-wasm/spatial-movement-profiles.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const chunks=[[0,0],[1,0],[0,1],[-1,0]];
const profiles=[WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES.hyena,
  ANIMAL_SPATIAL_PROFILES.rhino];
function world(biome){
  const core=createSpatialWorld(module);
  core.generate(712,0,0,biome);
  for(const [cx,cz] of chunks.slice(1))core.addChunk(cx,cz);
  for(const profile of profiles)
    assert(core.buildNavigationProfile(profile.index,profile.radius,profile.worker)>0);
  return core;
}
function visible(core){return chunks.flatMap(([cx,cz])=>{
  core.selectChunk(cx,cz);
  return core.props();
});}
const identity=prop=>({group:prop.group,gx:prop.gx,gz:prop.gz});

test('restoring suppressed props refreshes cross-chunk occupancy for every movement profile',()=>{
  for(const biome of ['manglares','gran-canon']){
    const incremental=world(biome),solids=visible(incremental).filter(prop=>
      prop.slot<=3||prop.slot>=10&&prop.slot<=12||prop.slot>=18);
    const edge=solids.find(prop=>Math.abs(prop.x-24)<13||
      Math.abs(prop.z-24)<13);
    const distant=solids.find(prop=>Math.abs(prop.x)>35||
      Math.abs(prop.z)>35);
    assert(edge&&distant,`${biome} requires two separated solid props`);
    const stages=[[identity(edge)],[identity(edge),identity(distant)],
      [identity(distant)],[],[identity(distant),identity(edge)],[]];
    for(const [stage,removed] of stages.entries()){
      incremental.restoreRemovedProps(removed);
      const rebuilt=world(biome);
      rebuilt.restoreRemovedProps(removed);
      assert.deepEqual(visible(incremental),visible(rebuilt),
        `${biome} stage ${stage}: visual props`);
      for(const profile of profiles){
        incremental.selectNavigationProfile(profile.index);
        rebuilt.selectNavigationProfile(profile.index);
        for(let z=-20;z<=60;z+=8)for(let x=-60;x<=60;x+=8){
          assert.equal(incremental.walkable(x,z),rebuilt.walkable(x,z),
            `${biome} stage ${stage} profile ${profile.index} cell ${x},${z}`);
          assert.equal(incremental.edge(x,z,x+1,z),rebuilt.edge(x,z,x+1,z),
            `${biome} stage ${stage} profile ${profile.index} edge ${x},${z}`);
        }
        for(const [start,end] of [
          [{x:-18,z:-18},{x:18,z:18}],
          [{x:20,z:8},{x:34,z:8}],
          [{x:8,z:19},{x:28,z:42}],
        ]){
          assert.deepEqual(incremental.routeWorldNative(start,end),
            rebuilt.routeWorldNative(start,end),
            `${biome} stage ${stage} profile ${profile.index} route`);
        }
      }
    }
  }
});
