import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {animalGridExitBridge} from '../src/simulation/animal-grid-exit-bridge.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';
import {tick} from '../src/simulation/game.js';

const load=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/pilot-v35-good-q9-single-hit-sabana-123-twentyone/partial-state.json.gz',import.meta.url))).toString());
function navigation(s){const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return nav;}

test('bridge advances only one native iterator slice per call and verifies swept legs',()=>{
 let slices=0,checks=0;const actor={x:0,z:0,radius:1,status:'retreating'},end={x:100,z:0};
 const nav={version:1,walkable:()=>{checks++;return true;},segmentClear:()=>{checks++;return true;},*findPathSteps(p,q,r,i,w,m,options){assert.equal(w,false);assert.equal(m,64);assert.equal(options.skipDirect,true);for(let n=0;n<20;n++){slices++;yield null;}return [q];}};
 let result;
 for(let n=0;n<30;n++){const before=slices,c=checks;result=animalGridExitBridge(actor,end,nav);assert.ok(slices-before<=1);assert.ok(checks-c<=24);if(result.path)break;}
 assert.ok(result.path);assert.deepEqual(result.path.at(-1),end);assert.equal(slices,20);
 assert.deepEqual({x:actor.x,z:actor.z},{x:0,z:0});
});

test('optional bridge grid search avoids a long synchronous ray without relaxing edges',()=>{
 const nav={walkable:()=>true,segmentClear:(a,b)=>{assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=2,'Only native short edges and endpoint connectors');return true;},searchedRegions:[],closedRegions:new Map(),searchNeighbors:cur=>Array.from({length:8},(_,i)=>({x:cur.x+[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][i][0],z:cur.z+[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][i][1],walkable:true}))};
 const start={x:0,z:0},end={x:20,z:0};
 const search=Navigation.prototype.findPathSteps.call(nav,start,end,.3,null,false,16,{skipDirect:true});let step;
 do{step=search.next();}while(!step.done);
 assert.ok(step.value);assert.deepEqual(step.value.at(-1),end);
 const normal=Navigation.prototype.findPathSteps.call(nav,start,end,.3,null,false,16);
 assert.throws(()=>normal.next(),/Only native short edges/,'Default routing still retains its direct shortcut');
});

test('bridge invalidates pending and failed routes on geometry or provider changes',()=>{
 const actor={x:0,z:0,status:'retreating'},end={x:10,z:0};let started=0;
 const nav={version:1,walkable:()=>true,segmentClear:()=>true,*findPathSteps(){started++;yield null;return null;}};
 animalGridExitBridge(actor,end,nav);animalGridExitBridge(actor,end,nav);assert.equal(started,1);
 nav.version++;animalGridExitBridge(actor,end,nav);animalGridExitBridge(actor,end,nav);assert.equal(started,2);
 nav.findPathSteps=function*(){started++;yield null;return null;};animalGridExitBridge(actor,end,nav);animalGridExitBridge(actor,end,nav);assert.equal(started,3);
});

test('retained native bridge returns the same physical route after reloading pending search',()=>{
 const s=load(),nav=navigation(s),actor=s.raid.animals.find(a=>a.status==='retreating');
 for(let i=0;i<40;i++)assert.equal(animalExitConnector(actor,actor.exit,nav),null);
 const restored=deserialize(serialize(s)),navB=navigation(restored),b=restored.raid.animals.find(a=>a.id===actor.id);
 function finish(a,n){let path=null;for(let i=0;i<4000&&!path;i++)path=animalExitConnector(a,a.exit,n);assert.ok(path);let previous=a;for(const p of path){assert.ok(n.segmentClear(previous,p,a.radius,null,false));previous=p;}assert.deepEqual(path.at(-1),a.exit);return path;}
 assert.deepEqual(finish(actor,nav),finish(b,navB));assert.equal(s.rng,restored.rng);assert.deepEqual(s.ledger,restored.ledger);
});

test('retained seed123 night17 exits physically, including a reload while moving',()=>{
 let s=load(),nav=navigation(s);const ledger=structuredClone(s.ledger),structures=structuredClone(s.structures);
 const id=s.raid.animals.find(a=>a.status==='retreating').id,exit={...s.raid.animals.find(a=>a.id===id).exit};
 let reloaded=false,moved=false,finalActor,steps=0;
 for(;s.raid&&steps<4000;steps++){
  const actor=s.raid.animals.find(a=>a.id===id),before={x:actor.x,z:actor.z};
  tick(s,.1,nav);finalActor=actor;
  const distance=Math.hypot(actor.x-before.x,actor.z-before.z);assert.ok(distance<=.38+1e-8);assert.ok(nav.segmentClear(before,actor,actor.radius,null,false));assert.equal(actor.hitsRemaining,0);
  moved||=distance>1e-8;
  if(moved&&!reloaded&&s.raid){s=deserialize(serialize(s));nav=navigation(s);reloaded=true;}
 }
 assert.ok(moved);assert.ok(reloaded);assert.equal(s.raid,null);assert.equal(s.completedNights,17);assert.equal(s.day,18);assert.equal(s.result,null);
 assert.deepEqual({x:finalActor.x,z:finalActor.z},exit);assert.equal(finalActor.status,'gone');assert.deepEqual(s.ledger,ledger);
 assert.deepEqual(s.structures,structures);assert.ok(s.pauses.includes('hiring'));
});
