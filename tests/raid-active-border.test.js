import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {nextRandom} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {WorldScene} from '../src/rendering/scene.js';

function fixture(){
 const nav={version:1,config:{layers:[]},placement:()=>({valid:true}),setState(){this.version++;},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],setActiveBounds:Navigation.prototype.setActiveBounds};
 const s=Game.newGame({seed:712,slotId:'active-border'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);s.time=400;s.initialPreparation=false;
 return {nav,s};
}

for(const quality of ['media','alta'])for(let side=0;side<4;side++)test(`QA-094: ${quality} complete group enters side ${side} of the camera's active region`,()=>{
 const {nav,s}=fixture(),group=['warthog','hyena','buffalo','lion','rhino'];
 // Deliberately put the farm outside the rectangle, to test group placement
 // near corners without stacking each animal at a clamped projection.
 const bounds=activeChunkRegion({x:528,z:-432},quality).bounds;
 nav.setActiveBounds(bounds);const inset=4.8,axis=side<2?'x':'z',normal=side===0?bounds[0]+inset:side===1?bounds[2]-inset:side===2?bounds[1]+inset:bounds[3]-inset;
 nav.walkable=(x,z)=>Math.abs((axis==='x'?x:z)-normal)<=3+1e-9;nav.segmentClear=()=>true;
 const rng={rng:s.rng};spawnRaid(s,{group},nav);assert.ok(s.raid);
 assert.deepEqual(s.raid.animals.map(a=>a.species),group);
 assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);
 for(const a of s.raid.animals){
  assert.ok(Math.abs(a[axis]-normal)<1e-9);assert.deepEqual(a.spawn,{x:a.x,z:a.z});assert.equal(a.status,'entering');
  assert.ok(Math.abs(Math.hypot(a.x-a.exit.x,a.z-a.exit.z)-3)<1e-9);
  assert.ok(a.x-a.radius>=bounds[0]&&a.z-a.radius>=bounds[1]&&a.x+a.radius<=bounds[2]&&a.z+a.radius<=bounds[3]);
 }
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
  const a=s.raid.animals[i],b=s.raid.animals[j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>a.radius+b.radius+1);
 }
 for(let i=0;i<6;i++)nextRandom(rng);assert.equal(s.rng,rng.rng,'Spatial retries do not redraw any hit budget');
});

test('QA-095: streaming updates camera bounds without resetting raid state or persisted entry positions',()=>{
 const {nav,s}=fixture();nav.setActiveBounds([-120,-120,120,120]);spawnRaid(s,{group:['warthog','hyena']},nav);updateRaid(s,.2,nav);
 const raid=s.raid,animals=raid.animals,copy=serialize(s),version=nav.version;
 const world={nav,prototypes:[],camera:{position:{x:2400,y:12,z:-3600}},quality:'alta',pack:{profile:{}},horizon:{update(){}},chunks:new Map(),controls:{target:{x:2400,y:0,z:-3600}},chunkStream:{plan(){},dispatch(){}},syncResidentProps(){},contacts:{update(){}}};
 WorldScene.prototype.syncChunks.call(world);
 assert.deepEqual(nav.activeBounds,[2232,-3768,2568,-3432]);assert.equal(nav.version,version);
 assert.equal(s.raid,raid);assert.equal(s.raid.animals,animals);assert.equal(serialize(s),copy);
 const loaded=deserialize(copy),original=loaded.raid.animals.map(a=>({id:a.id,spawn:a.spawn,hits:a.hitsRemaining}));
 nav.setActiveBounds([10000,10000,10240,10240]);nav.setState(loaded);updateRaid(loaded,.2,nav);
 assert.deepEqual(loaded.raid.animals.map(a=>({id:a.id,spawn:a.spawn,hits:a.hitsRemaining})),original);
 assert.equal(loaded.events.filter(e=>e.type==='RaidSpawned').length,1);
});

test('active bounds are copied, validated, and retained independently of route invalidation',()=>{
 const nav=new Navigation(712,'sabana',{}),bounds=[-120,-120,120,120];nav.setActiveBounds(bounds);bounds[0]=500;
 assert.deepEqual(nav.activeBounds,[-120,-120,120,120]);const ref=nav.activeBounds;nav.setActiveBounds([...ref]);assert.equal(nav.activeBounds,ref);
 for(const bad of [null,[],[0,0,1,NaN],[0,0,0,1],[2,0,1,1]])assert.throws(()=>nav.setActiveBounds(bad),RangeError);
 nav.setState(Game.newGame({seed:712}));assert.equal(nav.activeBounds,ref);
});

test('a region too small for the complete epic bodies cancels entry instead of spawning outside it',()=>{
 const {nav,s}=fixture();nav.setActiveBounds([0,0,1,1]);const nextId=s.nextId;
 spawnRaid(s,{group:['warthog','rhino']},nav);assert.equal(s.raid,null);assert.equal(s.nextId,nextId);
 assert.ok(s.messages.at(-1).text.includes('grupo completo'));
});
