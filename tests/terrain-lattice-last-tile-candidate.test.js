import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';
import {installTerrainLatticeTiles as baseline} from '../tools/terrain-lattice-tile-candidate.mjs';
import {installTerrainLatticeTiles as candidate} from '../tools/terrain-lattice-last-tile-candidate.mjs';

for(const biome of Object.keys(BIOME_IDS))test('last-tile shortcut preserves native surfaces, slopes and water: '+biome,()=>{
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[biome]+'.json',import.meta.url))).profile;
 const field=new Navigation(712,biome,profile).field;
 const points=[];
 for(let z=-40;z<=40;z+=5.7)for(let x=-40;x<=40;x+=6.3)points.push([x,z]);
 points.push([-32,32],[31.999,32.001],[-.001,-.999]);
 const sample=()=>points.map(([x,z])=>({surface:field.surface(x,z),slope:field.slope(x,z),water:field.waterInfo(x,z)}));
 const expected=sample(),adapter=candidate(field,{capacity:1});
 try{assert.deepEqual(sample(),expected);assert(adapter.stats().lastTileHits>0);assert(adapter.stats().evictions>0);assert.equal(adapter.stats().tiles,1);}finally{adapter.restore();}
 assert.equal(Object.hasOwn(field,'lattice'),false);assert.deepEqual(sample(),expected);
});

for(const side of [4,7,32,63,64])test('exact original adapter arithmetic at boundaries and safe-integer limits: '+side,()=>{
 const create=()=>Object.assign(Object.create(TerrainField.prototype),{heightCache:new Map(),height:(x,z)=>x*.125+z*.25});
 const a=create(),b=create(),old=baseline(a,{side,capacity:2}),next=candidate(b,{side,capacity:2});
 try{
  const coordinates=[-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,-1000000000,-side*2,-side,-side+1,-1,0,1,side-1,side,side+1,side*2];
  for(let iteration=0;iteration<3;iteration++)for(const x of coordinates)for(const z of coordinates)assert.equal(b.lattice(x,z),a.lattice(x,z));
  for(const [x,z] of [[.25,.5],[NaN,0],[Infinity,0]])assert.equal(b.lattice(x,z),a.lattice(x,z));
  assert(next.stats().tiles<=2);assert.equal(next.stats().maximumTypedArrayBytes,old.stats().maximumTypedArrayBytes);
 }finally{next.restore();old.restore();}
});

test('provider replacement, explicit invalidation and non-numeric values remain native',()=>{
 let bias=0,calls=0;const field=Object.assign(Object.create(TerrainField.prototype),{heightCache:new Map(),height:(x,z)=>{calls++;return x+z+bias;}});
 const original=field.lattice,adapter=candidate(field,{side:4});
 try{
  assert.equal(field.lattice(-1,-1),-2);assert.equal(field.lattice(-1,-1),-2);assert.equal(calls,1);
  bias=10;adapter.invalidate();assert.equal(field.lattice(-1,-1),8);
  field.height=()=>undefined;assert.equal(field.lattice(0,0),undefined);assert.equal(field.lattice(0,0),undefined);
  field.height=()=>NaN;assert(Number.isNaN(field.lattice(0,0)));assert(Number.isNaN(field.lattice(0,0)));
  field.height=()=>3;assert.equal(field.lattice(0,0),3);
  field.heightCache=new Map();assert.equal(field.lattice(0,0),3);assert(adapter.stats().invalidations>=4);
 }finally{adapter.restore();}
 assert.equal(field.lattice,original);
});
