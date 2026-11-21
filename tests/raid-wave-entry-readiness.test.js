import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {activeRaidEntryPlan,eligiblePendingRaidWavePlan,raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {raidEntryChunks,raidResidentDemand} from '../src/world/raid-entry-residency.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {readFileSync} from 'node:fs';
import {Navigation} from '../src/world/navigation.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
function fakeWorker(){return {requests:[],postMessage(request){this.requests.push(request);},terminate(){this.terminated=true;}};}
function fixture(group=['warthog','hyena','buffalo','lion','rhino']){
 const {s,nav}=createOpeningWorld({slotId:'wave-readiness'}),center=s.structures[0];
 nav.setActiveBounds([center.x-120,center.z-120,center.x+120,center.z+120]);nav.setRaidView({x:center.x+16,z:center.z+20},center);
 s.raid={id:'fixture-raid',animals:[{id:'previous-actor',species:'warthog',status:'gone',x:center.x+10,z:center.z+10,radius:1.1,hitsRemaining:0,spawn:{x:center.x+10,z:center.z+10},exit:{x:center.x+10,z:center.z+10}}],reservations:{},pendingWavePlan:{index:1,at:400,done:false,group:[...group],actors:group.map(species=>({species,hits:2}))}};
 s.nightPlan={at:323,group:['rhino'],done:true};s.dayPlan={at:200,group:['hyena'],done:false};
 const worker=fakeWorker(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});return {s,nav,worker,preparer};
}
test('only all-gone previous actors permit valid1..16 next-wave preparation',()=>{
 const {s,nav,worker,preparer}=fixture();
 for(const status of ['entering','walking','attacking','retreating']){s.raid.animals[0].status=status;preparer.update(s);assert.equal(activeRaidEntryPlan(s),null);assert.equal(worker.requests.length,0);assert.equal(raidEntryKey(s,nav,s.raid.pendingWavePlan.group),null);}
 s.raid.animals[0].status='gone';const before=serialize(s);preparer.update(s);assert.equal(worker.requests.length,1);assert.equal(activeRaidEntryPlan(s),s.raid.pendingWavePlan);assert.equal(serialize(s),before);preparer.dispose();
});
test('malformed/finished waves do not escape active raid veto',()=>{
 for(const mutate of [p=>p.index=0,p=>p.index=-1,p=>p.done=true,p=>p.at=NaN,p=>p.group=[],p=>p.group=Array(17).fill('warthog'),p=>p.group[0]='unknown',p=>p.actors=[],p=>p.actors[0].species='rhino']){
  const {s,worker,preparer}=fixture();mutate(s.raid.pendingWavePlan);assert.equal(eligiblePendingRaidWavePlan(s),null);preparer.update(s);assert.equal(worker.requests.length,0);preparer.dispose();
 }
});
test('request copies current workers/incapacitation and wave owner without former raid actors',()=>{
 const {s,nav,worker,preparer}=fixture();const center=s.structures[0];
 s.workers=[{id:'fixture-worker',profile:'olderFemale',personId:'fixture-person',x:center.x+8,z:center.z+8,status:'incapacitated',incapacitated:true}];
 const before=serialize(s);preparer.update(s);const request=worker.requests[0];
 assert.deepEqual(request.waveContext,{raidId:'fixture-raid',index:1});assert.equal(request.state.raid,undefined);assert.deepEqual(request.state.workers,[{id:'fixture-worker',x:center.x+8,z:center.z+8,status:'incapacitated',incapacitated:true}]);
 request.state.workers[0].x+=1;assert.equal(serialize(s),before);preparer.dispose();
});
test('native complete16-actor prepared entry remains exterior/legal and keeps exact state/RNG through reload',()=>{
 const {s,nav,worker,preparer}=fixture(Array(16).fill('warthog'));const before=serialize(s),rng=s.rng;preparer.update(s);
 const request=worker.requests[0],reply=computeRaidEntry(request);assert.ok(reply.entry,'Native whole16 entry must exist');assert.equal(reply.entry.entries.length,16);assert.equal(reply.entry.exits.length,16);
 const radius=ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius;
 for(let i=0;i<16;i++){
  const a=reply.entry.entries[i],exit=reply.entry.exits[i];assert.ok(nav.walkable(a.x,a.z,radius,null,false));assert.ok(nav.walkable(exit.x,exit.z,radius,null,false));assert.ok(nav.segmentClear(a,exit,radius,null,false));assert.ok(nav.segmentClear(exit,a,radius,null,false));
  for(let j=0;j<i;j++)assert.ok(Math.hypot(a.x-reply.entry.entries[j].x,a.z-reply.entry.entries[j].z)>radius*2+1);
 }
 worker.onmessage({data:reply});assert.equal(preparer.stats.accepted,1);assert.equal(nav.preparedRaidEntry(s,s.raid.pendingWavePlan.group,nav.activeBounds),reply);assert.equal(serialize(s),before);assert.equal(s.rng,rng);
 const loaded=deserialize(before);assert.equal(raidEntryKey(loaded,nav,loaded.raid.pendingWavePlan.group),raidEntryKey(s,nav,s.raid.pendingWavePlan.group));assert.deepEqual(loaded.raid.pendingWavePlan,s.raid.pendingWavePlan);
 const radii=Array(16).fill(radius);assert.deepEqual(raidResidentDemand(s,nav),raidEntryChunks(reply.entry,radii));preparer.dispose();assert.equal(raidResidentDemand(s,nav).size,0);
});
test('retained paid closed enclosure prepares an exterior mixed next wave from its inside camera',()=>{
 const retained=JSON.parse(readFileSync(new URL('../docs/qa/paid-enclosure-entry-risk/native-original/paid-enclosure-entry-04.json',import.meta.url),'utf8'));
 const s=deserialize(JSON.stringify(retained.snapshot)),group=['warthog','hyena','buffalo','lion','rhino'];
 assert.deepEqual(retained.paid,{centre:800,crop:5,walls:170,hire:30,balance:495});
 s.raid={id:'retained-wave',animals:[],pendingWavePlan:{index:1,group,actors:group.map(species=>({species,hits:2})),done:false,at:400}};
 const nav=new Navigation(s.seed,s.biome,createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture}).nav.profile);nav.setState(s);const view=retained.results.find(r=>r.id==='inside-crop-target');nav.setActiveBounds(view.activeBounds);nav.setRaidView(view.eye,view.viewTarget);
 const worker=fakeWorker(),p=new RaidEntryPreparer(nav,{createWorker:()=>worker}),before=serialize(s);p.update(s);const reply=computeRaidEntry(worker.requests[0]);assert.ok(reply.entry);assert.equal(reply.entry.entries.length,5);
 const box=raidWallEnvelope(s,nav);assert.ok(box);assert.ok(exteriorGroupWitness(reply.entry,group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius})),box,nav,exteriorRaidWitness));
 for(let i=0;i<group.length;i++){const r=ANIMAL_ACTIONS.animals[group[i]].presentation.footprint.radius,a=reply.entry.entries[i],exit=reply.entry.exits[i];assert.ok(nav.walkable(a.x,a.z,r,null,false));assert.ok(nav.walkable(exit.x,exit.z,r,null,false));assert.ok(nav.segmentClear(a,exit,r,null,false));assert.ok(nav.segmentClear(exit,a,r,null,false));}
 worker.onmessage({data:reply});assert.equal(p.stats.accepted,1);assert.equal(serialize(s),before);p.dispose();
});
for(const change of ['wave-index','raid-id','camera','topology','bounds','rng','worker','worker-position','worker-incap','finished','active-actor'])test(`${change}: stale wave reply cannot install or be taken`,()=>{
 const {s,nav,worker,preparer}=fixture(['warthog']);preparer.update(s);const request=worker.requests[0];
 if(change==='wave-index')s.raid.pendingWavePlan.index++;
 if(change==='raid-id')s.raid.id+='-next';
 if(change==='camera')nav.setRaidView({x:nav.raidView.eye.x+1,z:nav.raidView.eye.z},nav.raidView.target);
 if(change==='topology')nav.setState(s);
 if(change==='bounds')nav.setActiveBounds([...nav.activeBounds.slice(0,3),nav.activeBounds[3]+48]);
 if(change==='rng')s.rng++;
 if(change==='worker')s.workers.push({id:'blocker',x:0,z:0,status:'fleeing',incapacitated:false});
 if(change==='worker-position'||change==='worker-incap'){s.workers.push({id:'blocker',x:0,z:0,status:'working',incapacitated:false});worker.onmessage({data:{key:request.key,token:request.token,entry:null}});preparer.update(s);const current=worker.requests.at(-1);if(change==='worker-position')s.workers[0].x++;else s.workers[0].incapacitated=true;worker.onmessage({data:{key:current.key,token:current.token,entry:null}});assert.equal(preparer.stats.obsolete,2);assert.equal(preparer.ready,undefined);preparer.dispose();return;}
 if(change==='finished')s.raid.pendingWavePlan.done=true;
 if(change==='active-actor')s.raid.animals[0].status='retreating';
 worker.onmessage({data:{key:request.key,token:request.token,entry:null}});assert.equal(preparer.stats.obsolete,1);assert.equal(preparer.ready,undefined);assert.equal(nav.preparedRaidEntry(s,s.raid.pendingWavePlan.group,nav.activeBounds),undefined);preparer.dispose();
});
test('accepted wave cannot leak through changed identity and disposal rejects delayed reply',()=>{
 const {s,nav,worker,preparer}=fixture(['warthog']);preparer.update(s);const request=worker.requests[0];worker.onmessage({data:{...request,entry:null}});
 s.raid.pendingWavePlan.index++;assert.equal(nav.preparedRaidEntry(s,s.raid.pendingWavePlan.group,nav.activeBounds),undefined);
 preparer.update(s);const newer=worker.requests.at(-1);preparer.dispose();worker.onmessage({data:{...newer,entry:null}});assert.equal(preparer.ready,null);assert.equal(worker.terminated,true);assert.equal(nav.preparedRaidEntry,undefined);
});
test('result/postgame remove readiness; ordinary no-raid key stays byte-identical',()=>{
 const {s,nav,worker,preparer}=fixture(['warthog']);s.result='victory';preparer.update(s);assert.equal(worker.requests.length,0);s.result=null;s.postgame=true;preparer.update(s);assert.equal(worker.requests.length,0);preparer.dispose();
 s.postgame=false;s.raid=null;const group=['warthog'];const structures=s.structures.map(c=>[c.id,c.status,c.hp>0]);
 assert.equal(raidEntryKey(s,nav,group),JSON.stringify([s.seed,s.biome,s.culture,s.terrainVersion,s.rng,nav.version,group,nav.activeBounds,nav.raidView,structures]));
});
