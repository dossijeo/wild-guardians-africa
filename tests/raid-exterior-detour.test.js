import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {prepareExteriorDetour,detourRaidFormation,EXTERIOR_DETOUR_LIMITS} from '../src/simulation/raid-exterior-detour.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';
const box=[-5,-5,5,5],start={x:0,z:0},end={x:0,z:55};
const witness=p=>p.z>54;
function fake(path){
 return {activeBounds:box,walkable:()=>true,segmentClear:()=>true,approachPath:(start,end)=>path??[{x:2,z:0},end]};
}
test('a positive detour is checked at real radius and never lends a larger footprint',()=>{
 const nav=fake(),radii=[];nav.segmentClear=(a,b,r,ignore,worker)=>{radii.push(r);assert.equal(ignore,null);assert.equal(worker,false);return true;};
 const proof=prepareExteriorDetour(start,1.1,box,nav,witness);assert(proof);assert(proof.witness({x:1,z:0},.9));assert(!proof.witness(start,1.2));assert(radii.includes(1.1));
});
test('a false or incomplete path cannot certify exterior connectivity',()=>{
 assert.equal(prepareExteriorDetour(start,1,box,fake([{x:0,z:1}]),witness),null);
 const nav=fake();nav.segmentClear=()=>false;assert.equal(prepareExteriorDetour(start,1,box,nav,witness),null);
 const blocked=fake();blocked.walkable=(x,z)=>x!==2;assert.equal(prepareExteriorDetour(start,1,box,blocked,witness),null);
});
test('a navigation epoch change invalidates the complete positive certificate',()=>{
 const nav=fake();nav.version=1;const proof=prepareExteriorDetour(start,1.1,box,nav,witness);
 assert(proof.witness(start,1));nav.version=2;assert(!proof.witness(start,1));
 assert.equal(detourRaidFormation(proof,[{radius:1}],box,nav),null);
});
test('a sealed component uses at most four searches and never accepts a partial horde',()=>{
 let searches=0;const nav=fake();nav.approachPath=()=>{searches++;return null;};
 assert.equal(prepareExteriorDetour(start,1,box,nav,()=>true),null);assert.equal(searches,EXTERIOR_DETOUR_LIMITS.paths);
 assert.equal(detourRaidFormation({radius:1,points:[start]},[{radius:1}],box,nav),null);
});
for(const kind of ['closed','mixed-cliff'])test(`the detour cannot cross a native ${kind} enclosure`,()=>{
 const {s,nav}=topologyFixture('closed');let point={x:0,z:0};
 if(kind==='mixed-cliff'){
  s.structures=s.structures.filter(t=>t.kind!=='wall'||t.z===-20);
  nav.field.slope=(x,z)=>((Math.abs(x)>19&&Math.abs(x)<22&&z>=-20&&z<=82)||(z>79&&z<82&&Math.abs(x)<=22))?.8:0;
  nav.setState(s);point={x:0,z:40};
 }
 nav.setActiveBounds([-120,-120,120,120]);assert(nav.walkable(point.x,point.z,1.1,null,false));
 assert.equal(prepareExteriorDetour(point,1.1,raidWallEnvelope(s,nav),nav,exteriorRaidWitness),null);
});
test('a route formation keeps all animals, spacing and clear retreat segments',()=>{
 const nav=fake(),proof={radius:1.1,points:Array.from({length:100},(_,z)=>({x:0,z}))},specs=Array.from({length:12},()=>({radius:1.1}));
 const entry=detourRaidFormation(proof,specs,box,nav);assert.equal(entry.entries.length,12);assert(entry.selectionBounds[3]>box[3]);
 for(let i=0;i<12;i++){assert(Math.hypot(entry.entries[i].x-entry.exits[i].x,entry.entries[i].z-entry.exits[i].z)>=3);for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>3.2);}
 const blocked=fake();blocked.segmentClear=()=>false;assert.equal(detourRaidFormation(proof,specs,box,blocked),null);
});
test('retained seed-2026 night10 admits all sixteen actors through a deterministic physical exterior route',()=>{
 const source='docs/qa/integrated-spiritual-survival/pilot-v26-empty-entry-diagnostic-v1.json',input=JSON.parse(readFileSync(source));
 const state=deserialize(gunzipSync(readFileSync(input.input)).toString()),before=serialize(state);
 const nav=new Navigation(state.seed,state.biome,JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile);
 nav.setState(state);nav.setActiveBounds(input.bounds);nav.setRaidView(input.view.eye,input.view.target);
 const group=state.nightPlan.group,specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const entry=chooseRaidEntry(state,specs,input.bounds,0,nav);assert(entry);assert.equal(entry.entries.length,16);assert.equal(serialize(state),before);
 const wallBox=raidWallEnvelope(state,nav),proof=prepareExteriorDetour(input.rows.find(r=>r.species.length===1&&r.species[0]==='warthog').cameraPoses[0].point,1.1,wallBox,nav,exteriorRaidWitness);
 assert(proof);
 for(let i=0;i<16;i++){
  for(const p of [entry.entries[i],entry.exits[i]]){assert(nav.walkable(p.x,p.z,specs[i].radius,null,false));assert(proof.witness(p,specs[i].radius));}
  assert(nav.segmentClear(entry.entries[i],entry.exits[i],specs[i].radius,null,false));
  for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>specs[i].radius+specs[j].radius+1);
 }
 assert.deepEqual(chooseRaidEntry(state,specs,input.bounds,0,nav),entry);assert.equal(serialize(state),before);
});
