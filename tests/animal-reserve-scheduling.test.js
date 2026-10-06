import test from 'node:test';import assert from 'node:assert/strict';
import {WorldScene} from '../src/rendering/scene.js';
function setup(){const world=Object.create(WorldScene.prototype),calls=[],errors=[];Object.assign(world,{animalGpuReady:true,warmAnimalModels:async()=>{},animalPreload:{reserveGroup:async group=>{calls.push([...group]);return true;}},onError:error=>errors.push(error)});return {world,calls,errors};}
function state(){return {day:6,nightPlan:{done:false,group:['warthog','warthog']},raid:null};}
test('an unchanged plan prepares once and an identical group on the next day prepares again',async()=>{
 const {world,calls}=setup(),s=state();world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;world.prepareUpcomingAnimalRigs(s);assert.equal(calls.length,1);
 s.day++;world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;assert.deepEqual(calls,[['warthog','warthog'],['warthog','warthog']]);
});
test('active raids do not reset pool demand and completion refreshes an unchanged pending plan',async()=>{
 const {world,calls}=setup(),s=state();world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;
 s.raid={animals:[]};world.prepareUpcomingAnimalRigs(s);world.prepareUpcomingAnimalRigs(s);assert.equal(calls.length,1);assert.equal(world.animalReserveKey,null);
 s.raid=null;world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;assert.equal(calls.length,2);
});
test('a completed night releases additional reserves back to the baseline',async()=>{
 const {world,calls}=setup(),s=state();world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;s.nightPlan.done=true;world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;assert.deepEqual(calls.at(-1),[]);
});
test('reserve errors wait before retrying and do not repeat every render',async()=>{
 const {world,calls,errors}=setup(),s=state();world.animalPreload.reserveGroup=async group=>{calls.push(group);throw Error('GPU failed');};world.prepareUpcomingAnimalRigs(s);await world.animalReservePreparation;
 assert.equal(errors.length,1);const retryAt=world.animalReserveRetryAt;world.prepareUpcomingAnimalRigs(s,retryAt-1);assert.equal(calls.length,1);
 world.animalPreload.reserveGroup=async group=>{calls.push(group);return true;};world.prepareUpcomingAnimalRigs(s,retryAt+1);await world.animalReservePreparation;assert.equal(calls.length,2);
});
test('closed or GPU-unprepared worlds do not begin reserve preparation',()=>{
 const {world,calls}=setup();world.animalGpuReady=false;world.prepareUpcomingAnimalRigs(state());world.animalGpuReady=true;world.disposed=true;world.prepareUpcomingAnimalRigs(state());assert.equal(calls.length,0);
});
