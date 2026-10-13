import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {animalLocalRetreatExit} from '../src/simulation/animal-local-retreat-exit.js';

const raw=gunzipSync(readFileSync(new URL('./fixtures/raid-retreat-day15.json.gz',import.meta.url))).toString('utf8');
const make=()=>{
 const state=deserialize(raw),profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 return {state,nav,animal:state.raid.animals.find(a=>a.status==='retreating')};
};
test('real day-15 buffalo walks to a physically clear exterior exit and ends the raid',()=>{
 const {state,nav,animal}=make(),original={x:animal.x,z:animal.z};
 assert.equal(nav.path(animal,animal.exit,animal.radius,null,false,32),null);
 const candidate=animalLocalRetreatExit(state,animal,nav);
 assert(candidate);assert(nav.walkable(candidate.x,candidate.z,animal.radius,null,false));
 assert(nav.segmentClear(animal,candidate,animal.radius,null,false));
 let moved=0;
 for(let i=0;i<30&&state.raid;i++){
  const before={x:animal.x,z:animal.z};Game.tick(state,1,nav);
  const distance=Math.hypot(animal.x-before.x,animal.z-before.z);
  if(distance>0){moved+=distance;assert(distance<=3.8+1e-6);assert(nav.segmentClear(before,animal,animal.radius,null,false));}
 }
 assert.equal(state.raid,null);assert.equal(state.day,16);assert(moved>=3.9);
 assert(Math.hypot(animal.x-original.x,animal.z-original.z)>=3.9);
});
test('chosen local retreat remains deterministic through a save and reload',()=>{
 const {state,nav,animal}=make();
 for(let i=0;i<20&&!animal.retreatExit;i++)Game.tick(state,1,nav);
 assert(animal.retreatExit);const chosen={...animal.retreatExit};
 const restored=deserialize(serialize(state));
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[restored.biome]}.json`,import.meta.url),'utf8')).profile;
 const freshNav=new Navigation(restored.seed,restored.biome,profile);freshNav.setState(restored);
 const savedActor=restored.raid.animals.find(a=>a.id===animal.id);assert.deepEqual(savedActor.retreatExit,chosen);
 for(let i=0;i<20&&restored.raid;i++)Game.tick(restored,1,freshNav);
 assert.equal(restored.raid,null);assert.equal(restored.day,16);
});
test('no alternate is fabricated when native swept clearance rejects every candidate',()=>{
 const animal={status:'retreating',x:10,z:0,radius:1};
 const state={plants:[{x:0,z:0,alive:true}],structures:[]};
 const nav={walkable:()=>true,segmentClear:()=>false};
 assert.equal(animalLocalRetreatExit(state,animal,nav),null);
});
