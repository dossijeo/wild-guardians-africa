import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {updateRaid} from '../src/simulation/raids.js';
import {AREA12_ID} from '../src/simulation/qa-area12-policy.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

test('area retirement of another committed target becomes a spent miss after reload, never a second harvest or hit',()=>{
 const s=Game.newGame({seed:712,slotId:'area-secondary'});
 Object.assign(s,{day:6,completedNights:5,time:400,elapsed:3400,initialPreparation:false,qaRaidArea:AREA12_ID});
 s.tutorial.step='done';
 s.plants=[{id:'primary',species:'mijo',x:0,z:0,alive:true,attackHits:0,harvestRequested:true},{id:'secondary',species:'maiz',x:1.5,z:0,alive:true,attackHits:0,harvestRequested:true}];
 const animal=(id,targetId,x,z,remaining)=>({id,species:'warthog',x,z,radius:1,heading:0,hitsRemaining:2,status:'attacking',targetId,reservation:'crop:'+targetId,attackId:'committed-'+id,hitApplied:false,attackRemaining:remaining,attackDuration:1,animation:'Weapon_Combo',spawn:{x,z},exit:{x,z:-10}});
 s.raid={id:'raid',animals:[animal('first','primary',-1.6,0,.1),animal('second','secondary',1.5,1.6,.2)],encounters:[],reservations:{'crop:primary':'first','crop:secondary':'second'},daytime:false,areaPressure:{version:AREA12_ID,livingBaseValue:60000,radius:3,maxTargets:7,increment:2}};
 const navigation=state=>{
  const nav=new Navigation(712,'sabana');nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(state);return nav;
 };
 const balance=JSON.stringify(s.ledger),rng=s.rng;
 updateRaid(s,.1,navigation(s));
 assert.ok(s.plants.every(p=>!p.alive&&!p.harvestRequested));
 assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,2);
 assert.equal(s.raid.animals[1].hitsRemaining,2);
 const restored=deserialize(serialize(s));
 updateRaid(restored,.1,navigation(restored));
 assert.equal(restored.events.filter(e=>e.type==='CropDestroyed').length,2);
 assert.equal(restored.events.filter(e=>e.type==='CropHit').length,2);
 assert.equal(restored.raid.animals[1].hitsRemaining,1);
 assert.equal(restored.raid.animals[1].targetId,null);
 assert.equal(restored.raid.reservations['crop:secondary'],undefined);
 assert.ok(restored.events.some(e=>e.type==='AnimalLogicalMiss'&&e.attackId==='committed-second'));
 assert.equal(restored.rng,rng);assert.deepEqual(restored.crates,[]);assert.equal(JSON.stringify(restored.ledger),balance);
});
