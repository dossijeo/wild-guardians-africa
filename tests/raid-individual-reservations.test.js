import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,probe} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {reservedApproachClear,targetReservationKey} from '../src/simulation/raid-target-reservations.js';
import {RAID_WAIT_SECONDS} from '../src/simulation/raid-contention.js';
function tick(s,nav,dt=.1){s.elapsed+=dt;updateRaid(s,dt,nav);}
function start(layout='mono',count=12){const {s,nav}=fixture(layout);assert(spawnRaid(s,{group:Array(count).fill('warthog')},nav));updateRaid(s,0,nav);return {s,nav,raid:s.raid};}
function finish(s,nav){for(let i=0;i<4000&&s.raid;i++)tick(s,nav);assert.equal(s.raid,null);}
function independent(s){
 for(const a of s.raid.animals.filter(a=>a.targetId)){
  const target=s.plants.find(p=>p.id===a.targetId)??s.structures.find(t=>t.id===a.targetId);
  assert.equal(a.reservation,targetReservationKey(target,a));assert.equal(s.raid.reservations[a.reservation],a.id);
  assert(reservedApproachClear(s,a,a.approach));
  if(target.kind!=='center')assert.equal(s.raid.animals.filter(b=>b.targetId===a.targetId).length,1);
 }
}
for(const count of [1,2,5,12])test(`100 connected mijo plants allow independent attacks from ${count} animals`,()=>{
 const {s,raid}=start('mono',count);independent(s);assert.equal(raid.animals.filter(a=>a.targetId).length,count);
 const result=probe('mono',count,{duration:400});assert(result.raidEnded);
 assert.equal(result.budgetSpent,result.budgetInitial);assert.equal(result.animalsSpending,count);assert.equal(result.animalsRetreatingWithBudget,0);
});
test('centers permit physically independent simultaneous approach claims',()=>{
 const {s}=start('center-only');independent(s);assert(s.raid.animals.filter(a=>a.targetId).length>1);
 assert.equal(new Set(s.raid.animals.filter(a=>a.targetId).map(a=>a.targetId)).size,1);
});
test('individual claims and native RNG replay exactly after a save/reload',()=>{
 const {s,nav}=start();for(let i=0;i<30;i++)tick(s,nav);
 const copy=deserialize(serialize(s)),fresh=new Navigation(copy.seed,copy.biome,{});
 fresh.field=nav.field;fresh.propsAt=()=>[];fresh.setState(copy);fresh.setActiveBounds(nav.activeBounds);fresh.setRaidView(nav.raidView.eye,nav.raidView.target);
 for(let i=0;i<4000&&(s.raid||copy.raid);i++){tick(s,nav);tick(copy,fresh);assert.equal(serialize(s),serialize(copy));}
 assert.equal(s.raid,null);assert.equal(copy.raid,null);
});
test('destroying one reserved crop frees only that target and preserves other leases',()=>{
 const {s,nav,raid}=start('mono',5),owner=raid.animals[0],victim=s.plants.find(p=>p.id===owner.targetId),other=raid.animals[1],otherId=other.targetId;
 victim.alive=false;nav.setState(s);tick(s,nav,0);
 assert.notEqual(owner.targetId,victim.id);assert.equal(other.targetId,otherId);independent(s);finish(s,nav);
});
function saturated(){const {s,nav}=fixture('mono');s.plants=s.plants.slice(0,1);s.structures=[];nav.setState(s);assert(spawnRaid(s,{group:Array(12).fill('warthog')},nav));updateRaid(s,0,nav);return {s,nav,raid:s.raid};}
test('actual saturation stages valid waiters and retires after no-progress bound without spending hits',()=>{
 const {s,nav,raid}=saturated();assert.equal(raid.animals.filter(a=>a.targetId).length,1);assert.equal(raid.waitQueue.length,11);
 const budgets=raid.animals.map(a=>a.hitsRemaining);for(const a of raid.animals.filter(a=>a.status==='waiting')){assert.deepEqual({x:a.x,z:a.z},a.spawn);assert(nav.walkable(a.x,a.z,a.radius,null,false));}
 s.elapsed+=RAID_WAIT_SECONDS+.1;updateRaid(s,0,nav);
 assert.equal(raid.animals.filter(a=>a.status==='retreating').length,11);assert.deepEqual(raid.animals.map(a=>a.hitsRemaining),budgets);finish(s,nav);
});
test('legacy group saves migrate to individual claims without extra RNG draws',()=>{
 const {s,nav}=start('mono',2),a=s.raid.animals[0];s.raid.reservations={['crop:legacy-component']:a.id};a.reservation='crop:legacy-component';delete s.raid.targetReservationVersion;
 const copy=deserialize(serialize(s)),rng=s.rng;nav.setState(copy);updateRaid(copy,0,nav);
 assert.equal(copy.rng,rng);assert.equal(copy.raid.targetReservationVersion,2);assert(!copy.raid.reservations['crop:legacy-component']);independent(copy);
});
test('group accessibility uses a complete native component certificate and invalidates when walls open',()=>{
 const {s,nav}=fixture('closed-walls'),outside={x:16,z:30},inside={x:8,z:0};
 assert.equal(nav.approachPath(outside,inside,1.1,32),null);
 assert(nav.approachGroupBlocked(outside,s.plants,1.1,1.7));
 assert(nav.approachGroupBlocked({x:20,z:30},s.plants,1.1,1.7));
 assert.equal(nav.approachGroupBlocked(inside,s.plants,1.1,1.7),false);
 assert.equal(nav.approachGroupBlocked(outside,[...s.plants,{x:16,z:30}],1.1,1.7),false,'A geometrically connected zone crossing an obstacle cannot be rejected wholesale');
 for(const id of ['wall-2-4','wall-2-5']){const t=s.structures.find(t=>t.id===id);t.status='ruined';t.hp=0;}
 nav.setState(s);assert.equal(nav.approachGroupBlocked(outside,s.plants,1.1,1.7),false);
 assert(nav.approachPath(outside,inside,1.1,32));
});
test('a protected connected perimeter allows simultaneous attacks on separate pieces',()=>{
 const {s,raid}=start('closed-walls');independent(s);
 const walls=raid.animals.filter(a=>s.structures.some(t=>t.id===a.targetId&&t.kind==='wall'));
 assert(walls.length>1);assert.equal(new Set(walls.map(a=>a.targetId)).size,walls.length);
});
