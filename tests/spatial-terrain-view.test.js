import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/hierarchical-wasm/spatial-world.js';
import {createSpatialTerrainView} from '../src/world/hierarchical-wasm/spatial-terrain-view.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons'])
  test(`${biome} terrain queries share the native chunk and navigation world`,()=>{
    const core=createSpatialWorld(module);core.generate(712,0,0,biome);
    const field=createSpatialTerrainView(core);
    assert.equal(field.c.biome,biome);
    assert.equal(field.seed,core.terrainState().seed);
    assert.equal(field.riverLevel,core.fluidSurfaceLevel());
    for(const [x,z] of [[0,0],[18.25,-7.5],[-20,11],[75.25,60.5]]){
      assert.equal(field.surface(x,z),core.surfaceAnywhere(x,z));
      const info=field.waterInfo(x,z),level=core.fluidLevelAnywhere(x,z);
      assert.equal(info.inside,level>0);
      assert.equal(info.level,level>0?level:null);
      assert.equal(info.shore,core.waterShoreAnywhere(x,z));
      assert.equal(field.fluidInside(x,z),info.inside);
      assert(Number.isFinite(field.slope(x,z)));
      if(biome==='mangrove')assert.equal(info.mask,core.wetlandMaskAnywhere(x,z));
      else assert.equal(Object.hasOwn(info,'mask'),false);
    }
    assert.equal(field.canyon,biome==='canyons');
    assert.equal(field.wetland,biome==='mangrove');
    assert.equal(field.desert,biome==='desert');
    if(biome==='desert')assert.equal(field.waterInfo(0,0).shore,Infinity);
    const nearby=[];
    for(let z=0;z<=16;z+=2)for(let x=2;x<=18;x+=2)
      nearby.push({x,z,before:field.surface(x,z)});
    core.setSettlement(10,8,7,6);
    for(const point of nearby)
      assert.equal(field.surface(point.x,point.z),core.surfaceAnywhere(point.x,point.z));
    if(biome!=='mangrove')assert(nearby.some(point=>field.surface(point.x,point.z)!==point.before),
      'the view must observe a native terrain edit');
  });
