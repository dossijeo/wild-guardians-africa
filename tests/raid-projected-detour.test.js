import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness,exteriorRaidEntry,PROJECTED_DETOUR_LIMIT} from '../src/simulation/raid-exterior-entry.js';
import {EXTERIOR_DETOUR_LIMITS} from '../src/simulation/raid-exterior-detour.js';
import {prepareExteriorDetour} from '../src/simulation/raid-exterior-detour.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const folder='docs/qa/integrated-spiritual-survival/pilot-v59-common-good-q9-breach-first-2026-fourteen';
function fixture(){
 const state=deserialize(gunzipSync(readFileSync(folder+'/partial-state.json.gz')).toString());
 const context=JSON.parse(JSON.parse(readFileSync(folder+'/partial.json')).entryTransport.waits.at(-1).key);
 const nav=new Navigation(state.seed,state.biome,JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile);
 nav.setState(state);nav.setActiveBounds(context[7]);nav.setRaidView(context[8].eye,context[8].target);
 return {state,nav,context,specs:context[6].map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}))};
}
test('retained night13 selects all sixteen bodies on a certified projected exterior lane without changing state',()=>{
 const {state,nav,context,specs}=fixture(),before=serialize(state);
 const entry=chooseRaidEntry(state,specs,context[7],0,nav);
 assert(entry);assert.equal(entry.entries.length,16);assert.equal(entry.exits.length,16);
 assert.equal(serialize(state),before);
 const box=raidWallEnvelope(state,nav),proof=prepareExteriorDetour(entry.entries[0],1.1,box,nav,exteriorRaidWitness);
 assert(proof);
 for(let i=0;i<specs.length;i++){
  const radius=specs[i].radius,birth=entry.entries[i],exit=entry.exits[i];
  assert(nav.walkable(birth.x,birth.z,radius,null,false));assert(nav.walkable(exit.x,exit.z,radius,null,false));
  assert(nav.segmentClear(birth,exit,radius,null,false));assert(proof.witness(birth,radius));assert(proof.witness(exit,radius));
  for(let j=0;j<i;j++)assert(Math.hypot(birth.x-entry.entries[j].x,birth.z-entry.entries[j].z)>radius+specs[j].radius+1);
 }
 const again=fixture();assert.deepEqual(chooseRaidEntry(again.state,again.specs,again.context[7],0,again.nav),entry);
});
test('failed projected proofs stay bounded and never accept a partial or uncertified wave',()=>{
 const state={structures:[{id:'wall',kind:'wall',x:0,z:0,hp:100,status:'intact'},{id:'center',kind:'center',x:0,z:0,hp:600,status:'intact'}],villages:[]};
 const before=JSON.stringify(state),bounds=[-20,-20,20,20];let paths=0;
 const nav={activeBounds:bounds,raidView:{eye:{x:0,z:0},target:{x:0,z:-1}},obstacles:[],walkable:()=>true,segmentClear:()=>false,approachPath:()=>{paths++;return null;}};
 const camera=(s,specs,b,n,v)=>specs.length===1?{entries:[{...v.eye}],exits:[{x:v.eye.x,z:v.eye.z+3}]}:null;
 assert.equal(exteriorRaidEntry(state,Array.from({length:16},()=>({radius:1.1})),bounds,0,nav,()=>null,camera),null);
 assert.equal(paths,(1+PROJECTED_DETOUR_LIMIT)*EXTERIOR_DETOUR_LIMITS.paths);
 assert.equal(JSON.stringify(state),before);
});
