import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbyPlantPlacement,PLANT_TOUCH_RADIUS} from '../src/world/nearby-plant-placement.js';
import {plantNearTouch} from '../src/app/plant-placement.js';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';

test('valid exact touches retain precision, dead plants do not displace them',()=>{
 const p={x:.123,z:.456};assert.deepEqual(nearbyPlantPlacement(p.x,p.z,{plants:[{...p,alive:false}]}),p);
});
test('single crop picks its nearest boundary; overlapping exclusion circles find their intersection',()=>{
 const p=nearbyPlantPlacement(.3,0,{plants:[{x:0,z:0}]});assert.ok(Math.abs(p.x-1.1)<.001);assert.ok(Math.abs(p.z)<.001);
 const plants=[{x:-.5,z:0},{x:.5,z:0}],q=nearbyPlantPlacement(0,0,{plants});
 assert.ok(Math.abs(Math.hypot(q.x,q.z)-Math.sqrt(1.1**2-.5**2))<.001);
 assert.ok(plants.every(p=>Math.hypot(p.x-q.x,p.z-q.z)>=1.1));
});
test('geometry predicate remains authoritative and search never exceeds local cap',()=>{
 const p=nearbyPlantPlacement(0,0,{valid:(x,z)=>x>=.73&&Math.abs(z)<.1});
 assert.ok(p.x>=.73&&p.x<.731);assert.ok(Math.hypot(p.x,p.z)<=PLANT_TOUCH_RADIUS);
 let calls=0;assert.equal(nearbyPlantPlacement(0,0,{valid:()=>{calls++;return false;}}),null);assert.ok(calls<=257);
 assert.equal(nearbyPlantPlacement(0,0,{valid:x=>x>1.7}),null);
 assert.equal(nearbyPlantPlacement(NaN,0),null);
});
test('loading uses same bounded rule, retains spacing, catch-up, capacity and stop semantics',()=>{
 const s=new LoadingPlants();s.update(1,.65);const old=s.plants[0],p=s.plantNearby(old.x,old.z);
 assert.ok(p);assert.ok(Math.hypot(p.x-old.x,p.z-old.z)<=PLANT_TOUCH_RADIUS);
 assert.ok(s.plants.filter(a=>a!==p).every(a=>Math.hypot(a.x-p.x,a.z-p.z)>=s.spacing));
 assert.equal(p.growth,0);s.update(1,.65);assert.equal(p.growth,s.plants[1].growth);
 const edge=s.plantNearby(s.radius+.2,0);assert.ok(edge);assert.ok(Math.hypot(edge.x,edge.z)<=s.radius);
 assert.equal(s.plantNearby(20,0),null);s.capacity=s.plants.length;assert.equal(s.plantNearby(0,3),null);
 s.capacity=18;s.stopPlanting();assert.equal(s.plantNearby(0,3),null);
});
test('gameplay relocation performs one native charge and one FIFO insertion, not speculative mutations',()=>{
 const nav={placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
 const s=Game.newGame({seed:712,slotId:'nearby'});Game.placeStructure(s,'center',{x:8,z:0},nav);Game.plant(s,'first','mijo',0,0,nav);
 const balance=numberOf(s.ledger.balance),count=s.tasks.length;
 plantNearTouch(s,'touch','mijo',{x:0,z:0},nav);
 assert.equal(s.plants.length,2);assert.equal(numberOf(s.ledger.balance),balance-5);assert.equal(s.tasks.length,count+1);
 assert.ok(Math.hypot(s.plants[1].x,s.plants[1].z)<=PLANT_TOUCH_RADIUS);
 const before=JSON.stringify(s);assert.equal(plantNearTouch(s,'touch','mijo',{x:8,z:8},nav),false);assert.equal(JSON.stringify(s),before);
});
test('no local valid point preserves native rejection and does not charge or enqueue',()=>{
 const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
 const s=Game.newGame({seed:712,slotId:'blocked'});Game.placeStructure(s,'center',{x:8,z:0},nav);
 nav.placement=()=>({valid:false,reason:'Zona prohibida'});const before=JSON.stringify(s);
 assert.throws(()=>plantNearTouch(s,'blocked','mijo',{x:0,z:0},nav),/Zona prohibida/);assert.equal(JSON.stringify(s),before);
});
