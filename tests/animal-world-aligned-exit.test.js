import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {animalGridExitBridge} from '../src/simulation/animal-grid-exit-bridge.js';
import * as Game from '../src/simulation/game.js';

test('world-aligned connector reaches a narrow corridor without relaxing swept tests',()=>{
 const actor={x:0,z:0,radius:1.1,status:'retreating'},end={x:13,z:100};let slices=0,checks=0;
 const nav={version:1,walkable:(x,z)=>{checks++;return Math.abs(x)<1e-8||x===end.x&&z===end.z;},segmentClear:(a,b)=>{checks++;return Math.abs(a.x)<1e-8&&(Math.abs(b.x)<1e-8||a.z>=4&&b.x===end.x&&b.z===end.z);},
  *findPathSteps(p){for(let n=0;n<3;n++){slices++;yield null;}return [{x:0,z:4},end];}};
 let result;for(let i=0;i<40;i++){const previous=slices,c=checks;result=animalGridExitBridge(actor,end,nav);assert(slices-previous<=1);assert(checks-c<=24);if(result.path)break;}
 assert(result.path);assert.equal(result.path[0].x,0);assert.deepEqual(result.path.at(-1),end);assert.deepEqual(actor,{x:0,z:0,radius:1.1,status:'retreating'});
});

const load=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/campaign-v114-q15-good-sabana-123-hundred/partial-state.json.gz',import.meta.url))).toString());
const navigation=s=>{const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile);nav.setState(s);return nav;};
test('retained night-eleven animal physically exits and completes raid after movement reload',()=>{
 let s=load(),nav=navigation(s),a=s.raid.animals.find(a=>a.id==='animal-10727');
 const exit={...a.exit},ledger=structuredClone(s.ledger);let moved=false,reloaded=false,steps=0;
 for(;s.raid&&steps<4000;steps++){
  a=s.raid.animals.find(a=>a.id==='animal-10727');const before={x:a.x,z:a.z};
  Game.tick(s,.1,nav);
  const travelled=Math.hypot(a.x-before.x,a.z-before.z);
  assert(travelled<=.380000001,'Never teleport beyond native retreat speed');
  if(travelled>1e-9){assert(nav.segmentClear(before,a,a.radius,null,false),'Each actual move preserves native geometry');moved=true;}
  assert.equal(a.radius,1.1);assert.equal(a.hitsRemaining,0);
  if(moved&&!reloaded&&a.status!=='gone'){s=deserialize(serialize(s));nav=navigation(s);reloaded=true;}
 }
 assert(moved&&reloaded);assert.equal(s.raid,null);assert.equal(a.status,'gone');assert(Math.hypot(a.x-exit.x,a.z-exit.z)<1e-8);
 assert.equal(s.day,12);assert.equal(s.result,null);assert.equal(s.completedNights,11);assert.deepEqual(s.ledger,ledger);
 assert(s.events.some(e=>e.type==='RaidEnded'));assert(s.events.some(e=>e.type==='Dawn'));
});
