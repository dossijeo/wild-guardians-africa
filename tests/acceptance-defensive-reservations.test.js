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
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function saved(s){const map=new Map(),r=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});r.save(s);return r.load(s.slotId);}
function fixture(culture,large=false,crops=false){const s=Game.newGame({seed:712,culture,slotId:'defense-'+culture});Game.resume(s,'intro');s.ledger.balance=rational(20000);const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.buildWallChain(s,'chain','adobe',large?[[-40,16],[40,16]]:[[25,8],[35,8]],nav,{smooth:false,snap:false});if(crops)for(let i=0;i<6;i++)Game.plant(s,'crop-'+i,'mijo',8+Math.floor(i/2)*5+i%2*1.2,-8,nav);s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};spawnRaid(s,{group:['warthog','warthog','warthog']},nav);Game.tick(s,.05,nav);return {s,nav};}
function exclusive(s){const groups=defensiveGroups(s);for(const g of groups){const targeting=s.raid.animals.filter(a=>g.targets.some(t=>t.id===a.targetId));assert.ok(targeting.length<=1);if(targeting.length)assert.equal(s.raid.reservations[g.id],targeting[0].id);}}
for(const culture of Game.CULTURES)test(`QA-096: ${culture} one defensive set has one owner and a free companion retreats with hits`,()=>{
 const {s,nav}=fixture(culture),walls=s.structures.filter(t=>t.kind==='wall');assert.equal(walls.length,5);exclusive(s);
 assert.equal(s.raid.animals.filter(a=>a.targetId&&walls.some(w=>w.id===a.targetId)).length,1);assert.equal(s.raid.animals.filter(a=>a.targetId===s.structures[0].id).length,1);
 const free=s.raid.animals.find(a=>a.status==='retreating');assert.ok(free.hitsRemaining>0);const loaded=saved(s),fresh=navigation(loaded);assert.equal(serialize(loaded),serialize(s));
 for(let i=0;(s.raid||loaded.raid)&&i<3000;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));if(s.raid)exclusive(s);}
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
test('QA-096: aggregate defensive value outranks the 800-coin centre even though every piece costs less',()=>{
 const {s}=fixture('mapungubwe',true),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:'));assert.ok(g.value>800);assert.ok(g.targets.every(t=>t.cost<800));assert.ok(g.targets.some(t=>t.id===s.raid.animals[0].targetId));exclusive(s);
});
test('QA-096: topology loss rekeys surviving reservations and a legacy competing claim cannot delete the owner',()=>{
 const {s,nav}=fixture('mapungubwe'),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:')),owner=s.raid.animals.find(a=>a.reservation===g.id),competitor=s.raid.animals.find(a=>a.status==='retreating');
 // Explicit malformed legacy claim verifies compatibility, not a new attack.
 competitor.status='walking';competitor.targetId=g.targets.find(t=>t.id!==owner.targetId).id;competitor.reservation=g.id;
 Game.tick(s,.05,nav);exclusive(s);assert.equal(s.raid.reservations[g.id],owner.id);assert.equal(competitor.status,'retreating');
 const root=g.targets[0];hitStructure(root,root.maxHp,s.elapsed);nav.setState(s);Game.tick(s,.05,nav);exclusive(s);assert.ok(!s.raid.reservations[g.id]);
 const loaded=saved(s),fresh=navigation(loaded);Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));exclusive(s);
});
test('QA-096: actual paid contiguous crop groups remain exclusive through destruction and reload',()=>{
 const {s,nav}=fixture('mapungubwe',false,true);assert.equal(s.raid.animals.filter(a=>a.reservation?.startsWith('crop:')).length,3);assert.equal(new Set(s.raid.animals.map(a=>a.reservation)).size,3);
 const loaded=saved(s),fresh=navigation(loaded);let steps=0;
 while((s.raid||loaded.raid)&&steps++<3000){
  Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));
  if(s.raid){exclusive(s);for(const p of s.plants.filter(p=>p.alive)){const ids=new Set(contiguousGroup(s.plants,p).map(p=>p.id));assert.ok(s.raid.animals.filter(a=>ids.has(a.targetId)).length<=1);}}
 }
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,3);assert.equal(s.events.filter(e=>e.type==='CropHit').length,6);
});
