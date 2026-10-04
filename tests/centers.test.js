import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {geometryOnly} from '../tools/calibrate_footsteps.mjs';
import {prepareNativeBuilding} from '../src/rendering/buildings.js';
import {CENTER_GEOMETRIES} from '../src/world/center-geometries.js';
import {centerCulture,centerFootprint,centerBoundaryPoint,centerServicePoint} from '../src/world/centers.js';
import {footprintDistance,edgeDistance} from '../src/world/footprints.js';
import {Navigation} from '../src/world/navigation.js';
import {repairRoute} from '../src/world/work-points.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {isMature} from '../src/simulation/crops.js';

function flat(){
 const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];
 nav.walkCache=new Map();nav.segmentCache=new Map();nav.failedPaths=new Set();nav.closedRegions=new Map();nav.searchedRegions=[];nav.obstacles=[];
 return nav;
}
const provenance=JSON.parse(readFileSync(new URL('../content/manifests/center-footprints.json',import.meta.url))).cultures;
const catalogue=JSON.parse(readFileSync(new URL('../public/content/destruction.json',import.meta.url))).buildings;
for(const building of catalogue)test(`${building.culture}: native GLB scale, rotated collision, service routes and paid delivery agree`,async()=>{
 const geometry=CENTER_GEOMETRIES[building.culture],bytes=readFileSync(new URL('../public'+building.url,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance[building.culture].sha256);
 const model=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
 const template=prepareNativeBuilding(model,building);
 assert.equal(template.scale,1);assert.deepEqual(template.kernel.hull,geometry.hull);assert.deepEqual(template.kernel.bounds,geometry.bounds);
 template.dispose();
 const nav=flat(),state=Game.newGame({culture:building.culture,seed:712});Game.resume(state,'intro');
 Game.placeStructure(state,'center',{x:30,z:0,yaw:.73},nav);const center=state.structures[0],shape=centerFootprint(center,state);
 assert.equal(center.culture,building.culture);assert.equal(state.ledger.balance.n,'700');
 assert.equal(nav.walkable(center.x,center.z,.28,null,true),false);
 assert.throws(()=>Game.plant(state,'inside','mijo',center.x,center.z,nav));assert.equal(state.ledger.balance.n,'700');
 for(let i=0;i<32;i++){
  const point=centerBoundaryPoint(center,i*Math.PI/16,0,state);
  assert.ok(Math.min(...shape.footprint.map((p,j)=>edgeDistance(p,shape.footprint[(j+1)%shape.footprint.length],point.x,point.z)))<1e-8);
 }
 for(const clearance of [.6,.8]){
  const point=centerServicePoint(center,state,clearance);
  assert.ok(footprintDistance(shape.footprint,point.x,point.z)>=clearance-1e-8);
  assert.ok(nav.walkable(point.x,point.z,.28,null,true));
  const path=nav.path({x:0,z:0},point,.28,null,true);assert.ok(path);
  let previous={x:0,z:0};for(const next of path){assert.ok(nav.segmentClear(previous,next,.28,null,true));previous=next;}
 }
 const repair=repairRoute({x:0,z:0},center,nav);assert.ok(repair);assert.ok(footprintDistance(shape.footprint,repair.destination.x,repair.destination.z)>=.28);
 const site=centerServicePoint(center,state,5);Game.plant(state,'seed','mijo',site.x,site.z,nav);
 const before=serialize(state);assert.throws(()=>Game.placeStructure(state,'over-crop',{x:site.x,z:site.z},nav),/cultivo/);assert.equal(serialize(state),before);
 const face=centerServicePoint(center,state,0);const wallBefore=serialize(state);assert.throws(()=>Game.placeStructure(state,'over-center',{kind:'wall',material:'empalizada',x:face.x+.8*Math.cos(center.yaw),z:face.z-.8*Math.sin(center.yaw),yaw:center.yaw},nav));assert.equal(serialize(state),wallBefore);
 Game.openInitialHiring(state);Game.hire(state,'hire',{olderMale:1});
 for(let i=0;i<5800&&!state.crates.some(c=>c.delivered);i++){
  if(isMature(state.plants[0])&&!state.plants[0].harvestRequested)Game.harvest(state,'harvest',state.plants[0].id);
  Game.tick(state,.05,nav);
 }
 assert.equal(state.crates.filter(c=>c.delivered).length,1);assert.equal(state.ledger.balance.n,'606');
 const loaded=deserialize(serialize(state));assert.equal(centerCulture(loaded.structures[0],loaded),building.culture);
 loaded.villages[0].culture=building.culture==='suajili'?'mapungubwe':'suajili';
 assert.equal(centerCulture(loaded.structures[0],loaded),building.culture,'Logistical reassignment cannot replace the physical model');
 delete loaded.structures[0].culture;assert.equal(centerCulture(loaded.structures[0],loaded),loaded.villages[0].culture,'Legacy centers resolve their existing village culture');
});
