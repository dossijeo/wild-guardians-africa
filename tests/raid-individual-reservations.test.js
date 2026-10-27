import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,probe} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {emit} from '../src/simulation/game.js';
import {reconcileTargetReservations,reservedApproachClear,targetReservationKey} from '../src/simulation/raid-target-reservations.js';
import {activeCrops} from '../src/simulation/active-crops.js';
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
test('a conflicting lease cannot erase a strike already committed to its damage frame',()=>{
 const {s,nav,raid}=start('center-only',2),[first,second]=raid.animals;
 assert.equal(first.targetId,second.targetId);
 second.approach={...first.approach};second.status='attacking';
 second.attackRemaining=.45;second.attackId='attack-committed-qa';
 second.animation='Right_Hand_Sword_Slash';second.hitApplied=false;
 const targetId=second.targetId,budget=second.hitsRemaining;
 reconcileTargetReservations(s,(state,animal)=>{
  animal.targetId=null;animal.reservation=null;animal.path=null;animal.approach=null;
 });
 assert.equal(second.status,'attacking');
 assert.equal(second.attackRemaining,.45);
 assert.equal(second.attackId,'attack-committed-qa');
 assert.equal(second.targetId,targetId);
 assert.equal(second.hitsRemaining,budget);
 assert.equal(second.reservation,null,'a conflicting claim is released until the clip ends');
 assert.equal(raid.reservations[first.reservation],first.id);
 tick(s,nav,.44);
 assert.equal(second.hitsRemaining,budget);
 assert(!s.events.some(event=>event.attackId==='attack-committed-qa'));
 tick(s,nav,.01);
 assert.equal(second.hitsRemaining,budget-1);
 assert.equal(s.events.filter(event=>event.attackId==='attack-committed-qa'&&
  ['AnimalLogicalHit','AnimalLogicalMiss'].includes(event.type)).length,1);
});
test('a destroyed reserved crop releases its lease without redirecting a committed strike',()=>{
 const {s,nav,raid}=start('mono',2),attacker=raid.animals[0],other=raid.animals[1];
 const crop=s.plants.find(p=>p.id===attacker.targetId),otherTarget=other.targetId;
 assert(crop&&crop.alive);
 const budget=attacker.hitsRemaining,attackId='attack-destroyed-crop-qa';
 attacker.status='attacking';attacker.animation='Right_Hand_Sword_Slash';
 attacker.attackDuration=.5;attacker.attackRemaining=.5;
 attacker.attackId=attackId;attacker.hitApplied=false;
 crop.alive=false;
 reconcileTargetReservations(s,(state,animal)=>{
  animal.targetId=null;animal.reservation=null;animal.path=null;animal.approach=null;
 });
 assert.equal(attacker.targetId,crop.id,'the committed clip keeps its original target');
 assert.equal(attacker.reservation,null,'the destroyed target no longer owns a lease');
 assert.equal(other.targetId,otherTarget,'unrelated targets stay reserved');
 tick(s,nav,.49);
 assert.equal(attacker.hitsRemaining,budget);
 tick(s,nav,.01);
 assert.equal(attacker.hitsRemaining,budget-1);
 assert.equal(s.events.filter(event=>event.attackId===attackId&&event.type==='AnimalLogicalMiss').length,1);
 assert.equal(s.events.filter(event=>event.attackId===attackId&&event.type==='AnimalLogicalHit').length,0);
 assert.equal(s.raid.reservations[other.reservation],other.id);
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
test('reservation reconciliation sleeps on unchanged ticks and wakes on confirmed target loss',()=>{
 const {s,nav,raid}=start('mono',2),owner=raid.animals[0],other=raid.animals[1];
 const victim=s.plants.find(p=>p.id===owner.targetId),otherId=other.targetId;
 const claims=raid.reservations;
 tick(s,nav,0);
 assert.equal(raid.reservations,claims,'an unchanged tick must not rebuild claims');
 victim.alive=false;
 emit(s,'CropDestroyed',{cropId:victim.id});
 tick(s,nav,0);
 assert.notEqual(raid.reservations,claims,'confirmed target loss wakes reconciliation');
 assert.notEqual(owner.targetId,victim.id);
 assert.equal(other.targetId,otherId);
 assert.equal(raid.reservations[other.reservation],other.id);
});
test('reservation reconciliation excludes historical crops when the live farm grows',()=>{
 const {s}=start('mono',1);
 const history={id:'plant-history',alive:false};
 s.plants.push(history);activeCrops(s.plants);
 Object.defineProperty(history,'id',{get(){throw Error('historical crop was enumerated');}});
 s.plants.push({id:'plant-new',alive:true,x:200,z:200});
 assert.doesNotThrow(()=>reconcileTargetReservations(s,()=>{}));
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
test('region connectivity rejects a closed crop enclosure and updates when walls open',()=>{
 const {s,nav}=fixture('closed-walls'),outside={x:16,z:30},inside={x:8,z:0};
 assert.equal(nav.approachPath(outside,inside,1.1,32),null);
 assert.equal(nav.regionConnected(outside,inside,1.1,null,false),false);
 assert.equal(nav.regionConnected(inside,inside,1.1,null,false),true);
 for(const id of ['wall-2-4','wall-2-5']){const t=s.structures.find(t=>t.id===id);t.status='ruined';t.hp=0;}
 nav.setState(s);assert.equal(nav.regionConnected(outside,inside,1.1,null,false),true);
 assert(nav.approachPath(outside,inside,1.1,32));
});
test('a protected connected perimeter allows simultaneous attacks on separate pieces',()=>{
 const {s,raid}=start('closed-walls');independent(s);
 const walls=raid.animals.filter(a=>s.structures.some(t=>t.id===a.targetId&&t.kind==='wall'));
 assert(walls.length>1);assert.equal(new Set(walls.map(a=>a.targetId)).size,walls.length);
});
