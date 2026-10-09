import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Navigation} from '../src/world/navigation.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {diagnosticWateringSource} from '../tools/watering-route-diagnostics.mjs';

const workUrl=new URL('../src/world/work-points.js',import.meta.url);
const observedCode=diagnosticWateringSource(readFileSync(workUrl,'utf8').replaceAll('\r\n','\n')).replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,workUrl).href}'`:match);
const observed=await import(`data:text/javascript;base64,${Buffer.from(observedCode).toString('base64')}`);

for(const [suffix,plantId,maximum] of [['1','plant-38',14],['10','plant-24',16]]){
 test(`native Canyon watering detour ${suffix} uses a shorter physically valid side`,()=>{
  const s=deserialize(gunzipSync(readFileSync(new URL(`./fixtures/watering-gran-canon-saheliana-detour-${suffix}.json.gz`,import.meta.url))).toString());
  const profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
  const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const worker=s.workers.find(w=>w.id==='worker-14'),plant=s.plants.find(p=>p.id===plantId),before=serialize(s);
  const original=worker.path.reduce((r,p)=>({point:p,length:r.length+Math.hypot(p.x-r.point.x,p.z-r.point.z)}),{point:worker,length:0}).length;
  assert.ok(original>30,'fixture retains the original real detour');
  const route=wateringRoute(worker,plant,nav);assert.ok(route);
  let length=0,previous=worker;
  for(const p of route.path){assert.ok(nav.segmentClear(previous,p,worker.radius??.28,null,true),'no shortcut through terrain or solids');length+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
  assert.ok(length<maximum,`expected a bounded shorter route, got ${length}`);
  assert.ok(canWaterFrom({...route.destination,radius:worker.radius},plant,nav));
  assert.ok(Math.hypot(route.destination.x-plant.x,route.destination.z-plant.z)>=.82,'worker remains outside the crop');
  assert.equal(serialize(s),before,'route selection never advances or mutates the crop/task/save');
  const second=new Navigation(s.seed,s.biome,profile);second.setState(s);
  const calls=[];
  for(const method of ['path','walkable','segmentClear']){const native=second[method];second[method]=function(...args){calls.push(method);return native.apply(this,args);};}
  const fromObserver=observed.wateringRoute(worker,plant,second);
  assert.deepEqual(fromObserver,route,'observer cannot change a geometric shortcut');
  assert.equal(calls.filter(method=>method==='path').length,0,'both real detours avoid A*');
  assert.equal(serialize(s),before,'observed preflight cannot mutate the saved state');
 });
}
test('ordinary unobstructed watering keeps its single path query',()=>{
 let calls=0;const worker={x:0,z:4,radius:.28},plant={id:'open',x:0,z:0,species:'mijo'},nav={walkable:()=>true,path:(_a,b)=>{calls++;return [{...b}];}};
 const route=wateringRoute(worker,plant,nav);assert.ok(route);assert.equal(calls,1);assert.equal(route.destination.id,'water-point-open-0');
});

test('unsuccessful preflight is bounded and retains the ordinary A* fallback',()=>{
 let segments=0,queries=0;
 const worker={x:0,z:4,radius:.28},plant={id:'fallback',x:0,z:0,species:'mijo'};
 const nav={obstacles:[],walkable:()=>true,segmentClear:()=>{segments++;return false;},path:(_a,b)=>{queries++;return [{...b}];}};
 const route=wateringRoute(worker,plant,nav);
 assert.equal(segments,5);assert.equal(queries,1);assert.equal(route.destination.id,'water-point-fallback-0');
});

test('clear native approach avoids A* and retains the near-side stand-off',()=>{
 const worker={x:0,z:4,radius:.28},plant={id:'clear',x:0,z:0,species:'mijo'};
 const nav={obstacles:[],walkable:()=>true,segmentClear:()=>true,path:()=>{throw Error('Clear approach must not invoke grid search');}};
 const route=wateringRoute(worker,plant,nav);assert.equal(route.destination.id,'water-point-clear-0');
 assert.ok(Math.hypot(route.destination.x,route.destination.z)>=.82);assert.equal(route.path.length,1);
});
