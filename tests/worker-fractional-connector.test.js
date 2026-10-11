import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {workerFractionalConnector} from '../src/world/worker-fractional-connector.js';
import {walkTo} from '../src/simulation/game.js';
import {advanceGateLeaves} from '../src/simulation/gates.js';
const snapshot=new URL('./fixtures/worker-fractional-departure/state.json.gz',import.meta.url);
function world(){const s=deserialize(gunzipSync(readFileSync(snapshot)).toString()),w=s.workers[0],v=s.villages[0],end={...(v.entry??v),id:'home-'+v.id};return {s,w,end,nav:navigation(s)};}
function navigation(s){const p=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile,n=new Navigation(s.seed,s.biome,p);n.setState(s);return n;}
function connector(nav,w,end){for(let i=0;i<4096;i++){const path=workerFractionalConnector(nav,w,end);if(path)return path;}return null;}
test('archived valid fractional origin obtains a wholly native swept route to the village',()=>{
 const {s,w,nav,end}=world(),before=serialize(s);
 assert(nav.walkable(w.x,w.z,.28,null,true));assert.equal(nav.workerPath(w,end,.28,null),null);
 const path=connector(nav,w,end);assert(path);assert.equal(serialize(s),before);
 let previous=w;for(const p of path){assert(nav.walkable(p.x,p.z,.28,null,true));assert(nav.segmentClear(previous,p,.28,null,true));previous=p;}
 assert.deepEqual(path.at(-1),{x:end.x,z:end.z});
});
test('native departure moves continuously and survives reload without income, clock or task changes',()=>{
 let {s,w,nav,end}=world();const before=JSON.stringify([s.result,s.day,s.time,s.elapsed,s.ledger,s.plants,s.rng,s.tasks]);let reached=false,reloaded=false;
 for(let i=0;i<1200&&!reached;i++){
  advanceGateLeaves({...s,result:null,initialPreparation:false,pauses:[]},.1);
  const x=w.x,z=w.z;reached=walkTo(s,w,end,.1,nav,{motion:{flight:true}});assert(Math.hypot(w.x-x,w.z-z)<=.240000001);
  if(i===10){s=deserialize(serialize(s));w=s.workers.find(p=>p.id==='worker-52429');nav=navigation(s);reloaded=true;}
 }
 assert(reached&&reloaded);assert.equal(JSON.stringify([s.result,s.day,s.time,s.elapsed,s.ledger,s.plants,s.rng,s.tasks]),before);
});
test('local connector never ignores a new enclosing solid, and failure is cached until topology changes',()=>{
 const {w,nav,end}=world();const original=nav.obstacles;
 nav.obstacles=[...original,{id:'enclosing-solid',kind:'house',x:w.x,z:w.z,radius:2}];nav.invalidateGeometryQueries();
 let queries=0;const native=nav.walkable.bind(nav);nav.walkable=(...args)=>{queries++;return native(...args);};
 assert.equal(workerFractionalConnector(nav,w,end),null);const first=queries;
 for(let i=0;i<50;i++)assert.equal(workerFractionalConnector(nav,w,end),null);assert.equal(queries,first);
 nav.obstacles=original;nav.invalidateGeometryQueries();assert(connector(nav,w,end));
});
test('ordinary active work receives no fractional departure exception',()=>{
 for(const status of ['idle','walking','acting','carrying','arriving']){
  const {w,nav,end}=world();w.status=status;nav.workerPath=()=>{throw Error('No extra search for ordinary work');};assert.equal(workerFractionalConnector(nav,w,end),null);
 }
});
test('smaller native search quanta preserve the exact route and final explored region',()=>{
 const {s,w,end}=world(),grid={x:103,z:14};const runs=[];
 for(const quantum of [8,4]){
  const nav=navigation(s),search=nav.findPathSteps(grid,end,.28,null,true,16,{yieldEvery:quantum});let step,slices=0;
  do{step=search.next();slices++;}while(!step.done);
  runs.push({path:step.value,slices});
 }
 assert.deepEqual(runs[0].path,runs[1].path);assert(runs[1].slices>runs[0].slices);
 for(const yieldEvery of [0,9,NaN,1.5])assert.throws(()=>navigation(s).findPathSteps(w,end,.28,null,true,16,{yieldEvery}).next(),/yield quantum/);
});
test('topology changes invalidate an in-progress search before returning its old route',()=>{
 const {w,nav,end}=world();assert.equal(workerFractionalConnector(nav,w,end),null);
 nav.obstacles.push({id:'new-solid',kind:'house',x:w.x,z:w.z,radius:2});nav.invalidateGeometryQueries();
 assert.equal(connector(nav,w,end),null);
});
test('removed actors cannot retain all eight active search slots',()=>{
 const {s,w,nav,end}=world(),original=structuredClone(w);
 for(let i=0;i<8;i++){
  const actor={...structuredClone(original),id:'pending-'+i};s.workers.push(actor);assert.equal(workerFractionalConnector(nav,actor,end),null);
 }
 s.workers=[w];assert(connector(nav,w,end),'Removed pending actors must free bounded search slots');
});
