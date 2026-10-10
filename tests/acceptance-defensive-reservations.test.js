import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {defensiveGroups} from '../src/simulation/defensive-groups.js';
import {contiguousGroup} from '../src/simulation/crops.js';
import {hitStructure} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {targetReservationKey,reservedApproachClear} from '../src/simulation/raid-target-reservations.js';
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function saved(s){const map=new Map(),r=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});r.save(s);return r.load(s.slotId);}
function fixture(culture,large=false,crops=false){const s=Game.newGame({seed:712,culture,slotId:'defense-'+culture});Game.resume(s,'intro');s.ledger.balance=rational(20000);const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.buildWallChain(s,'chain','adobe',large?[[-40,16],[40,16]]:[[25,8],[35,8]],nav,{smooth:false,snap:false});if(crops)for(let i=0;i<6;i++)Game.plant(s,'crop-'+i,'mijo',8+Math.floor(i/2)*5+i%2*1.2,-8,nav);s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};spawnRaid(s,{group:['warthog','warthog','warthog']},nav);Game.tick(s,.05,nav);return {s,nav};}
function exclusive(s){for(const a of s.raid.animals.filter(a=>a.targetId)){const t=s.plants.find(p=>p.id===a.targetId)??s.structures.find(t=>t.id===a.targetId);assert.equal(s.raid.reservations[targetReservationKey(t,a)],a.id);if(t.kind!=='center')assert.equal(s.raid.animals.filter(b=>b.targetId===t.id).length,1);if(a.approach)assert(reservedApproachClear(s,a,a.approach));}}
for(const culture of Game.CULTURES)test(`QA-096: ${culture} simultaneous center approaches remain independent and replay exactly`,()=>{
 const {s,nav}=fixture(culture),walls=s.structures.filter(t=>t.kind==='wall');assert.equal(walls.length,5);exclusive(s);
 assert.ok(s.raid.animals.filter(a=>a.targetId===s.structures[0].id).length>1);
 const free=s.raid.animals[2];assert.ok(free.hitsRemaining>0);
 const loaded=saved(s),fresh=navigation(loaded);assert.equal(serialize(loaded),serialize(s));let actualContact=false;
 for(let i=0;(s.raid||loaded.raid)&&i<3000;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));if(s.raid)exclusive(s);if(s.events.some(e=>['StructureHit','CropHit'].includes(e.type)&&e.animalId===free.id))actualContact=true;
 }
 assert.ok(actualContact,'Queued companion must physically obtain its turn rather than lose its attack budget to contention');
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
test('QA-096: aggregate defensive value outranks the 800-coin centre even though every piece costs less',()=>{
 const {s}=fixture('mapungubwe',true),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:'));assert.ok(g.value>800);assert.ok(g.targets.every(t=>t.cost<800));assert.ok(g.targets.some(t=>t.id===s.raid.animals[0].targetId));exclusive(s);
});
test('QA-096: legacy duplicate wall claims migrate individually and a ruined target frees only its lease',()=>{
 const {s,nav}=fixture('mapungubwe'),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:')),owner=s.raid.animals[0],competitor=s.raid.animals[1],root=g.targets[0];
 // Explicit malformed legacy claim verifies compatibility, not a new attack.
 for(const a of [owner,competitor])Object.assign(a,{status:'walking',targetId:root.id,reservation:g.id,approach:null,path:null});s.raid.reservations[g.id]=owner.id;
 Game.tick(s,.05,nav);exclusive(s);assert.equal(s.raid.reservations['structure:'+root.id],owner.id);assert.notEqual(competitor.targetId,root.id);
 hitStructure(root,root.maxHp,s.elapsed);nav.setState(s);Game.tick(s,.05,nav);exclusive(s);assert.ok(!s.raid.reservations['structure:'+root.id]);
 const loaded=saved(s),fresh=navigation(loaded);Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));exclusive(s);
});
test('QA-096: actual paid contiguous crop groups remain exclusive through destruction and reload',()=>{
 const {s,nav}=fixture('mapungubwe',false,true);assert.equal(s.raid.animals.filter(a=>a.reservation?.startsWith('crop:')).length,3);assert.equal(new Set(s.raid.animals.map(a=>a.reservation)).size,3);
 const loaded=saved(s),fresh=navigation(loaded);let steps=0;
 while((s.raid||loaded.raid)&&steps++<3000){
  Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));
  if(s.raid){exclusive(s);for(const p of s.plants.filter(p=>p.alive))assert.ok(s.raid.animals.filter(a=>a.targetId===p.id).length<=1);}
 }
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,3);assert.equal(s.events.filter(e=>e.type==='CropHit').length,6);
});
