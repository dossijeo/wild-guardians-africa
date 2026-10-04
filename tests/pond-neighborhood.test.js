import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';

function referenceNeighborhood(x,z){
  if(this.wetland||!this.pondsActive)return [];
  const tx=Math.round(x/this.featureCell),tz=Math.round(z/this.featureCell),ponds=[];
  for(let zc=tz-1;zc<=tz+1;zc++)for(let xc=tx-1;xc<=tx+1;xc++)ponds.push(this.pond(xc,zc));
  return ponds;
}

test('pond reuse preserves terrain and water probes across all biomes and cell boundaries',()=>{
  for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])for(const seed of ['712','-31','epic']){
    const config={seed,biome,relief:1,river:true},field=new TerrainField(config),reference=new TerrainField(config);
    reference.nearbyPonds=referenceNeighborhood;
    for(const x of [-216.01,-216,-215.99,-72.01,-72,-71.99,0,71.99,72,72.01,216])for(const z of [-145,-.28,0,.28,145]){
      assert.deepEqual(field.nearbyPonds(x,z),reference.nearbyPonds(x,z));
      assert.equal(field.surface(x,z),reference.surface(x,z));
      assert.equal(field.slope(x,z),reference.slope(x,z));
      assert.equal(field.blocked(x,z,.15),reference.blocked(x,z,.15));
      assert.deepEqual(field.waterInfo(x,z),reference.waterInfo(x,z));
    }
  }
});

test('same-cell probes avoid pond lookups; travel and pond-cache eviction retain deterministic results',()=>{
  const field=new TerrainField({seed:'712',biome:'savanna',river:true});
  let calls=0;const pond=field.pond.bind(field);field.pond=(...args)=>{calls++;return pond(...args);};
  const original=field.nearbyPonds(0,0);assert.equal(calls,9);
  assert.deepEqual(field.nearbyPonds(1,-1),original);assert.equal(calls,9);
  assert.throws(()=>original.push(null),TypeError);
  for(let i=1;i<=300;i++)field.nearbyPonds(i*144,i*144);
  assert.ok(field.pondCache.size<=256);assert.equal(field.pondNeighborhood.ponds.length,9);
  assert.deepEqual(field.nearbyPonds(0,0),original);
});
