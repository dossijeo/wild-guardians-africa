import test from 'node:test';import assert from 'node:assert/strict';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';
import {chooseRaidEntry,spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {raidEntryChunks,raidResidentDemand,includeRaidBounds} from '../src/world/raid-entry-residency.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';import {nextRandom} from '../src/simulation/rules.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';import {Navigation} from '../src/world/navigation.js';
const group=['warthog','hyena','buffalo','lion','rhino'],specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
for(const shape of ['closed','open','gate','separate','concave','no-walls','clipped-bounds'])test(`whole group exterior native entry: ${shape}`,()=>{const {s,nav}=topologyFixture(shape),before=serialize(s),view=JSON.stringify(nav.raidView),entry=chooseRaidEntry(s,specs,nav.activeBounds,0,nav);assert(entry);assert.equal(serialize(s),before);assert.equal(JSON.stringify(nav.raidView),view);const box=raidWallEnvelope(s,nav);for(let i=0;i<specs.length;i++){assert(nav.walkable(entry.entries[i].x,entry.entries[i].z,specs[i].radius,null,false));assert(exteriorRaidWitness(entry.entries[i],specs[i].radius,box,nav));assert(exteriorRaidWitness(entry.exits[i],specs[i].radius,box,nav));for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>specs[i].radius+specs[j].radius+1);}});
for(const scale of [1,8])test(`closed ${40*scale}m enclosure starts physically outside then hits a wall`,()=>{const {s,nav}=topologyFixture('closed');for(const w of s.structures)if(w.kind==='wall'){w.x*=scale;w.z*=scale;w.baseScaleX=scale;}nav.setState(s);nav.setActiveBounds([-18,-18,18,18]);spawnRaid(s,{group:['warthog']},nav);assert(s.raid);const a=s.raid.animals[0];assert(Math.abs(a.x)>20*scale||Math.abs(a.z)>20*scale);assert(nav.walkable(a.x,a.z,a.radius,null,false));for(let i=0;i<1200&&!s.events.some(e=>e.type==='StructureHit');i++){s.elapsed+=.05;updateRaid(s,.05,nav);}const hit=s.events.find(e=>e.type==='StructureHit');assert(hit);assert.equal(s.structures.find(t=>t.id===hit.targetId).kind,'wall');assert(!s.events.some(e=>e.type==='CropHit'));});
test('residency handshake preserves pending night/RNG and reload creates exactly one complete group',()=>{const {s,nav}=topologyFixture('closed');s.plants=[];s.time=599.9;s.nightPlan={at:400,group:[...group],done:false};const rng=s.rng,money=structuredClone(s.ledger),completed=s.completedNights;nav.raidEntryResident=()=>false;Game.tick(s,.2,nav);assert(Game.nightEntryPending(s));assert.equal(s.time,600);assert.equal(s.nightPlan.done,false);assert.equal(s.completedNights,completed);assert.equal(s.rng,rng);assert.equal(s.raid,null);assert.deepEqual(s.ledger,money);const saved=deserialize(serialize(s)),next=new Navigation(saved.seed,saved.biome,{});next.field=nav.field;next.propsAt=()=>[];next.setState(saved);next.setActiveBounds(nav.activeBounds);next.setRaidView(nav.raidView.eye,nav.raidView.target);next.raidEntryResident=()=>true;Game.tick(saved,.1,next);assert.equal(saved.nightPlan.done,true);assert.equal(saved.raid.animals.length,group.length);assert.equal(saved.events.filter(e=>e.type==='RaidSpawned').length,1);const expected={rng};for(let i=0;i<6;i++)nextRandom(expected);assert.equal(saved.rng,expected.rng);});
test('worker preparation uses the same exterior choice without changing state or RNG',()=>{const {s,nav}=createOpeningWorld({seed:712});const center=s.structures[0];s.time=400;s.initialPreparation=false;s.nightPlan={at:400,group:[...group],done:false};nav.setActiveBounds([center.x-120,center.z-120,center.x+120,center.z+120]);nav.setRaidView({x:center.x+16,z:center.z+20},center);const before=serialize(s);let request;const worker={postMessage(data){request=data;},terminate(){}},preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);const reply=computeRaidEntry(request);assert(reply.entry);worker.onmessage({data:reply});assert.equal(serialize(s),before);assert(nav.pendingRaidEntry);spawnRaid(s,s.nightPlan,nav);assert(s.raid);assert.equal(preparer.stats.used,1);preparer.dispose();assert.equal(nav.pendingRaidEntry,null);});
test('expanded bounds have sparse finite chunk demand and release when raid disappears',()=>{const {s,nav}=topologyFixture('closed');for(const w of s.structures)if(w.kind==='wall'){w.x*=8;w.z*=8;w.baseScaleX=8;}nav.setState(s);const entry=chooseRaidEntry(s,specs,[-18,-18,18,18],0,nav);assert(entry);const keys=raidEntryChunks(entry,specs.map(s=>s.radius));assert(keys.size<=group.length*8);nav.raidEntryDemand={entry,radii:specs.map(s=>s.radius)};assert.deepEqual(raidResidentDemand(s,nav),keys);const bounds=includeRaidBounds([-18,-18,18,18],keys);assert(bounds[3]>18||bounds[2]>18||bounds[0]<-18||bounds[1]<-18);delete nav.raidEntryDemand;assert.equal(raidResidentDemand(s,nav).size,0);});

for(const biome of Game.BIOMES)test(`native ${biome} opening: whole group keeps genuine terrain and fluid legality`,()=>{const {s,nav}=createOpeningWorld({seed:712,biome}),center=s.structures[0];nav.setActiveBounds([center.x-120,center.z-120,center.x+120,center.z+120]);nav.setRaidView({x:center.x+16,z:center.z+20},center);const entry=chooseRaidEntry(s,specs,nav.activeBounds,0,nav);assert(entry);for(let i=0;i<specs.length;i++)for(const p of [entry.entries[i],entry.exits[i]])assert(nav.walkable(p.x,p.z,specs[i].radius,null,false));});

for(const count of [32,72])test(`a whole ${count} cohort is neither thinned nor rerolled when a single near-camera lane cannot fit`,()=>{const {s,nav}=topologyFixture('closed'),many=Array.from({length:count},()=>specs[0]),entry=chooseRaidEntry(s,many,nav.activeBounds,0,nav);assert(entry);assert.equal(entry.entries.length,count);const box=raidWallEnvelope(s,nav);for(let i=0;i<count;i++){assert(nav.walkable(entry.entries[i].x,entry.entries[i].z,many[i].radius,null,false));assert(exteriorRaidWitness(entry.entries[i],many[i].radius,box,nav));for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>3.2);}});

test('a wall closing a natural cliff pocket cannot admit births in its enclosed interior beyond the wall AABB',()=>{const {s,nav}=topologyFixture('closed');s.structures=s.structures.filter(t=>t.kind!=='wall'||t.z===-20);nav.field.slope=(x,z)=>((Math.abs(x)>19&&Math.abs(x)<22&&z>=-20&&z<=82)||(z>79&&z<82&&Math.abs(x)<=22))?.8:0;nav.setState(s);nav.setActiveBounds([-120,-120,120,120]);const entry=chooseRaidEntry(s,[specs[0]],nav.activeBounds,0,nav);assert(entry);const p=entry.entries[0];assert(!(Math.abs(p.x)<19&&p.z>-20&&p.z<79),'Birth must be outside the wall plus real cliff pocket');assert(nav.walkable(p.x,p.z,specs[0].radius,null,false));});


test('failed whole-group selection is memoized, reports once and retries after native obstacle epoch changes',()=>{
 const {s,nav}=topologyFixture('closed'),walkable=nav.walkable,segment=nav.segmentClear;
 let checks=0;nav.walkable=()=>{checks++;return false;};nav.segmentClear=()=>false;
 const plan={group:[...group]},rng=s.rng,id=s.nextId;
 assert.equal(spawnRaid(s,plan,nav),false);const initialChecks=checks;assert(initialChecks>0);
 assert.equal(spawnRaid(s,plan,nav),false);assert.equal(checks,initialChecks);
 assert.equal(s.messages.filter(m=>m.text.includes('incursión espera')).length,1);
 assert.equal(s.rng,rng);assert.equal(s.nextId,id);assert.equal(s.raid,null);
 nav.walkable=walkable;nav.segmentClear=segment;nav.setState(s);
 assert.equal(spawnRaid(s,plan,nav),true);assert.equal(s.raid.animals.length,group.length);
});

test('view invalidation replaces prior sparse demand before whole-group residency can commit',()=>{
 const {s,nav}=topologyFixture('closed');nav.raidEntryResident=()=>false;
 const plan={group:[...group]},rng=s.rng;
 assert.equal(spawnRaid(s,plan,nav),false);const old=nav.raidEntryDemand;
 nav.setRaidView({x:-30,z:4},{x:0,z:0});assert.equal(spawnRaid(s,plan,nav),false);
 assert.notEqual(nav.raidEntryDemand.key,old.key);assert.equal(s.rng,rng);assert.equal(s.raid,null);
 nav.raidEntryResident=()=>true;assert.equal(spawnRaid(s,plan,nav),true);
 assert.equal(nav.raidEntryDemand,undefined);assert.equal(s.raid.animals.length,group.length);
});
