import test from 'node:test';
import assert from 'node:assert/strict';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
const group=['warthog','hyena','buffalo','lion','rhino'];
function fakeWorker(){return {requests:[],postMessage(data){this.requests.push(data);},terminate(){this.terminated=true;}};}
function prepareFixture(){
 const {s,nav}=createOpeningWorld();s.nightPlan={at:400,group,done:false};
 nav.setActiveBounds([-48,-48,192,144]);nav.setRaidView({x:110,z:20},s.structures[0]);
 const worker=fakeWorker(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);
 return {s,nav,worker,preparer};
}
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: prepared native entry preserves the entire original post-spawn state`,()=>{
 const {s,nav}=createOpeningWorld({biome});s.nightPlan={at:400,group,done:false};
 const center=s.structures[0];nav.setActiveBounds([center.x-120,center.z-120,center.x+120,center.z+120]);nav.setRaidView({x:center.x+16,z:center.z+20},center);
 const original=serialize(s),worker=fakeWorker(),preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);
 worker.onmessage({data:computeRaidEntry(worker.requests[0])});assert.equal(serialize(s),original,'Preparation must not change the game, RNG or routes');
 const reference=deserialize(original),referenceNav=new Navigation(s.seed,s.biome,nav.profile);referenceNav.setState(reference);referenceNav.setActiveBounds(nav.activeBounds);referenceNav.setRaidView(nav.raidView.eye,nav.raidView.target);
 spawnRaid(reference,{group},referenceNav);spawnRaid(s,{group},nav);
 assert.equal(serialize(s),serialize(reference));assert.equal(preparer.stats.used,1);preparer.dispose();assert.equal(nav.preparedRaidEntry,undefined);
});
for(const change of ['camera','bounds','geometry','group','collapse','rng'])test(`${change}: obsolete worker replies cannot supply an entry`,()=>{
 const {s,nav,worker,preparer}=prepareFixture(),request=worker.requests[0];
 if(change==='camera')nav.setRaidView({x:111,z:20},s.structures[0]);
 if(change==='bounds')nav.setActiveBounds([-48,-48,240,144]);
 if(change==='geometry')nav.setState(s);
 if(change==='group')s.nightPlan.group=['warthog'];
 if(change==='collapse')s.structures[0].status='collapsing';
 if(change==='rng')s.rng++;
 worker.onmessage({data:{key:request.key,token:request.token,entry:{entries:[],exits:[]}}});
 assert.equal(preparer.ready,undefined);assert.equal(preparer.stats.obsolete,1);
 assert.equal(nav.preparedRaidEntry(s,s.nightPlan.group,nav.activeBounds),undefined);
 preparer.update(s);assert.equal(worker.requests.length,2);preparer.dispose();
});
test('a reply accepted before the camera moves is also rejected at the actual spawn',()=>{
 const {s,nav,worker,preparer}=prepareFixture(),request=worker.requests[0];worker.onmessage({data:{...request,entry:null}});
 nav.setRaidView({x:115,z:20},s.structures[0]);assert.equal(nav.preparedRaidEntry(s,group,nav.activeBounds),undefined);preparer.dispose();
});
test('preparation bounds outstanding work, reports failure, and never survives disposal',()=>{
 const {s,nav,worker,preparer}=prepareFixture();for(let i=0;i<20;i++)preparer.update(s);assert.equal(worker.requests.length,1);
 const request=worker.requests[0];preparer.dispose();worker.onmessage({data:{...request,entry:null}});assert.equal(preparer.ready,null);assert.equal(preparer.stats.accepted,0);assert.equal(worker.terminated,true);
 const unavailable=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('worker unavailable');}});unavailable.update(s);assert.equal(unavailable.stats.failed,1);assert.equal(nav.preparedRaidEntry(s,group,nav.activeBounds),undefined);unavailable.dispose();
});
test('prepared camera failure still uses the original boundary fallback and RNG',()=>{
 const {s,nav,worker,preparer}=prepareFixture();nav.setRaidView(s.structures[0],s.structures[0]);
 worker.onmessage({data:{...worker.requests[0],entry:null}});preparer.update(s);
 const reply=computeRaidEntry(worker.requests[1]);assert.ok(reply.entry);worker.onmessage({data:reply});
 const reference=deserialize(serialize(s)),referenceNav=new Navigation(s.seed,s.biome,nav.profile);referenceNav.setState(reference);referenceNav.setActiveBounds(nav.activeBounds);referenceNav.setRaidView(nav.raidView.eye,nav.raidView.target);
 spawnRaid(reference,{group},referenceNav);spawnRaid(s,{group},nav);
 assert.ok(s.raid);assert.equal(preparer.stats.used,1);assert.equal(serialize(s),serialize(reference));preparer.dispose();
});
