import test from 'node:test';
import {readFileSync} from 'node:fs';
import {villageLayout} from '../src/world/villages.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';
import {CENTER_GEOMETRIES} from '../src/world/center-geometries.js';
import {centerFootprint,centerServicePoint} from '../src/world/centers.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {resolveFluidPlacement,footprintFluidSample,FLUID_PLACEMENT_REASON} from '../src/world/fluid-placement.js';

for(const biome of ['gran-rio','volcanes'])for(const culture of Object.keys(CENTER_GEOMETRIES)){
 test(`${biome}/${culture}: a native submerged center is rejected without charging or modifying the world`,()=>{
  const nav=new Navigation(712,biome,{}),x=nav.field.riverX(0),z=0;
  const site={x,z,y:2,yaw:0,hx:30,hz:30,clearRadius:40,softRadius:46,haloRadius:53};
  const s=Game.newGame({seed:712,biome,culture});
  Object.assign(s.villages[0],{x:x+20,z,entry:{x:x+20,z},buildings:[],terrainSite:site});
  nav.setState(s);nav.propsAt=()=>[];
  assert.ok(nav.field instanceof TerrainField);assert.equal(nav.field.waterInfo(x,z).inside,true);
  Game.resume(s,'intro');const saved=serialize(s);
  assert.throws(()=>Game.placeStructure(s,'fluid-center',{x,z},nav),new RegExp(FLUID_PLACEMENT_REASON));
  assert.equal(serialize(s),saved);assert.equal(s.structures.length,0);
  assert.equal(nav.terrainValid(x,z,0,true),false);assert.equal(nav.terrainValid(x,z,0,false),false);
 });
}
const flat=inside=>({surface:()=>2,slope:()=>0,blocked:()=>true,waterInfo:(x,z)=>({inside:inside(x,z),level:3})});
function cleanNav(inside){const nav=new Navigation(712,'volcanes',{});nav.propsAt=()=>[];nav.field=flat(inside);nav.path=(_a,b)=>[{x:b.x,z:b.z}];return nav;}
for(const culture of Object.keys(CENTER_GEOMETRIES))for(const yaw of [0,.67])test(`${culture}/${yaw}: slight shore overlap shifts within 20%, with identical preview, paid, saved and event positions`,()=>{
 const hull=centerFootprint({kind:'center',culture,x:0,z:0,yaw}).footprint,maxX=Math.max(...hull.map(p=>p.x));
 const nav=cleanNav(x=>x>maxX-.1),s=Game.newGame({culture,seed:712});nav.setState(s);nav.propsAt=()=>[];nav.field=flat(x=>x>maxX-.1);Game.resume(s,'intro');
 const preview=Game.previewCenter(s,{x:0,z:0,yaw},nav);assert.equal(preview.valid,true);assert.ok(preview.x<0);
 const extent=Math.max(maxX-Math.min(...hull.map(p=>p.x)),Math.max(...hull.map(p=>p.z))-Math.min(...hull.map(p=>p.z)));
 assert.ok(Math.hypot(preview.x,preview.z)<=extent*.2+1e-8);
 assert.equal(footprintFluidSample(nav.field,preview.footprint.footprint),null);
 Game.placeStructure(s,'shore-center',{x:0,z:0,yaw},nav);const center=s.structures[0];
 assert.equal(center.x,preview.x);assert.equal(center.z,preview.z);assert.equal(s.ledger.balance.n,'700');
 assert.deepEqual(deserialize(serialize(s)).structures[0],center);
 assert.deepEqual(s.events.find(e=>e.type==='PlacementCommitted').presentation,{x:center.x,z:center.z});
 const saved=serialize(s);assert.equal(Game.placeStructure(s,'shore-center',{x:0,z:0,yaw},nav),false);assert.equal(serialize(s),saved);
});
test('interior ponds, corner overlap, collisions and maximum relocation are respected',()=>{
 const polygon=[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}],shape=(x,z)=>[{x,z,radius:3,footprint:polygon.map(p=>({x:p.x+x,z:p.z+z}))}];
 assert.ok(footprintFluidSample(flat((x,z)=>Math.abs(x)<.3&&Math.abs(z)<.3),polygon),'interior pond');
 assert.ok(footprintFluidSample(flat((x,z)=>x>1.9&&z>1.9),polygon),'corner');
 const nav=cleanNav(x=>x>1);const rejected=resolveFluidPlacement(nav,shape,0,0);assert.equal(rejected.valid,false);assert.equal(rejected.shiftLimit,.8);
 nav.field=flat(x=>x>1.9);nav.obstacles=[{x:-.3,z:0,radius:4}];assert.equal(resolveFluidPlacement(nav,shape,0,0).valid,false,'shift does not bypass a solid obstacle');
});
test('dry surfaces remain buildable despite conservative scatter exclusion; slope and collisions still reject',()=>{
 const nav=cleanNav(()=>false),shape=centerFootprint({kind:'center',culture:'mapungubwe',x:0,z:0});
 assert.equal(nav.field.blocked(0,0),true);assert.equal(nav.placementFootprint(shape).valid,true);
 nav.field.surface=x=>x*.1;assert.equal(nav.placementFootprint(shape).reason,'El edificio necesita suelo nivelado en toda su base');
 nav.field.surface=()=>2;nav.obstacles=[shape];assert.equal(nav.placementFootprint(shape).reason,'La construcción solapa otro edificio');
 nav.obstacles=[];nav.field.slope=()=>.6;assert.equal(nav.placementFootprint(shape).valid,false);
});

const villages=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)));
for(const culture of Object.keys(CENTER_GEOMETRIES))test(`${culture}: village shore adjustment preserves layout, payment and save; deep water rejects`,()=>{
 const payload=villages.find(v=>v.id===(culture==='saheliana'?'saheliano':culture)),shapes=villageLayout(payload,100,100);
 const points=shapes.flatMap(s=>s.footprint),maxX=Math.max(...points.map(p=>p.x)),extent=Math.max(maxX-Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z)));
 const state=Game.newGame({culture,seed:712}),nav=cleanNav(x=>x>maxX-.1);nav.setState(state);nav.field=flat(x=>x>maxX-.1);nav.propsAt=()=>[];Game.resume(state,'intro');
 const preview=Game.previewVillage(state,culture,100,100,payload,nav);assert.equal(preview.valid,true);assert.ok(preview.x<100);assert.ok(Math.hypot(preview.x-100,preview.z-100)<=extent*.2+1e-8);
 assert.ok(preview.buildings.every(b=>!footprintFluidSample(nav.field,b.footprint)));
 Game.placeStructure(state,'base-center',{x:-30,z:0},nav);
 // Explicit starting balance isolates postgame placement from the campaign economy.
 state.day=101;state.completedNights=100;state.postgame=true;state.initialPreparation=false;state.tutorial.step='done';state.ledger.balance={n:'100000',d:'1'};Game.foundVillage(state,'shore-village',culture,100,100,payload,nav);
 const placed=state.villages.at(-1);assert.equal(placed.x,preview.x);assert.equal(placed.z,preview.z);assert.deepEqual(placed.buildings,preview.buildings);
 assert.equal(Number(state.ledger.balance.n),100000-preview.cost);assert.deepEqual(deserialize(serialize(state)).villages.at(-1),placed);
 nav.field=flat(()=>true);const saved=serialize(state);assert.throws(()=>Game.foundVillage(state,'deep-village',culture,200,200,payload,nav),new RegExp(FLUID_PLACEMENT_REASON));assert.equal(serialize(state),saved);
});
for(const culture of Object.keys(CENTER_GEOMETRIES))test(`${culture}: native volcano opening remains playable with restored fluid restrictions`,()=>{
 const {s,nav}=createOpeningWorld({biome:'volcanes',culture});assert.equal(s.structures.length,1);
 assert.equal(footprintFluidSample(nav.field,centerFootprint(s.structures[0],s).footprint),null);
 assert.ok(nav.path(s.villages[0].entry,centerServicePoint(s.structures[0],s,.8),.28,null,true));
});
