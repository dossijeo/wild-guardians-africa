import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {cachedWateringRoute} from '../src/world/watering-route-cache.js';
import {wateringRoute} from '../src/world/work-points.js';
import {wateringRoute as reference} from './fixtures/watering-route-v1-reference.mjs';
import {Navigation} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
const worker={x:0,z:4,radius:.28},plant={id:'p',x:0,z:0,species:'mijo'};
const world=()=>({version:1,state:{},field:{},obstacles:[],suppressed:new Set()});
test('signed zero retains the native atan2 approach direction',()=>{
 const nav={version:1,state:{},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]},p={id:'origin',x:0,z:0,species:'mijo'};
 for(const w of [{x:0,z:0},{x:-0,z:-0}])assert.deepEqual(wateringRoute(w,p,nav),reference(w,p,nav));
});
test('an exact successful query is reused without sharing its mutable route',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;return {destination:{x:1,z:2,id:'point'},path:[{x:1,z:2}]};};
 const first=cachedWateringRoute(worker,plant,nav,compute);first.path[0].x=999;first.path.shift();first.destination.z=999;
 assert.deepEqual(cachedWateringRoute(worker,plant,nav,compute),{destination:{x:1,z:2,id:'point'},path:[{x:1,z:2}]});assert.equal(queries,1);
});
test('unreachable exact queries are reused; geometry epochs and world identities reopen them',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;return null;};
 for(let i=0;i<10;i++)assert.equal(cachedWateringRoute(worker,plant,nav,compute),null);assert.equal(queries,1);
 for(const edit of [()=>nav.version++,()=>nav.state={},()=>nav.obstacles=[],()=>nav.field={},()=>nav.suppressed=new Set(),()=>nav.preparedPaths={}]){
  const before=queries;edit();cachedWateringRoute(worker,plant,nav,compute);assert.equal(queries,before+1);
 }
});
test('coordinates, body radius, species, crop identity and avoided terrain remain exact inputs',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;return null;};
 cachedWateringRoute(worker,plant,nav,compute);
 for(const [w,p] of [[{...worker,x:1e-9},plant],[{...worker,radius:.3},plant],[{...worker,terrainAvoidance:[{x:1,z:2}]},plant],[worker,{...plant,id:'other'}],[worker,{...plant,species:'platano'}],[worker,{...plant,z:1e-9}]])cachedWateringRoute(w,p,nav,compute);
 assert.equal(queries,7);
});
test('changed query implementations invalidate, and unversioned adapters are never memoized',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;return null;};cachedWateringRoute(worker,plant,nav,compute);
 nav.walkable=()=>true;cachedWateringRoute(worker,plant,nav,compute);assert.equal(queries,2);
 delete nav.version;cachedWateringRoute(worker,plant,nav,compute);cachedWateringRoute(worker,plant,nav,compute);assert.equal(queries,4);
});
test('a geometry change during computation cannot publish under the previous epoch',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;nav.version++;return null;};
 cachedWateringRoute(worker,plant,nav,compute);cachedWateringRoute(worker,plant,nav,compute);assert.equal(queries,2);
});
test('entry and point budgets evict or reject instead of retaining unbounded queries',()=>{
 const nav=world();let queries=0;const compute=()=>{queries++;return null;};
 for(let i=0;i<8193;i++)cachedWateringRoute(worker,{...plant,id:String(i)},nav,compute);
 cachedWateringRoute(worker,{...plant,id:'0'},nav,compute);assert.equal(queries,8194);
 const huge=()=>{queries++;return {destination:{x:0,z:0},path:Array.from({length:20001},()=>({x:0,z:0}))};};
 cachedWateringRoute(worker,plant,nav,huge);cachedWateringRoute(worker,plant,nav,huge);assert.equal(queries,8196);
});
for(const suffix of ['1','10'])test(`native canyon ${suffix} matches frozen uncached routes, including repeats and reload`,()=>{
 const raw=gunzipSync(readFileSync(new URL(`./fixtures/watering-gran-canon-saheliana-detour-${suffix}.json.gz`,import.meta.url))).toString();
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
 const a=deserialize(raw),b=deserialize(raw),na=new Navigation(a.seed,a.biome,profile),nb=new Navigation(b.seed,b.biome,profile);na.setState(a);nb.setState(b);
 const wa=a.workers.find(w=>w.id==='worker-14'),wb=b.workers.find(w=>w.id==='worker-14'),id=suffix==='1'?'plant-38':'plant-24',pa=a.plants.find(p=>p.id===id),pb=b.plants.find(p=>p.id===id);
 const before=serialize(a);
 for(let i=0;i<4;i++)assert.deepEqual(wateringRoute(wa,pa,na),reference(wb,pb,nb));
 assert.equal(serialize(a),before);assert.equal(serialize(b),before);
 const saved=deserialize(serialize(a)),fresh=new Navigation(saved.seed,saved.biome,profile);fresh.setState(saved);
 assert.deepEqual(wateringRoute(saved.workers.find(w=>w.id===wa.id),saved.plants.find(p=>p.id===id),fresh),reference(wb,pb,nb));
 // An actual new collision solid must invalidate even a previously accepted
 // exact approach, and removing it must reopen the native route.
 const buildings=a.villages[0].buildings;
 a.villages[0].buildings=[...buildings,{key:'enclose-worker',kind:'Edificio',x:wa.x,z:wa.z,radius:2}];na.setState(a);
 assert.equal(wateringRoute(wa,pa,na),null);assert.equal(reference(wa,pa,na),null);
 a.villages[0].buildings=buildings;na.setState(a);
 const reopened=wateringRoute(wa,pa,na);assert.ok(reopened);assert.deepEqual(reopened,reference(wa,pa,na));
 let previous=wa;for(const point of reopened.path){assert(na.segmentClear(previous,point,wa.radius??.28,null,true));previous=point;}
});
