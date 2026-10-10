import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {BALANCE} from '../src/simulation/balance.js';
import {updateRaid,spawnRaid} from '../src/simulation/raids.js';
import {AREA12_ID,freezeArea12Pressure,area12Compositions,area12Constraints} from '../src/simulation/qa-area12-policy.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {activeCrops} from '../src/simulation/active-crops.js';
const plant=(id,x,z)=>({id,species:'mijo',alive:true,x,z,harvestRequested:true,attackHits:0});
function navigation(s,{canyon=false,fluid=false,cliff=false}={}){
 const nav=new Navigation(712,canyon?'gran-canon':'sabana');nav.propsAt=()=>[];
 nav.field={canyon,riverLevel:0,surface:x=>cliff&&x>=0?5:0,slope:()=>0,fluidInside:x=>fluid&&Math.abs(x)<.5};nav.setState(s);return nav;
}
function fixture(options={}){
 const s=Game.newGame({seed:712,slotId:'area12-native'});s.day=6;s.completedNights=5;s.time=400;s.elapsed=3400;s.tutorial.step='done';s.initialPreparation=false;s.qaRaidArea=AREA12_ID;
 s.plants=[plant('primary',-1,0),plant('near',-1,1),plant('across',1,0),plant('remote',20,0)];
 const animal={id:'animal',species:'warthog',x:-2,z:0,radius:1,heading:0,hitsRemaining:2,status:'attacking',targetId:'primary',reservation:null,attackId:'committed-one',hitApplied:false,attackRemaining:.1,attackDuration:1,animation:'Weapon_Combo',spawn:{x:-2,z:0},exit:{x:-2,z:-10}};
 s.raid={id:'raid',animals:[animal],encounters:[],reservations:{},daytime:false,areaPressure:{version:AREA12_ID,livingBaseValue:60000,radius:3,maxTargets:7,increment:2}};
 return {s,nav:navigation(s,options),animal};
}
test('completed native impact spends once, invalidates living crop cache and presents every affected ID',()=>{
 const {s,nav,animal}=fixture();assert.equal(activeCrops(s.plants).length,4);const rng=s.rng;
 updateRaid(s,.1,nav);assert.equal(animal.hitsRemaining,1);assert.equal(s.rng,rng);
 assert.deepEqual(s.events.filter(e=>e.type==='CropDestroyed').map(e=>e.targetId),['primary','near','across']);
 assert.equal(activeCrops(s.plants).length,1);assert.equal(s.plants[3].alive,true);
 const hit=s.events.find(e=>e.type==='AnimalLogicalHit');assert.equal(hit.attackId,'committed-one');assert.equal(hit.presentation.areaImpact.appliedTargets.length,3);assert.ok(hit.presentation.areaImpact.appliedTargets.every(t=>t.postHits===2&&t.destroyed));
 assert.ok(s.events.filter(e=>e.type==='CropHit').every(e=>e.attackId==='committed-one'));
});
test('save before impact replays identically; save after committed hit does not apply it again',()=>{
 const {s,nav}=fixture(),before=deserialize(serialize(s)),fresh=navigation(before);updateRaid(s,.1,nav);updateRaid(before,.1,fresh);
 assert.equal(serialize(s),serialize(before));const after=deserialize(serialize(s)),count=after.events.filter(e=>e.type==='CropHit').length,budget=after.raid.animals[0].hitsRemaining;
 updateRaid(after,.001,navigation(after));assert.equal(after.events.filter(e=>e.type==='CropHit').length,count);assert.equal(after.raid.animals[0].hitsRemaining,budget);
});
test('primary shield spends the committed hit but never propagates; secondary shield is independent',()=>{
 for(const primary of [true,false]){
  const {s,nav,animal}=fixture();s.spells=[{id:'shield',kind:'shield',x:primary?-1:1,z:0,radius:.3,remaining:20}];
  nav.setState(s);
  updateRaid(s,.1,nav);assert.equal(animal.hitsRemaining,1);
  assert.equal(s.plants[2].alive,true);assert.equal(s.plants[0].alive,primary);
  assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,primary?0:2);
 }
});
test('native solid wall or animal gate blocks area secondary target',()=>{
 for(const gate of [false,true]){
  const {s,animal}=fixture();s.structures=[{id:'wall',kind:'wall',x:0,z:0,yaw:Math.PI/2,material:'empalizada',gate,gateOpen:1,baseScaleX:1,hp:200,maxHp:200,cost:20,status:'intact'}];
  const nav=navigation(s);updateRaid(s,.1,nav);assert.equal(animal.hitsRemaining,1);assert.equal(s.plants[2].alive,true);assert.equal(s.plants[1].alive,false);
 }
});
test('native fluids/cliff occlude; flat Canyon river remains traversable',()=>{
 for(const options of [{fluid:true},{canyon:true,fluid:true},{canyon:true,cliff:true}]){
  const {s,nav}=fixture(options);updateRaid(s,.1,nav);assert.equal(s.plants[2].alive,!(options.canyon&&options.fluid));
 }
});
test('missing segmentClear fails closed, old save without pressure stays one-target/one-hit',()=>{
 const first=fixture();delete first.nav.segmentClear;first.nav.segmentClear=undefined;updateRaid(first.s,.1,first.nav);assert.ok(first.s.plants.every(p=>p.alive));assert.equal(first.s.events.find(e=>e.type==='AnimalLogicalHit').presentation.areaImpact.reason,'no-eligible-crop-or-primary-occluded');
 const old=fixture();delete old.s.qaRaidArea;delete old.s.raid.areaPressure;const restored=deserialize(serialize(old.s));updateRaid(restored,.1,navigation(restored));
 assert.deepEqual(restored.plants.map(p=>p.attackHits),[1,0,0,0]);assert.ok(restored.plants.every(p=>p.alive));
});
test('first-five cap overrides area and applies global remaining destruction allowance',()=>{
 const {s,nav}=fixture();s.day=1;s.completedNights=0;s.raid.introPlantCount=4;s.raid.introCropLimit=1;s.raid.introCropsDestroyed=0;s.plants[0].attackHits=1;
 updateRaid(s,.1,nav);assert.equal(s.raid.introCropsDestroyed,1);assert.equal(s.plants[0].alive,false);assert.equal(s.plants[1].attackHits,0);
 const blocked=fixture();blocked.s.raid.introPlantCount=4;blocked.s.raid.introCropLimit=0;blocked.s.raid.introCropsDestroyed=0;blocked.s.plants[0].attackHits=1;
 updateRaid(blocked.s,.1,blocked.nav);assert.ok(blocked.s.plants.every(p=>p.alive));
});
test('pressure freezes living value without cash/RNG and persists after crop stock changes',()=>{
 const s=Game.newGame({seed:712,slotId:'pressure'});assert.equal(freezeArea12Pressure(s),undefined);s.qaRaidArea=AREA12_ID;s.plants=Array.from({length:80},(_,i)=>({...plant('p'+i,i,0),species:'platano'}));
 const rng=s.rng,p=freezeArea12Pressure(s);assert.equal(p.livingBaseValue,64080);assert.equal(p.increment,2);assert.equal(p.maxTargets,7);assert.equal(s.rng,rng);
 s.raid={animals:[],encounters:[],reservations:{},areaPressure:p};s.plants=[];assert.deepEqual(deserialize(serialize(s)).raid.areaPressure,p);
 assert.deepEqual(freezeArea12Pressure(s,true),{version:AREA12_ID,livingBaseValue:0,radius:0,maxTargets:1,increment:1});
 for(const bad of [{...p,maxTargets:9},{...p,increment:3},{...p,radius:0},{...p,livingBaseValue:0}])assert.throws(()=>serialize({...s,raid:{...s.raid,areaPressure:bad}}));
});
test('every budget roll, stage and unlocked tier has legal complete candidate composition',()=>{
 let checked=0;
 for(const stage of BALANCE.raids.night_horde_stages)for(const tier of BALANCE.threat_tiers)for(let raw=tier.threat_min;raw<=tier.threat_max;raw++){
  const budget=Math.ceil(raw*stage.budget_scale),groups=area12Compositions(budget,tier.unlocked_species,area12Constraints(stage));
  assert.ok(groups.length,`stage${stage.first}/tier${tier.attraction_min}/budget${budget}`);
  for(const group of groups){assert.ok(group.length<=stage.max_animals&&group.length>=1);assert.ok(group.every(id=>tier.unlocked_species.includes(id)));}checked++;
 }
 assert.ok(checked>50);
});
test('spawn persists pressure snapshot, independent of subsequent cash and harvest',()=>{
 const {s,nav}=fixture();s.raid=null;s.plants.push(...Array.from({length:80},(_,i)=>({...plant('banana'+i,50+i,0),species:'platano'})));
 nav.preparedRaidEntry=()=>({entry:{entries:[{x:-4,z:0}],exits:[{x:-4,z:-4}]}});
 assert.equal(spawnRaid(s,{group:['warthog']},nav),'spawned');const pressure=structuredClone(s.raid.areaPressure);
 assert.equal(pressure.increment,2);s.plants=[];
 assert.deepEqual(deserialize(serialize(s)).raid.areaPressure,pressure);
 assert.deepEqual(s.events.find(e=>e.type==='RaidSpawned').areaPressure,pressure);
});
test('frozen economic and individual damage baseline remain exact',()=>{
 assert.equal(BALANCE.initial_money,1500);assert.equal(BALANCE.work_center.cost,800);
 assert.equal(BALANCE.crops.find(c=>c.id==='mijo').base_harvest_value,33);assert.equal(BALANCE.animals.find(c=>c.id==='rhino').structure_hit_damage,30);
 assert.deepEqual(area12Constraints(BALANCE.raids.night_horde_stages.at(-1)),{maxAnimals:12,minAnimals:6,speciesCaps:[8,5,4,3,2]});
});
