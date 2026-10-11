import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {installTerrainValidityMemo} from '../tools/terrain-validity-memo-candidate.mjs';
function fixture(biome='sabana'){
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[biome]+'.json',import.meta.url))).profile;
 return new Navigation(712,biome,profile);
}
for(const biome of Object.keys(BIOME_IDS))test('exact terrain result and slope sweep with memo: '+biome,()=>{
 const nav=fixture(biome),queries=[];
 for(let x=-15;x<=15;x+=6.7)for(let z=-15;z<=15;z+=7.3)for(const worker of [false,true])for(const fluid of [false,true])queries.push([x,z,.6,worker,fluid]);
 const read=()=>queries.map(args=>{nav.workerSweep={peak:0};const valid=nav.terrainValid(...args),peak=nav.workerSweep.peak;delete nav.workerSweep;return {valid,peak};});
 const baseline=read(),memo=installTerrainValidityMemo(nav);
 assert.deepEqual(read(),baseline);assert.deepEqual(read(),baseline);assert.equal(memo.stats().hits,queries.length);
 memo.restore();assert.equal(Object.hasOwn(nav,'terrainValid'),false);
});
test('capacity eviction, query defaults, and configuration changes between installations',()=>{
 const nav=fixture(),memo=installTerrainValidityMemo(nav,{capacity:1});
 const first=nav.terrainValid(0,0);assert.equal(nav.terrainValid(0,0),first);
 nav.terrainValid(1,1);assert.equal(memo.stats().maxEntries,1);assert.equal(memo.stats().evictions,1);memo.restore();
 nav.field.c.relief=2;const fresh=installTerrainValidityMemo(nav,{capacity:1});nav.terrainValid(1,1);assert.equal(fresh.stats().hits,0);fresh.restore();
 assert.throws(()=>installTerrainValidityMemo(nav,{capacity:0}));
});
test('method replacement invalidates values and thrown queries restore slope sweep',()=>{
 const nav=fixture(),memo=installTerrainValidityMemo(nav),prior={peak:.1};
 nav.terrainValid(0,0,.3,false,true);nav.field.slope=()=>1;
 assert.equal(nav.terrainValid(0,0,.3,false,true),false);
 nav.workerSweep=prior;nav.field.slope=()=>{throw Error('probe');};
 assert.throws(()=>nav.terrainValid(0,0,.3,false,true),/probe/);assert.equal(nav.workerSweep,prior);
 memo.restore();assert.equal(Object.hasOwn(nav,'terrainValid'),false);
});
test('nested and custom adapters are rejected, leaving ownership intact',()=>{
 const nav=fixture(),memo=installTerrainValidityMemo(nav);
 assert.throws(()=>installTerrainValidityMemo(nav),/Custom/);memo.restore();
 nav.terrainValid=()=>true;assert.throws(()=>installTerrainValidityMemo(nav),/Custom/);
});
test('terrain values are shared by geometric views but obstacle checks are not cached',()=>{
 const nav=fixture(),memo=installTerrainValidityMemo(nav);
 const a=nav.forBuildingPlacement({id:'one',x:0,z:0,radius:2,kind:'house'}),b=nav.forBuildingPlacement({id:'two',x:100,z:100,radius:2,kind:'house'});
 assert.equal(a.terrainValid(0,0,.3,false,true),b.terrainValid(0,0,.3,false,true));
 assert.equal(memo.stats().misses,1);assert.equal(memo.stats().hits,1);
 // Explicitly test native obstacle rejection after a cached terrain query.
 a.propsAt=b.propsAt=()=>[];a.field.slope=()=>0;a.field.waterInfo=()=>({inside:false});a.field.fluidInside=()=>false;
 assert.equal(a.testWalkable(0,0,.3,null,false),false);assert.equal(b.testWalkable(0,0,.3,null,false),true);
 memo.restore();
});
