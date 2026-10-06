import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';

for(const biome of Object.keys(BIOME_IDS))test(`exact terrain cache agrees with native fluid/slope rules in ${biome}`,()=>{
 const nav=new Navigation(712,biome,{});let valid=0,blocked=0;
 for(let i=0;i<160;i++){
  const x=(i%16-8)*2.37,z=(Math.floor(i/16)-5)*3.19;
  for(const radius of [0,.28,.9])for(const worker of [true,false])for(const allowFluid of [true,false]){
   const expected=nav.testTerrainValid(x,z,radius,worker,allowFluid);
   assert.equal(nav.terrainValid(x,z,radius,worker,allowFluid),expected);
   assert.equal(nav.terrainValid(x,z,radius,worker,allowFluid),expected);
   expected?valid++:blocked++;
  }
 }
 assert.equal(valid+blocked,1920);assert.ok(nav.terrainCache.size>0);
});

test('terrain reuse remains exact, bounded and separate from current solids',()=>{
 const nav=new Navigation(712,'desierto',{}),state={structures:[],villages:[],spells:[],suppressed:[]};nav.setState(state);nav.propsAt=()=>[];
 const point=Array.from({length:400},(_,i)=>({x:(i%20)*2+2.37,z:Math.floor(i/20)*2+4.19})).find(p=>nav.testTerrainValid(p.x,p.z,.28,true));assert.ok(point);
 let samples=0;const original=nav.testTerrainValid.bind(nav);nav.testTerrainValid=(...args)=>{samples++;return original(...args);};
 const {x,z}=point;assert.equal(nav.terrainValid(x,z,.28,true),true);nav.terrainValid(x,z,.28,true);assert.equal(samples,1);
 nav.terrainValid(x+1e-8,z,.28,true);assert.equal(samples,2,'No coordinate rounding');
 state.spells=[{id:'shield',kind:'shield',x,z,radius:2,remaining:20}];nav.setState(state);
 assert.equal(nav.walkable(x,z,.28,null,false),false);assert.equal(nav.walkable(x,z,.28,null,true),true);
 for(let i=0;i<8300;i++)nav.terrainValid(i+.11,0,0,true);assert.equal(nav.terrainCache.size,8192);
});

test('replacing terrain invalidates samples and patched or synthetic fields remain uncached',()=>{
 const nav=new Navigation(712,'sabana',{});nav.terrainValid(0,0,0,true);
 const oldField=nav.field;nav.field=new TerrainField({...nav.config,biome:'volcanoes'});
 const expected=nav.testTerrainValid(0,0,0,true);assert.equal(nav.terrainValid(0,0,0,true),expected);assert.equal(nav.terrainCache.size,1);assert.equal(nav.terrainCacheField,nav.field);
 nav.field=oldField;nav.field.slope=()=>0;nav.field.waterInfo=()=>({inside:false});assert.equal(nav.terrainValid(0,0,0,true),true);
 nav.field.slope=()=>1;assert.equal(nav.terrainValid(0,0,0,true),false);
 nav.field={canyon:false,slope:()=>0,waterInfo:()=>({inside:false})};assert.equal(nav.terrainValid(0,0,0,true),true);
 nav.field.waterInfo=()=>({inside:true});assert.equal(nav.terrainValid(0,0,0,true),false);
});
