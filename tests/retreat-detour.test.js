import test from 'node:test';
import assert from 'node:assert/strict';
import {createRetreatReproduction} from '../tools/check_retreat_route.mjs';
import {updateRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';

test('Seed-712 exhausted warthog reaches its original exit around the Ethiopian village, including reload',()=>{
  let {s,nav,start,exit,radius}=createRetreatReproduction();
  assert.equal(numberOf(s.ledger.balance),120);assert.equal(s.plants.length,16);assert.equal(nav.path(start,exit,radius,null,false),null);
  const route=nav.path(start,exit,radius,null,false,32);assert.ok(route);assert.ok(route.some(p=>p.z<-72));
  let previous=start;for(const p of route){assert.ok(nav.segmentClear(previous,p,radius,null,false));previous=p;}
  const animal={id:'qa-retreat',species:'warthog',...start,spawn:exit,radius,hitsRemaining:0,status:'retreating',targetId:null,reservation:null,path:null,attackRemaining:0,attackId:null,hitApplied:false};
  s.raid={id:'qa-detour',animals:[animal],encounters:[],reservations:{},daytime:false};
  let steps=0,last={...start},finalAnimal=animal;
  while(s.raid&&steps<1000){
    const current=s.raid.animals[0];updateRaid(s,.1,nav);assert.ok(nav.segmentClear(last,current,radius,null,false));assert.ok(Math.hypot(current.x-last.x,current.z-last.z)<=.38+1e-9);last={x:current.x,z:current.z};finalAnimal=current;steps++;
    if(steps===17){s=deserialize(serialize(s));nav.setState(s);assert.equal(s.raid.animals[0].status,'retreating');}
  }
  assert.ok(steps<1000);assert.equal(s.raid,null);assert.equal(finalAnimal.status,'gone');assert.deepEqual(last,exit);assert.equal(numberOf(s.ledger.balance),120);assert.ok(s.plants.every(p=>p.alive));assert.equal(s.structures[0].hp,600);
  assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,0);assert.equal(s.result,null);
});
