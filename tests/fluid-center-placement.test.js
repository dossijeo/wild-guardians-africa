import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';
import {CENTER_GEOMETRIES} from '../src/world/center-geometries.js';
import {centerFootprint,centerServicePoint} from '../src/world/centers.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

for(const biome of ['gran-rio','volcanes'])for(const culture of Object.keys(CENTER_GEOMETRIES)){
 test(`${biome}/${culture}: center placement and crew routes allow fluid, including after reload`,()=>{
  const nav=new Navigation(712,biome,{}),x=nav.field.riverX(0),z=0;
  // Native terrain with a level submerged site: water/lava, rather than slope,
  // is the only former rejection. Keep real hulls, collision and pathfinding.
  const site={x,z,y:2,yaw:0,hx:30,hz:30,clearRadius:40,softRadius:46,haloRadius:53};
  const s=Game.newGame({seed:712,biome,culture});
  Object.assign(s.villages[0],{x:x+20,z,entry:{x:x+20,z},buildings:[],terrainSite:site});
  nav.setState(s);nav.propsAt=()=>[];
  assert.ok(nav.field instanceof TerrainField);
  assert.equal(nav.field.blocked(x,z,.15),true);
  Game.resume(s,'intro');
  Game.placeStructure(s,'fluid-center',{x,z},nav);
  assert.equal(s.structures.length,1);assert.equal(s.ledger.balance.n,'700');
  const center=s.structures[0],departure=centerServicePoint(center,s,.8);
  assert.ok(nav.path(s.villages[0].entry,departure,.28,null,true));
  assert.ok(nav.path(departure,s.villages[0].entry,.28,null,true));
  const loaded=deserialize(serialize(s)),restored=new Navigation(712,biome,{});
  restored.setState(loaded);restored.propsAt=()=>[];
  assert.ok(restored.path(loaded.villages[0].entry,departure,.28,null,true));
  assert.equal(restored.terrainValid(x,z,0,false),false,'animal/fluid collision stays independent');
 });
}

test('allowing fluid does not permit unsupported center floors or overlapping buildings',()=>{
 const nav=new Navigation(712,'volcanes',{});nav.propsAt=()=>[];
 nav.field={blocked:()=>true,slope:()=>.1,surface:(x,z)=>x*.1};
 const shape=centerFootprint({kind:'center',culture:'mapungubwe',x:0,z:0});
 assert.equal(nav.placementFootprint(shape).reason,'El edificio necesita suelo nivelado en toda su base');
 nav.field.surface=()=>2;
 assert.equal(nav.placementFootprint(shape).valid,true);
 nav.obstacles=[shape];
 assert.equal(nav.placementFootprint(shape).reason,'La construcción solapa otro edificio');
 nav.obstacles=[];nav.field.slope=()=>.6;
 assert.equal(nav.placementFootprint(shape).valid,false);
});
