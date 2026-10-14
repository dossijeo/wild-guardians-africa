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
function individual(s){
 const active=s.raid.animals.filter(a=>!['gone','retreating','waiting'].includes(a.status)&&a.targetId),keys=new Set();
 for(const a of active){
  const target=[...s.structures,...s.plants].find(t=>t.id===a.targetId);assert.ok(target);
  const key=target.kind==='center'?`center:${target.id}:${a.id}`:'alive' in target?`crop:${target.id}`:`structure:${target.id}`;
  assert.equal(a.reservation,key);assert.equal(s.raid.reservations[key],a.id);assert.ok(!keys.has(key));keys.add(key);
 }
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++)if(active[i].approach&&active[j].approach)
  assert.ok(Math.hypot(active[i].approach.x-active[j].approach.x,active[i].approach.z-active[j].approach.z)>=(active[i].radius??.28)+(active[j].radius??.28)+.1-1e-8);
}
for(const culture of Game.CULTURES)test(`QA-096: ${culture} independent centre approaches retain their hits and survive reload`,()=>{
 const {s,nav}=fixture(culture),walls=s.structures.filter(t=>t.kind==='wall');assert.equal(walls.length,5);individual(s);
 assert.equal(s.raid.animals.filter(a=>a.targetId===s.structures[0].id).length,3);
 assert.ok(s.raid.animals.every(a=>a.hitsRemaining>0&&a.status!=='retreating'));
 const loaded=saved(s),fresh=navigation(loaded);assert.equal(serialize(loaded),serialize(s));
 for(let i=0;(s.raid||loaded.raid)&&i<3000;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));if(s.raid)individual(s);}
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
test('QA-096: aggregate defensive value does not impose group-wide attack exclusivity',()=>{
 const {s}=fixture('mapungubwe',true),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:'));assert.ok(g.value>800);assert.ok(g.targets.every(t=>t.cost<800));individual(s);
 const wallClaims=s.raid.animals.filter(a=>g.targets.some(t=>t.id===a.targetId));
 assert.ok(wallClaims.length>=2);assert.equal(new Set(wallClaims.map(a=>a.targetId)).size,wallClaims.length);
});
test('QA-096: destroying a reserved wall releases only its claim and survives reload',()=>{
 const {s,nav}=fixture('mapungubwe'),g=defensiveGroups(s).find(g=>g.id.startsWith('defense:'));
 const owner=s.raid.animals[0],competitor=s.raid.animals[1],wall=g.targets[0];
 competitor.status='walking';competitor.targetId=wall.id;competitor.approach=null;competitor.path=null;competitor.reservation=g.id;
 Game.tick(s,.05,nav);individual(s);assert.equal(s.raid.reservations[`center:${owner.targetId}:${owner.id}`],owner.id);
 hitStructure(wall,wall.maxHp,s.elapsed);nav.setState(s);Game.tick(s,.05,nav);individual(s);assert.ok(!s.raid.reservations[`structure:${wall.id}`]);
 const loaded=saved(s),fresh=navigation(loaded);Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));individual(s);
});
test('QA-096: paid contiguous crops can receive distinct individual claims through destruction and reload',()=>{
 const {s,nav}=fixture('mapungubwe',false,true);individual(s);
 const cropClaims=s.raid.animals.filter(a=>a.reservation?.startsWith('crop:'));
 assert.equal(cropClaims.length,3);assert.equal(new Set(cropClaims.map(a=>a.targetId)).size,3);
 const firstGroup=new Set(contiguousGroup(s.plants,s.plants[0]).map(p=>p.id));
 assert.ok(cropClaims.filter(a=>firstGroup.has(a.targetId)).length>=2,'Connected crops allow independent attackers');
 const loaded=saved(s),fresh=navigation(loaded);let steps=0;
 while((s.raid||loaded.raid)&&steps++<3000){
  Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));
  if(s.raid)individual(s);
 }
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);
 const hits=s.events.filter(e=>e.type==='CropHit'),destroyed=s.events.filter(e=>e.type==='CropDestroyed');
 assert.ok(hits.length>0&&destroyed.length>0);
 assert.ok(destroyed.every(e=>hits.some(hit=>hit.targetId===e.targetId)));
});
