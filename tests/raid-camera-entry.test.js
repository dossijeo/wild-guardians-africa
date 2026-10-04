import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {WorldScene} from '../src/rendering/scene.js';
const group=['warthog','hyena','buffalo','lion','rhino'];
function fixture(){
 const nav={config:{layers:[]},placement:()=>({valid:true}),setState(){},walkable:()=>true,segmentClear:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],setRaidView:Navigation.prototype.setRaidView};
 const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:0,z:0},nav);s.initialPreparation=false;s.time=400;nav.activeBounds=[-120,-120,120,120];return {s,nav};
}
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])test(`camera heading ${angle}: the complete epic group appears just behind the eye, without overlaps`,()=>{
 const {s,nav}=fixture(),eye={x:Math.sin(angle)*18,z:Math.cos(angle)*18},target={x:0,z:0};nav.setRaidView(eye,target);spawnRaid(s,{group},nav);
 assert.deepEqual(s.raid.animals.map(a=>a.species),group);
 for(const a of s.raid.animals){const back=(a.x-eye.x)*Math.sin(angle)+(a.z-eye.z)*Math.cos(angle);assert.ok(back>=a.radius+2-1e-8&&back<=a.radius+8+1e-8);assert.ok(Math.hypot(a.x-eye.x,a.z-eye.z)<40);assert.ok(nav.segmentClear(a,a.exit,a.radius,null,false));}
 for(let i=0;i<5;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(s.raid.animals[i].x-s.raid.animals[j].x,s.raid.animals[i].z-s.raid.animals[j].z)>s.raid.animals[i].radius+s.raid.animals[j].radius+1);
 const saved=serialize(s),birth=s.raid.animals.map(a=>a.spawn);nav.setRaidView({x:90,z:90},target);assert.equal(serialize(s),saved);assert.deepEqual(deserialize(saved).raid.animals.map(a=>a.spawn),birth);
});
test('a blocked camera rear falls back to a legal entry instead of placing bodies in obstacles',()=>{
 const {s,nav}=fixture();nav.setRaidView({x:0,z:18},{x:0,z:0});nav.walkable=(x,z)=>Math.abs(x)>100||Math.abs(z)>100;
 spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);const a=s.raid.animals[0];assert.ok(nav.walkable(a.x,a.z));assert.ok(Math.abs(a.x)>100||Math.abs(a.z)>100);
});
test('disconnected water behind the camera uses the near farm side with bounded route searches',()=>{
 const {s,nav}=fixture();nav.setRaidView({x:0,z:30},{x:0,z:0});nav.walkable=(x,z)=>z<20;let searches=0;nav.path=(_a,b)=>{searches++;return [{x:b.x,z:b.z}];};
 spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);const a=s.raid.animals[0];assert.ok(Math.hypot(a.x,a.z)<12);assert.ok(searches<=4);assert.ok(nav.walkable(a.x,a.z));
});
test('camera metadata is copied without invalidating routes, and rendering supplies the actual eye and target',()=>{
 const {s,nav}=fixture(),eye={x:10,z:20},target={x:1,z:2};nav.setRaidView(eye,target);eye.x=999;target.z=999;assert.deepEqual(nav.raidView,{eye:{x:10,z:20},target:{x:1,z:2}});
 const old=nav.raidView;nav.setRaidView({x:NaN,z:0},{x:0,z:0});assert.equal(nav.raidView,old);
 const world={nav,prototypes:[],camera:{position:{x:12,y:15,z:18}},quality:'media',pack:{profile:{}},horizon:{update(){}},chunks:new Map(),controls:{target:{x:3,y:0,z:4}},chunkStream:{plan(){},dispatch(){}},syncResidentProps(){},contacts:{update(){}}};
 WorldScene.prototype.syncChunks.call(world);assert.deepEqual(nav.raidView,{eye:{x:12,z:18},target:{x:3,z:4}});assert.equal(s.raid,null);
});
