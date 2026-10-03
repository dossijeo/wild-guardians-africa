import {centerFootprint} from '../src/world/centers.js';
import {footprintDistance} from '../src/world/footprints.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,updateRaid,reachableApproach} from '../src/simulation/raids.js';
import {nextRandom} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {Navigation} from '../src/world/navigation.js';
function world(walkable=()=>true){
  return {version:1,placement:()=>({valid:true}),setState(){this.version++;},walkable,
    path(start,end,radius,ignore){assert.equal(ignore,null);return walkable(end.x,end.z,radius)?[{x:end.x,z:end.z}]:null;}};
}
function ready(nav){const s=Game.newGame({seed:712,slotId:'raid-route'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);s.time=400;s.initialPreparation=false;return s;}

for(const [species,library] of Object.entries(ANIMAL_ACTIONS.animals))test(`${species}: native body radius controls entry, approach, shield exclusion and survives reload`,()=>{
  const expected=library.presentation.footprint.radius,calls=[],nav=world(),s=ready(nav);
  nav.walkable=(_x,_z,r)=>{calls.push(r);return true;};
  nav.path=(_a,b,r)=>{calls.push(r);return [{x:b.x,z:b.z}];};
  spawnRaid(s,{group:[species]},nav);const animal=s.raid.animals[0];
  assert.equal(animal.radius,expected);assert.ok(calls.length>0);assert.ok(calls.every(r=>r===expected));
  const shield={id:'shield',x:0,z:0,radius:4};
  const approach=reachableApproach(animal,s.structures[0],nav,shield);
  assert.ok(Math.abs(Math.hypot(approach.point.x,approach.point.z)-(4+expected+.1))<1e-10);
  const loaded=deserialize(serialize(s));assert.equal(loaded.raid.animals[0].radius,expected);
  s.day=2;nav.terrainValid=()=>true;const spellRadius=Game.spellRadius('shield');
  animal.x=spellRadius+expected-.01;animal.z=0;s.cooldowns.shield=0;
  assert.throws(()=>Game.cast(s,'shield-blocked','shield',0,0,nav),/solapa un animal/);
  animal.x=spellRadius+expected+.01;Game.cast(s,'shield-clear','shield',0,0,nav);assert.equal(s.spells.length,1);
});

for(const [species,library] of Object.entries(ANIMAL_ACTIONS.animals))test(`${species}: swept native body fits clear passages and rejects narrower structure, rock and shield gaps`,()=>{
  const radius=library.presentation.footprint.radius,nav=new Navigation(712,'sabana',{});
  // Isolate obstacle geometry; original terrain coverage belongs to campaigns.
  nav.terrainValid=()=>true;nav.propsAt=()=>[];
  const start={x:0,z:-4},end={x:0,z:4};
  for(const kind of ['center','shield','rock'])for(const clearance of [.01,-.01]){
    const objects=[-1,1].map(side=>({id:`${kind}-${side}`,kind,slot:0,x:side*(radius+.5+clearance),z:0,radius:.5}));
    nav.obstacles=kind==='rock'?[]:objects;nav.propsAt=()=>kind==='rock'?objects:[];nav.segmentCache.clear();
    assert.equal(nav.segmentClear(start,end,radius,null,false),clearance>0,`${kind} gap with ${clearance} clearance`);
  }
});
test('Approach selection tries another side when the direct contact point is blocked, without ignoring the building',()=>{
  const nav=world((_x,z)=>z>1),target={id:'center',kind:'center',x:0,z:0};
  const result=reachableApproach({x:20,z:0,radius:.45},target,nav);
  assert.ok(result);assert.ok(result.point.z>1);assert.ok(footprintDistance(centerFootprint(target).footprint,result.point.x,result.point.z)>=.45);
});
test('The selected contact point persists while walking and across an active-raid save/load',()=>{
  const nav=world(),s=ready(nav);spawnRaid(s,{group:['warthog']},nav);updateRaid(s,.1,nav);
  const approach={...s.raid.animals[0].approach};
  for(let i=0;i<5;i++){updateRaid(s,.1,nav);assert.deepEqual(s.raid.animals[0].approach,approach);}
  const loaded=deserialize(serialize(s));nav.setState(loaded);updateRaid(loaded,.1,nav);
  assert.deepEqual(loaded.raid.animals[0].approach,approach);assert.ok(loaded.raid.animals[0].path);
});
test('A full legal five-animal composition changes entry side together when a large animal cannot enter',()=>{
  const nav=world((x,_z,radius)=>x>=0||radius<=.6),s=ready(nav),rng={rng:s.rng};
  const group=['warthog','warthog','warthog','buffalo','buffalo'];
  spawnRaid(s,{group},nav);assert.deepEqual(s.raid.animals.map(a=>a.species),group);
  assert.ok(s.raid.animals.every(a=>a.spawn.x===46),'The group must use one common reachable side');
  for(let i=0;i<6;i++)nextRandom(rng);assert.equal(s.rng,rng.rng,'Changing spatial entry must not reroll budgets or composition');
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
    const a=s.raid.animals[i],b=s.raid.animals[j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>a.radius+b.radius+1);
  }
});
test('An impossible full-group entry does not silently drop the animals that could not fit',()=>{
  const nav=world((_x,_z,radius)=>radius<=.6),s=ready(nav),nextId=s.nextId;
  spawnRaid(s,{group:['warthog','buffalo']},nav);
  assert.equal(s.raid,null);assert.equal(s.nextId,nextId);
  assert.ok(s.messages.at(-1).text.includes('grupo completo'));
});
test('Structure connectivity preflight leaves the actual crop target priority unchanged',()=>{
  const nav=world(),s=ready(nav);s.time=0;Game.plant(s,'crop','mijo',5,0,nav);s.time=400;
  const calls=[],path=nav.path.bind(nav);nav.path=(...args)=>{calls.push(args[1].id);return path(...args);};
  spawnRaid(s,{group:['warthog']},nav);
  assert.ok(calls[0].startsWith(`approach-${s.structures[0].id}-`));
  updateRaid(s,.1,nav);assert.equal(s.raid.animals[0].targetId,s.plants[0].id);
  assert.ok(s.raid.animals[0].reservation.startsWith('crop:'));
});
test('A reachable crop permits entry when every structure approach is blocked',()=>{
  const nav=world(),s=ready(nav);s.time=0;Game.plant(s,'crop','mijo',5,0,nav);s.time=400;
  const path=nav.path.bind(nav);nav.path=(...args)=>args[1].id?.startsWith('approach-structure-')?null:path(...args);
  spawnRaid(s,{group:['warthog']},nav);assert.equal(s.raid.animals.length,1);
  updateRaid(s,.1,nav);assert.equal(s.raid.animals[0].targetId,s.plants[0].id);
});
