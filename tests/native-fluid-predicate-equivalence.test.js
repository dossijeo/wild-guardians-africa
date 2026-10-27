import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialTerrainView} from '../src/world/wild-engine/spatial-terrain-view.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons'])test(`${biome}: native occupancy agrees at resident/remote points before and after settlement changes`,()=>{
 const core=createSpatialWorld(module);core.generate(712,0,0,biome);const field=createSpatialTerrainView(core);
 const check=()=>{for(const offset of [0,384])for(let z=-72;z<=72;z+=12)for(let x=-72;x<=72;x+=12){const px=x+offset+.03125,pz=z-.0625;assert.equal(field.fluidInside(px,pz),field.waterInfo(px,pz).inside,`${px},${pz}`);}};
 check();core.setSettlement(10,8,7,6);check();
});
test('native predicate does not request shore or mask, and uses identical level semantics',()=>{
 let calls=[];let level=3.34;
 const core={terrainState:()=>({seed:712,biome:'mangrove'}),fluidSurfaceLevel:()=>3.34,fluidLevelAnywhere:()=>{calls.push('level');return level;},waterShoreAnywhere:()=>{calls.push('shore');return 2;},wetlandMaskAnywhere:()=>{calls.push('mask');return .8;}};
 const field=createSpatialTerrainView(core);
 for(level of [3.34,0,-1,NaN]){calls=[];const expected=field.waterInfo(0,0).inside;assert.deepEqual(calls,['level','shore','mask']);calls=[];assert.equal(field.fluidInside(0,0),expected);assert.deepEqual(calls,['level']);}
});
