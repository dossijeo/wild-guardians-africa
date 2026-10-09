import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingProgress} from '../src/app/loading-progress.js';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import {cropSpec} from '../src/simulation/rules.js';
test('weighted real milestones remain monotonic and cannot complete before readiness',()=>{
 let time=0;const p=new LoadingProgress([{id:'chunks',weight:3},{id:'gpu',weight:1}],{now:()=>time});
 assert.equal(p.update('chunks',2,4).progress,.375);time=12;assert.equal(p.update('chunks',1,4).progress,.375);
 assert.throws(()=>p.confirmReady());p.update('chunks');assert.equal(p.update('gpu').progress,.99);assert.equal(p.snapshot().ready,false);assert.equal(p.confirmReady().progress,1);assert.equal(p.snapshot().estimated,false);
});
test('failed load retains diagnostics and cannot signal readiness',()=>{const p=new LoadingProgress([{id:'world',weight:1}]);p.fail(new Error('Decode failed'));assert.equal(p.snapshot().error,'Decode failed');assert.deepEqual(p.snapshot().pending,['world']);assert.throws(()=>p.confirmReady(),/Decode failed/);assert.equal(p.update('world').progress,0);});
test('loading plants are optional, bounded, non-overlapping and never reach 100% prematurely',()=>{
 const p=new LoadingPlants();assert.equal(p.plants.length,4);assert.equal(p.plant(-1.7,-.8),null);assert.equal(p.plant(8,0),null);assert.equal(p.plant(NaN,0),null);
 p.update(1,1);assert.equal(p.progress,.99);assert.equal(p.mature,false);p.update(1,1,{ready:true});assert.equal(p.mature,true);
});
test('new seedling catches moving progress continuously within one second',()=>{
 const p=new LoadingPlants(),duration=cropSpec('maiz').growth_seconds;p.update(1,.65);const plant=p.plant(0,3);assert.ok(plant);assert.equal(plant.growth,0);
 let prior=0;for(let i=0;i<10;i++){p.update(.1,.65+i*.01);assert.ok(plant.growth>=prior);assert.ok(plant.growth<=p.progress*duration);prior=plant.growth;}
 assert.ok(Math.abs(plant.growth-p.progress*duration)<1e-8);p.stopPlanting();assert.equal(p.plant(3,0),null);
});
