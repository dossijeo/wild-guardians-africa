import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';
import {installTerrainLatticeTiles} from '../tools/terrain-lattice-tile-candidate.mjs';
for(const seed of [1,712,2026])for(const biome of Object.keys(BIOME_IDS))test('exact native surface, slope and fluids with lattice tiles: '+biome+' / '+seed,()=>{
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[biome]+'.json',import.meta.url))).profile;
 const field=new Navigation(seed,biome,profile).field,points=[];
 for(let z=-35;z<=35;z+=7.3)for(let x=-35;x<=35;x+=6.7)points.push([x,z]);
 points.push([-32,32],[31.999,32.001],[-.001,-.999],[1000000.125,-1000000.75]);
 const baseline=points.map(([x,z])=>({surface:field.surface(x,z),slope:field.slope(x,z),water:field.waterInfo(x,z)}));
 const adapter=installTerrainLatticeTiles(field,{capacity:2});
 const actual=points.map(([x,z])=>({surface:field.surface(x,z),slope:field.slope(x,z),water:field.waterInfo(x,z)}));
 assert.deepEqual(actual,baseline);assert(adapter.stats().evictions>0);assert(adapter.stats().tiles<=2);
 adapter.restore();assert.equal(Object.hasOwn(field,'lattice'),false);
 assert.deepEqual(points.map(([x,z])=>field.surface(x,z)),baseline.map(p=>p.surface));
});
test('bounded tiles preserve negative boundaries, custom undefined values and explicit invalidation',()=>{
 let bias=0,calls=0;const field=Object.assign(Object.create(TerrainField.prototype),{heightCache:new Map(),height(x,z){calls++;return x+z+bias;}});
 const original=field.lattice,adapter=installTerrainLatticeTiles(field,{side:4,capacity:1});
 assert.equal(field.lattice(-1,-1),-2);assert.equal(field.lattice(-1,-1),-2);assert.equal(calls,1);
 field.lattice(8,8);assert.equal(adapter.stats().tiles,1);assert.equal(adapter.stats().evictions,1);
 bias=10;adapter.invalidate();assert.equal(field.lattice(-1,-1),8);
 field.height=()=>undefined;assert.equal(field.lattice(0,0),undefined);assert.equal(field.lattice(0,0),undefined);
 adapter.restore();assert.equal(field.lattice,original);
});
test('non-lattice inputs use the original method and configuration is bounded',()=>{
 const field=Object.assign(Object.create(TerrainField.prototype),{heightCache:new Map(),height:(x,z)=>x+z});const adapter=installTerrainLatticeTiles(field);
 assert.equal(field.lattice(.25,.5),.75);assert(Number.isNaN(field.lattice(NaN,0)));assert.equal(adapter.stats().fallbacks,2);
 adapter.restore();assert.throws(()=>installTerrainLatticeTiles(field,{capacity:0}));assert.throws(()=>installTerrainLatticeTiles(field,{side:128}));
 assert.throws(()=>installTerrainLatticeTiles({height:()=>0,lattice:()=>1}),/Custom lattice/);
});
