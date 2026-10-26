import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {Navigation} from '../src/world/navigation.js';
import {actorFluidClear} from '../src/simulation/actor-fluid-clearance.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('Mangrove native water supports every actor radius while barriers remain solid',()=>{
 const core=createSpatialWorld(module);core.generate(37,0,0,'mangrove',{mangroveNetwork:true});
 // Keep the real procedural terrain and props. Find an unobstructed wet segment.
 for(const [radius,worker] of [[.28,true],[1.1,false],[.9,false],[.97,false],[.85,false],[1.55,false]]){
  core.buildNavigation(radius,worker);
  let crossing=null;
  for(let z=-18;z<=18&&!crossing;z+=1)for(let x=-18;x<=18;x+=1){
   const a={x:x-.5,z},b={x:x+.5,z};
   if(core.fluidLevelAnywhere(x,z)>0&&core.walkable(x,z)&&core.localClear(a,b)){crossing={a,b,x,z};break;}
  }
  assert(crossing,`No wet passage for radius ${radius}`);
  const {a,b,x,z}=crossing;
  assert.equal(core.routeWorld(a,b).status,'found');
  const id=core.addBarrier(x,z,.5,4,0);
  assert(!core.localClear(a,b),'water must not bypass a barrier');
  core.removeWall(id);assert(core.localClear(a,b),'removing barrier restores passage');
 }
});

test('Mangrove physical landing and surface permit water without making it buildable',()=>{
 const nav=new Navigation(37,'manglares',{});
 nav.field={wetland:true,canyon:false,wetlandLevel:()=>3.34,surface:()=>2.1,
  slope:()=>0,fluidInside:()=>true,waterInfo:()=>({inside:true,level:3.34})};
 assert.equal(nav.workerSurface(0,0),3.34);
 assert(Math.abs(nav.actorSurface(0,0)-3.24)<1e-12);
 for(const worker of [false,true]){
  assert(nav.terrainValid(0,0,1.55,worker));assert(actorFluidClear(nav,{x:0,z:0},1.55,worker));
 }
 assert.equal(nav.placement(0,0).valid,false);
 nav.field.wetland=false;
 assert(!actorFluidClear(nav,{x:0,z:0},.28,true),'other biomes retain water exclusion');
});
