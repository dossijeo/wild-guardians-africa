import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {workerFractionalConnector} from '../src/world/worker-fractional-connector.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {walkTo,tick} from '../src/simulation/game.js';
import {advanceGateLeaves} from '../src/simulation/gates.js';
const snapshot=new URL('./fixtures/worker-fractional-departure/state.json.gz',import.meta.url);
function world(){const s=deserialize(gunzipSync(readFileSync(snapshot)).toString()),w=s.workers[0],v=s.villages[0],end={...(v.entry??v),id:'home-'+v.id};return {s,w,end,nav:navigation(s)};}
function navigation(s){const p=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile,n=new Navigation(s.seed,s.biome,p);n.setState(s);return n;}
function connector(nav,w,end){for(let i=0;i<4096;i++){const path=workerFractionalConnector(nav,w,end);if(path)return path;}return null;}
for(const reload of [false,true])test(`native tick completes isolated departure as home${reload?' after mid-search reload':''}`,()=>{
 let {s,w,nav}=world();
 // This copy is an isolated locomotion fixture, not a resumed lost campaign.
 s.result=null;s.pauses=[];s.time=400;s.raid=null;s.spells=[];
 s.dayPlan={at:0,done:true,group:[]};s.nightPlan={at:500,done:true,group:[]};
 s.plants=[];s.tasks=[];s.crates=[];s.workers=[w];nav=navigation(s);
 const ledger=JSON.stringify(s.ledger),version=nav.version;let reloaded=false;
 for(let i=0;i<1200&&w.status!=='home';i++){
  const x=w.x,z=w.z;tick(s,.1,nav);assert(Math.hypot(w.x-x,w.z-z)<=.240000001);
  if(reload&&i===100){s=deserialize(serialize(s));w=s.workers[0];nav=navigation(s);reloaded=true;}
 }
 assert.equal(w.status,'home');assert.equal(reloaded,reload);assert.equal(nav.version,version);
 assert.equal(JSON.stringify(s.ledger),ledger);assert.equal(s.day,65);assert.equal(s.tasks.length,0);assert.equal(s.crates.length,0);assert.equal(s.raid,null);
});
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
 const {s,w,nav,end}=world(),village=s.villages[0],original=village.buildings;
 village.buildings=[...original,{key:'enclosing-solid',kind:'Edificio',x:w.x,z:w.z,radius:2}];nav.setState(s);
 let queries=0;const native=nav.walkable.bind(nav);nav.walkable=(...args)=>{queries++;return native(...args);};
 assert.equal(workerFractionalConnector(nav,w,end),null);const first=queries;
 for(let i=0;i<50;i++)assert.equal(workerFractionalConnector(nav,w,end),null);assert.equal(queries,first);
 village.buildings=original;nav.setState(s);assert(connector(nav,w,end));
});
test('ordinary active work receives no fractional departure exception',()=>{
 for(const status of ['idle','walking','acting','carrying','arriving']){
  const {w,nav,end}=world();w.status=status;nav.workerPath=()=>{throw Error('No extra search for ordinary work');};assert.equal(workerFractionalConnector(nav,w,end),null);
 }
});
test('cooperative route adapter returns a stable valid route for both search quanta',()=>{
 const {s,w,end}=world(),grid={x:103,z:14};const runs=[];
 for(const quantum of [8,4]){
  const nav=navigation(s),search=nav.findPathSteps(grid,end,.28,null,true,16,{yieldEvery:quantum});let step,slices=0;
  do{step=search.next();slices++;}while(!step.done);
  runs.push({path:step.value,slices});
 }
 assert.deepEqual(runs[0].path,runs[1].path);
 assert(runs.every(run=>run.slices>=2&&run.path?.length>0));
 const clearance=navigation(s);
 for(const run of runs){let previous=grid;for(const point of run.path){assert(clearance.segmentClear(previous,point,.28,null,true));previous=point;}}
 for(const yieldEvery of [0,9,NaN,1.5])assert.throws(()=>navigation(s).findPathSteps(w,end,.28,null,true,16,{yieldEvery}).next(),/yield quantum/);
});
test('topology changes invalidate an in-progress search before returning its old route',()=>{
 const {s,w,nav,end}=world();assert.equal(workerFractionalConnector(nav,w,end),null);
 s.villages[0].buildings.push({key:'new-solid',kind:'Edificio',x:w.x,z:w.z,radius:2});nav.setState(s);
 assert.equal(connector(nav,w,end),null);
});
test('removed actors cannot retain all eight active search slots',()=>{
 const {s,w,nav,end}=world(),original=structuredClone(w);
 for(let i=0;i<8;i++){
  const actor={...structuredClone(original),id:'pending-'+i};s.workers.push(actor);assert.equal(workerFractionalConnector(nav,actor,end),null);
 }
 s.workers=[w];assert(connector(nav,w,end),'Removed pending actors must free bounded search slots');
});
test('new route adapter preserves physical clearance through fractional departure',()=>{
 const {s,w,end}=world(),grid={x:103,z:14},nav=navigation(s),search=nav.findPathSteps(grid,end,.28,null,true);let step;
 do{step=search.next();}while(!step.done);
 const route=step.value;
 assert(route?.length>0);
 assert.deepEqual(route,nav.path(grid,end,.28,null,true));
 let previous=grid;for(const point of route){
  assert(nav.segmentClear(previous,point,.28,null,true));previous=point;
 }
 assert(Math.hypot(previous.x-end.x,previous.z-end.z)<1e-8);
});
test('spatial WASM movement can rejoin its native graph from a fractional worker pocket',()=>{
 const state={seed:712,biome:'sabana',structures:[],villages:[],spells:[],suppressed:[]};
 const field={canyon:false,surface:()=>0,slope:()=>0,fluidInside:()=>false};
 let blocked=false,revision=1;
 const edge=(a,b)=>!blocked&&Math.hypot(a.x-b.x,a.z-b.z)<=.36;
 let nativeRoutes=0;
 const session={field,suppressed:new Set(),topologySource:{revision:()=>revision},
  actorCanStand:()=>true,actorStepClear:edge,
  queryPropsAt:()=>({status:'ready',props:[]}),
  actorRegions:()=>({ids:[],unknown:false}),
  routeActor:(a,b)=>{
   nativeRoutes++;
   if(a.x===.5&&a.z===.5)return {status:'unknown',points:[]};
   const points=[];let x=a.x,z=a.z;
   while(Math.hypot(x-b.x,z-b.z)>1e-8){
    x+=Math.max(-.25,Math.min(.25,b.x-x));
    z+=Math.max(-.25,Math.min(.25,b.z-z));
    points.push({x,z});
   }
   return {status:'found',points};
  }};
 const nav=createSpatialNavigationMovement(session,state),worker={x:.5,z:.5,status:'returning'},end={x:2,z:0};
 assert.equal(nav.path(worker,end,.28,null,true),null,'the native graph has no direct fractional connector');
 let route=null;
 for(let i=0;i<4096&&!route;i++)route=workerFractionalConnector(nav,worker,end,.28);
 assert(route?.length>1);assert(nativeRoutes>1);
 let previous=worker;
 for(const point of route){assert(nav.walkable(point.x,point.z,.28,null,true));assert(nav.segmentClear(previous,point,.28,null,true));previous=point;}
 assert.deepEqual(previous,end);
 blocked=true;revision++;
 for(let i=0;i<4096;i++)assert.equal(workerFractionalConnector(nav,worker,end,.28),null,
  'a topology change cannot reuse the former prefix through a solid barrier');
});
