import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';
import {fluidAt} from '../src/world/fluid-placement.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {BIOME_IDS} from '../src/world/navigation.js';

for(const [biome,id] of Object.entries(BIOME_IDS))test(`${biome}: boolean fluid occupancy matches the complete query on native terrain and the settlement`,()=>{
 for(const seed of [712,319]){
  const field=new TerrainField({seed:String(seed),biome:id,relief:1,river:true});
  let wet=0,dry=0;
  const same=(x,z)=>{const expected=field.waterInfo(x,z).inside;assert.equal(field.fluidInside(x,z),expected,`${biome} ${seed} ${x},${z}`);if(expected)wet++;else dry++;};
  for(let z=-120;z<=120;z+=3)for(let x=-180;x<=180;x+=3)same(x+.03125,z-.0625);
  if(!field.desert&&!field.wetland&&!field.canyon){
   const pond=field.pond(0,0);for(const delta of [-1e-10,0,1e-10])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI])same(pond.x+Math.cos(angle)*pond.radius*(1+delta),pond.z+Math.sin(angle)*pond.radius*(1+delta));
  }
  assert.ok(dry>0);if(biome!=='desierto')assert.ok(wet>0,`${biome} must include real fluid probes`);
 }
 const {nav,s}=createOpeningWorld({biome}),c=s.structures[0];
 for(let z=-12;z<=12;z+=1.5)for(let x=-12;x<=12;x+=1.5)assert.equal(fluidAt(nav.field,c.x+x,c.z+z),nav.field.waterInfo(c.x+x,c.z+z).inside);
});

test('adapters replacing waterInfo or pondMetric retain the complete query semantics',()=>{
 const field=new TerrainField({seed:'712',biome:'savanna',relief:1,river:true});
 field.waterInfo=()=>({inside:true});assert.equal(fluidAt(field,500,500),true);
 delete field.waterInfo;field.pondMetric=()=>0;assert.equal(field.fluidInside(0,0),field.waterInfo(0,0).inside);
 assert.equal(fluidAt({waterInfo:()=>({inside:true})},0,0),true);
 assert.equal(fluidAt({blocked:()=>true},0,0),true);assert.equal(fluidAt(null,0,0),false);
});

test('mangrove gameplay retains the complete occupancy query without calling the unhelpful fast variant',()=>{
 const field=new TerrainField({seed:'712',biome:'mangrove',relief:1,river:true});
 field.fluidInside=()=>{throw Error('Mangrove fast variant must stay disabled');};
 for(let x=-20;x<=20;x+=2)assert.equal(fluidAt(field,x,12),field.waterInfo(x,12).inside);
});
