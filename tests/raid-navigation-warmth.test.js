import test from 'node:test';
import assert from 'node:assert/strict';
import {raidNavigationWarmth,warmRaidNavigation,navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {Navigation} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {readFileSync} from 'node:fs';
import {BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {tick} from '../src/simulation/game.js';

test('worker reply bounds immutable collision tables and omits actor state and failures',()=>{
  const entries=n=>new Map(Array.from({length:n},(_,i)=>[String(i),i]));
  const warmth=raidNavigationWarmth({version:7,chunks:entries(10),walkCache:entries(6000),segmentCache:entries(11000),failedPaths:new Set(['failed']),state:{raid:{reservations:{busy:true}}}});
  assert.equal(warmth.chunks.length,8);assert.equal(warmth.walk.length,5000);assert.equal(warmth.segments.length,10000);
  assert.deepEqual(Object.keys(warmth),['version','chunks','walk','segments','paths']);
});

test('only the same geometry epoch imports static answers and existing answers prevail',()=>{
  const nav={version:2,chunks:new Map(),walkCache:new Map([['known',false]]),segmentCache:new Map()};
  const warmth={version:1,chunks:[['chunk',{}]],walk:[['known',true],['new',true]],segments:[['seg',true]],paths:[]};
  assert.equal(warmRaidNavigation(nav,warmth),false);assert.equal(nav.chunks.size,0);assert.equal(nav.preparedPaths,undefined);
  warmth.version=2;assert.equal(warmRaidNavigation(nav,warmth),true);assert.equal(nav.walkCache.get('known'),false);assert.equal(nav.walkCache.get('new'),true);
});

test('prepared successful paths require exact query parameters and give callers independent waypoints',()=>{
  const {nav}=createOpeningWorld(),start={x:100,z:100},end={x:104,z:104},route=[{x:101,z:102},{x:104,z:104}];
  const key=navigationPathKey(start,end,.7,null,false,16);
  warmRaidNavigation(nav,{version:nav.version,chunks:[],walk:[],segments:[],paths:[[key,route]]});
  let searches=0;nav.findPath=()=>{searches++;return [{x:999,z:999}];};nav.smoothPath=(_,p)=>p;
  const first=nav.path(start,end,.7,null,false,16);assert.deepEqual(first,route);first[0].x=-1;first.pop();
  assert.deepEqual(nav.path(start,end,.7,null,false,16),route);assert.equal(searches,0);
  for(const args of [[end,start,.7,null,false,16],[start,end,.8,null,false,16],[start,end,.7,'center',false,16],[start,end,.7,null,true,16],[start,end,.7,null,false,8]])nav.path(...args);
  assert.equal(searches,5);
  nav.failedPaths.add(key);assert.equal(nav.path(start,end,.7,null,false,16),null);
});

test('clear crops retain prepared routes but removed props, rebuilt obstacles and proposed construction invalidate',()=>{
  const {s,nav}=createOpeningWorld(),start={x:100,z:100},end={x:104,z:104};
  const install=()=>warmRaidNavigation(nav,{version:nav.version,chunks:[],walk:[],segments:[],paths:[[navigationPathKey(start,end,.7,null,false,16),[{x:123,z:456}]]]});
  install();const preview=nav.forBuildingPlacement({x:1,z:1,radius:3});assert.equal(preview.preparedPaths,null);
  let searches=0;nav.findPath=()=>{searches++;return [{x:999,z:999}];};
  nav.syncCropPlacement(s);assert.equal(nav.path(start,end,.7,null,false)[0].x,123);assert.equal(searches,0);
  nav.syncCropPlacement(s,['removed-prop']);assert.equal(nav.preparedPaths,null);assert.equal(nav.path(start,end,.7,null,false)[0].x,999);assert.equal(searches,1);
  install();nav.setState(s);assert.equal(nav.preparedPaths,null);assert.equal(nav.path(start,end,.7,null,false)[0].x,999);
});

for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: a paid populated farm preserves full movement and gameplay state with prepared queries`,()=>{
  const source=JSON.parse(readFileSync(new URL(`../docs/qa/populated-raids/${biome}.json`,import.meta.url))),context=source.timing.navigationContext;
  const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[biome]}.json`,import.meta.url))).profile;
  const make=()=>{
    const state=deserialize(context.state),nav=new Navigation(state.seed,state.biome,profile);
    nav.setState(state);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
    for(const key of context.warmedChunks){const [cx,cz]=key.split(',').map(Number);nav.chunk(cx,cz);}
    return {state,nav};
  };
  const reference=make(),prepared=make(),before=serialize(prepared.state),key=raidEntryKey(prepared.state,prepared.nav,source.group);
  const reply=computeRaidEntry(raidEntryRequest(prepared.state,prepared.nav,source.group,key,1));
  assert.equal(serialize(prepared.state),before);assert.ok(reply.warmth.paths.length<=128);
  assert.ok(reply.warmth.paths.reduce((sum,[,route])=>sum+route.length,0)<=20000);
  prepared.nav.preparedRaidEntry=(s,g,b)=>raidEntryKey(s,prepared.nav,g,b)===reply.key?reply:undefined;
  spawnRaid(reference.state,source.plan,reference.nav);spawnRaid(prepared.state,source.plan,prepared.nav);
  assert.equal(serialize(prepared.state),serialize(reference.state));
  for(let step=0;step<200;step++){
    tick(reference.state,.05,reference.nav);tick(prepared.state,.05,prepared.nav);
    assert.equal(serialize(prepared.state),serialize(reference.state),`Complete state changed at movement step ${step}`);
  }
});
