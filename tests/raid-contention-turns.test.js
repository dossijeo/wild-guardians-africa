import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,probe} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';import {serialize,deserialize} from '../src/persistence/snapshots.js';import {Navigation} from '../src/world/navigation.js';import {RAID_WAIT_SECONDS} from '../src/simulation/raid-contention.js';import {actorBlockers,actorSegmentClear} from '../src/simulation/actor-motion.js';
function start(layout='mono',group=Array.from({length:12},()=> 'warthog')){const {s,nav}=fixture(layout);if(layout==='saturated'){s.plants=s.plants.slice(0,1);s.structures=[];nav.setState(s);}assert(spawnRaid(s,{group},nav));const raid=s.raid,budget=raid.animals.reduce((n,a)=>n+a.hitsRemaining,0);updateRaid(s,0,nav);return {s,nav,raid,budget};}
function tick(s,nav,dt){s.elapsed+=dt;updateRaid(s,dt,nav);}
function finish(s,nav,dt,max=400){for(let i=0;i<max/dt&&s.raid;i++)tick(s,nav,dt);assert.equal(s.raid,null);}
for(const dt of [.1,1])test(`a full connected crop cohort consumes real native budget at dt${dt}`,()=>{const r=probe('mono',12,{duration:400,dt});assert(r.raidEnded);assert.equal(r.budgetSpent,r.budgetInitial);assert.equal(r.animalsSpending,12);assert.equal(r.animalsRetreatingWithBudget,0);});
test('waiters stage at their certified separated births without stealing existing reservations',()=>{
 const {s,nav,raid}=start('saturated');assert.equal(raid.waitQueue.length,11);const claims=Object.entries(raid.reservations);assert.equal(claims.length,1);
 for(const a of raid.animals.filter(a=>a.status==='waiting')){assert.deepEqual({x:a.x,z:a.z},a.spawn);assert(nav.walkable(a.x,a.z,a.radius,null,false));assert(actorSegmentClear(a,a,a,actorBlockers(s,a,false)));assert.equal(a.targetId,null);assert.equal(a.reservation,null);}
 const original=[...raid.waitQueue];tick(s,nav,.1);assert.deepEqual(raid.waitQueue,original);assert.deepEqual(Object.entries(raid.reservations),claims);
});
test('FIFO save/reload preserves turns and complete native final consumption',()=>{
 let {s,nav,budget}=start();for(let i=0;i<30;i++)tick(s,nav,.1);const queue=[...s.raid.waitQueue],rng=s.rng,text=serialize(s);s=deserialize(text);assert.deepEqual(s.raid.waitQueue,queue);assert.equal(s.rng,rng);
 const next=new Navigation(s.seed,s.biome,{});next.field=nav.field;next.propsAt=()=>[];next.setState(s);next.setActiveBounds(nav.activeBounds);next.setRaidView(nav.raidView.eye,nav.raidView.target);nav=next;const raid=s.raid;finish(s,nav,.1);assert.equal(raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),0);assert(budget>0);
});
test('absence of all remaining native targets retires instead of waiting forever',()=>{const {s,nav,raid}=start();s.structures=[];for(const p of s.plants)p.alive=false;nav.setState(s);finish(s,nav,.1);assert(raid.animals.every(a=>a.hitsRemaining>0));});
test('a physically unreachable owner expires its queue after bounded no-hit time without spending budget',()=>{
 const {s,nav,raid}=start('saturated');const queue=[...raid.waitQueue],budgets=raid.animals.map(a=>a.hitsRemaining);
 // Hold the real owners by not advancing any attack/movement; only inspect
 // native no-progress guard after a simulated pause beyond its explicit limit.
 s.elapsed=RAID_WAIT_SECONDS+.1;updateRaid(s,0,nav);assert(queue.every(id=>raid.animals.find(a=>a.id===id).status==='retreating'));assert.deepEqual(raid.animals.map(a=>a.hitsRemaining),budgets);
});
test('corrupt optional queue state is rejected while legacy saves remain compatible',()=>{
 const {s}=start('saturated');const text=serialize(s);for(const corrupt of [v=>v.raid.waitQueue.push(v.raid.waitQueue[0]),v=>v.raid.waitQueue[0]='missing',v=>v.raid.animals.find(a=>a.raidWait).raidWait.since=1e9,v=>v.raid.waitProgress.budget=-1]){const v=JSON.parse(text);corrupt(v);assert.throws(()=>serialize(v));}
 const old=JSON.parse(text);for(const a of old.raid.animals)if(a.status==='waiting'){a.status='walking';delete a.raidWait;}delete old.raid.waitQueue;delete old.raid.waitProgress;assert.doesNotThrow(()=>serialize(old));
});
for(const group of [['hyena','buffalo','lion','rhino','warthog'],Array.from({length:8},()=> 'buffalo')])test(`mixed models/radii and native budgets preserve exclusive leases: ${group.join(',')}`,()=>{
 const {s,nav,raid}=start('mono',group);let checked=0;for(let i=0;i<4000&&s.raid;i++){tick(s,nav,.1);const owners=Object.values(raid.reservations);assert.equal(owners.length,new Set(owners).size);for(const a of raid.animals)if(a.status==='waiting'){assert.equal(a.targetId,null);checked++;}}
 assert.equal(s.raid,null);assert(raid.animals.some(a=>a.hitsRemaining===0));assert.equal(raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),0);
});
test('Shield still consumes actual native hits while protecting crops and releasing turns',()=>{
 const {s,nav}=fixture('mono');s.spells=[{id:'shield',kind:'shield',x:15,z:7,radius:100,remaining:999}];nav.setState(s);assert(spawnRaid(s,{group:Array.from({length:5},()=> 'warthog')},nav));const raid=s.raid;updateRaid(s,0,nav);finish(s,nav,.1);assert.equal(raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),0);assert.equal(s.events.filter(e=>e.type==='CropHit').length,0);assert.equal(s.plants.filter(p=>p.alive).length,100);
});
test('connected walls retain individual piece leases and collapse releases eligible attacks',()=>{const r=probe('connected-walls',12,{duration:400});assert(r.raidEnded);assert.equal(r.budgetSpent,r.budgetInitial);assert.equal(r.defensiveGroups.length,2);});

import {occupiedEligibleGroup} from '../src/simulation/raid-contention.js';
import {animalPose} from '../src/rendering/animal-actions.js';
test('a just-exhausted owner still holds a temporary lease until native release on the next tick',()=>{
 const {s,raid}=start('saturated');const owner=raid.animals.find(a=>a.targetId&&a.reservation.startsWith('crop:')),waiter=raid.animals.find(a=>a.status==='waiting');owner.hitsRemaining=0;owner.status='walking';assert(occupiedEligibleGroup(s,waiter,p=>p.alive));
});
test('waiting poses do not keep walking in place at an exterior staging birth',()=>{const {raid}=start('saturated');const a=raid.animals.find(a=>a.status==='waiting');assert.equal(animalPose(a,100).time,0);});
test('two contiguous crop species retain individually reserved plants through native attacks',()=>{
 const {s,nav}=fixture('mono');for(let i=50;i<100;i++)s.plants[i].species='maiz';nav.setState(s);assert(spawnRaid(s,{group:Array.from({length:12},()=> 'warthog')},nav));const raid=s.raid;updateRaid(s,0,nav);assert.equal(Object.keys(raid.reservations).filter(id=>id.startsWith('crop:')).length,12);finish(s,nav,.1);assert.equal(raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),0);
});
test('native first-five introduction protection survives a queued cohort without destroying all crops',()=>{
 const {s,nav}=fixture('mono');s.day=1;s.plants=s.plants.slice(0,5);nav.setState(s);assert(spawnRaid(s,{group:Array.from({length:5},()=> 'warthog'),introductory:true},nav));const raid=s.raid;updateRaid(s,0,nav);finish(s,nav,.1);assert(s.plants.some(p=>p.alive));assert(raid.introCropsDestroyed<=raid.introCropLimit);
});
test('wall collapse and an existing open gate release claims without inventing an extra lease',()=>{
 const {s,nav}=fixture('closed-walls');s.structures.find(t=>t.kind==='wall').gate=true;assert(spawnRaid(s,{group:Array.from({length:8},()=> 'warthog')},nav));const raid=s.raid;updateRaid(s,0,nav);const claimed=raid.animals.find(a=>a.targetId?.startsWith('wall-'));assert(claimed);const wall=s.structures.find(t=>t.id===claimed.targetId);wall.hp=0;wall.status='collapsing';nav.setState(s);finish(s,nav,.1);assert.equal(raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),0);assert.equal(s.structures.filter(t=>t.gate).length,1);
});

test('an isolated FIFO head cannot indefinitely starve a later animal with native access',()=>{
 const {s,nav}=fixture('mono');s.plants=s.plants.slice(0,10);for(const p of s.plants)p.x-=40;
 nav.field.slope=(x,z)=>Math.abs(x)<1?.8:0;nav.setState(s);
 const entry={entries:[{x:-24,z:35},{x:-28,z:36},{x:24,z:40},{x:-32,z:40}],exits:[{x:-24,z:38},{x:-28,z:39},{x:24,z:43},{x:-32,z:43}]};
 for(const p of [...entry.entries,...entry.exits])assert(nav.walkable(p.x,p.z,1.1,null,false));
 nav.preparedRaidEntry=()=>({entry});assert(spawnRaid(s,{group:Array.from({length:4},()=> 'warthog')},nav));const raid=s.raid,head=raid.animals[2],next=raid.animals[3],headBudget=head.hitsRemaining,nextBudget=next.hitsRemaining;
 updateRaid(s,0,nav);assert.ok(!raid.waitQueue.includes(next.id));assert.ok(next.targetId);assert.equal(nav.segmentClear(head,s.plants[0],head.radius,null,false),false);
 finish(s,nav,.1,400);assert.equal(head.hitsRemaining,headBudget);assert.equal(next.hitsRemaining,0);assert(nextBudget>0);
});

import {waitEpoch} from '../src/simulation/raid-contention.js';
test('head retry epochs never enumerate a dense farm and observe lease/topology/progress revisions',()=>{
 const {s,nav}=start('saturated');const old=waitEpoch(s,nav);Object.defineProperty(s,'plants',{get(){throw Error('Unexpected dense farm scan');}});Object.defineProperty(s,'structures',{get(){throw Error('Unexpected structure scan');}});assert.equal(waitEpoch(s,nav),old);
 s.raid.waitRevision++;assert.notEqual(waitEpoch(s,nav),old);const lease=waitEpoch(s,nav);nav.version++;assert.notEqual(waitEpoch(s,nav),lease);const topology=waitEpoch(s,nav);s.raid.waitProgress.at++;assert.notEqual(waitEpoch(s,nav),topology);
});
