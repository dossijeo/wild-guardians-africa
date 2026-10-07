import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCrops,cropBecameInactive,invalidateActiveCrops} from '../src/simulation/active-crops.js';
import * as Game from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';

test('active crop history scans once, appends in FIFO order and never removes saved records',()=>{
  let reads=0;
  const dead=Array.from({length:20000},(_,i)=>({id:'old-'+i,get alive(){reads++;return false;}}));
  const a={id:'a',alive:true},b={id:'b',alive:true},plants=[...dead,a];
  assert.deepEqual(activeCrops(plants),[a]);assert.equal(reads,20000);
  for(let i=0;i<20;i++)assert.deepEqual(activeCrops(plants),[a]);
  plants.push(b);assert.deepEqual(activeCrops(plants),[a,b]);assert.equal(reads,20000);
  a.alive=false;cropBecameInactive(plants);assert.deepEqual(activeCrops(plants),[b]);assert.equal(reads,20000);
  assert.equal(plants.length,20002);assert.equal(plants[20000],a);
});

test('retirement before initialization, simultaneous deaths and restored arrays preserve live references',()=>{
  const a={alive:true},b={alive:true},plants=[a,b];
  a.alive=false;cropBecameInactive(plants);assert.deepEqual(activeCrops(plants),[b]);
  b.alive=false;cropBecameInactive(plants);assert.deepEqual(activeCrops(plants),[]);
  const restored=JSON.parse(JSON.stringify(plants));restored[0].alive=true;
  assert.deepEqual(activeCrops(restored),[restored[0]]);assert.deepEqual(activeCrops(plants),[]);
});

test('truncation resets membership; explicit editor invalidation handles same-length edits and revival',()=>{
  const a={alive:true},b={alive:true},plants=[a,b];activeCrops(plants);
  plants.pop();assert.deepEqual(activeCrops(plants),[a]);
  const c={alive:true};plants[0]=c;invalidateActiveCrops(plants);assert.deepEqual(activeCrops(plants),[c]);
  c.alive=false;cropBecameInactive(plants);assert.deepEqual(activeCrops(plants),[]);
  c.alive=true;invalidateActiveCrops(plants);assert.deepEqual(activeCrops(plants),[c]);
});

test('physical harvest retires an indexed crop while its crate is still carried and later delivered',()=>{
  const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(a,b)=>[{x:b.x,z:b.z}]};
  const s=Game.newGame({seed:712,slotId:'active-pickup'});Game.placeStructure(s,'center',{x:4,z:0},nav);
  const p=createPlant('ripe','mijo',8,0,s.structures[0].id);p.water.forEach(w=>w.status='manual');p.growth=cropSpec('mijo').growth_seconds;s.plants.push(p);
  assert.deepEqual(activeCrops(s.plants),[p]);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  const w=s.workers[0];w.status='idle';w.x=7.4;w.z=0;
  for(let i=0;i<400&&p.alive;i++)Game.tick(s,.1,nav);
  assert.equal(p.alive,false);assert.deepEqual(activeCrops(s.plants),[]);assert.equal(s.plants[0],p);
  assert.equal(s.crates.length,1);assert.equal(s.crates[0].delivered,false);
  for(let i=0;i<400&&!s.crates[0].delivered;i++)Game.tick(s,.1,nav);
  assert.equal(s.crates[0].delivered,true);assert.equal(s.plants.length,1);
});

test('a real second animal strike retires the cached crop without removing its damage history',()=>{
  const s=Game.newGame({seed:712,slotId:'active-destruction'}),nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.activeBounds=[-48,-48,48,48];nav.setState(s);
  Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
  const p=s.plants[0];assert.deepEqual(activeCrops(s.plants),[p]);
  s.day=6;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};s.nightPlan={done:true};spawnRaid(s,{group:['warthog']},nav);
  for(let i=0;i<6000&&p.alive;i++)Game.tick(s,.05,nav);
  assert.equal(p.alive,false);assert.equal(p.attackHits,2);assert.deepEqual(activeCrops(s.plants),[]);assert.equal(s.plants[0],p);
});
