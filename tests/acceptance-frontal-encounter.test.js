import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {sweptDistance} from '../src/simulation/encounters.js';
import {nextRandom} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
function navigation(s,seed){const n=new Navigation(seed,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-24,-24,24,24];n.setState(s);return n;}
function actors(s){const a=s.raid?.animals[0],w=s.workers[0];if(!a)return null;const p=s.raid.encounterPositions??{},pair=a.id+':'+w.id;return {a,w,pair,close:Math.hypot(a.x-w.x,a.z-w.z)<a.radius+1.1,collision:sweptDistance(a,w,p[a.id],p[w.id])<a.radius+.28,frontal:(w.x-a.x)*Math.sin(a.heading??0)+(w.z-a.z)*Math.cos(a.heading??0)>0};}
function eligible(s){const x=actors(s);return x&&x.w.status!=='home'&&!x.w.incapacitated&&!['gone','retreating'].includes(x.a.status)&&x.a.hitsRemaining>0&&x.close&&!x.collision&&x.frontal&&!(s.raid.encounterContacts??[]).includes(x.pair);}
function saved(s){const map=new Map(),r=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});r.save(s);return r.load(s.slotId);}
const domain=s=>JSON.parse(serialize(s));
// Place the crop .83 m beyond the intended encounter start (20, 0): watering
// now stops outside it. Preserve the encounter geometry and all hit assertions.
function fixture(culture,seed){
 const s=Game.newGame({seed,culture,slotId:`frontal-${culture}-${seed}`});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s,seed);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'crop','mijo',20.83,0,nav);s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:1});s.dayPlan={done:true};s.nightPlan={done:true};
 for(let i=0;i<2000&&s.workers[0].status!=='acting';i++)Game.tick(s,.05,nav);assert.equal(s.workers[0].status,'acting');assert.ok(Math.abs(s.workers[0].x-20)<1e-8&&Math.abs(s.workers[0].z)<1e-8);spawnRaid(s,{group:['warthog']},nav);
 for(let i=0;i<2000&&!eligible(s)&&s.raid;i++)Game.tick(s,.05,nav);assert.ok(eligible(s));return {s,nav};
}
for(const culture of Game.CULTURES)for(const [seed,accepted] of [[21,true],[152,false]])test(`QA-105: ${culture} real non-collision frontal ${accepted?'hit':'rejection'} rolls once and retains contact on reload`,()=>{
 const {s,nav}=fixture(culture,seed),x=actors(s),beforeHits=x.w.hits,budget=x.a.hitsRemaining,probe={...s},roll=nextRandom(probe);
 assert.equal(roll<.6,accepted);assert.equal(x.collision,false);assert.equal(x.frontal,true);
 const before=saved(s),beforeNav=navigation(before,seed);assert.equal(serialize(before),serialize(s));
 Game.tick(s,.05,nav);Game.tick(before,.05,beforeNav);assert.deepEqual(domain(before),domain(s));
 assert.equal(s.rng,probe.rng);assert.equal(x.w.hits,beforeHits+Number(accepted));assert.equal(x.a.hitsRemaining,budget-Number(accepted));
 if(accepted)assert.equal(s.events.at(-1).pushed,0);assert.ok(s.raid.encounterContacts.includes(x.pair));
 const restored=saved(s),fresh=navigation(restored,seed),rng=s.rng,hits=x.w.hits;
 Game.pause(restored,'qa');const frozen=serialize(restored);Game.tick(restored,30,fresh);assert.equal(serialize(restored),frozen);Game.resume(restored,'qa');
 let continued=0;
 for(let i=0;i<10;i++){
  const now=actors(s);if(!now||!now.close||now.collision||!accepted&&!s.raid.encounterContacts.includes(now.pair))break;
  Game.tick(s,.01,nav);Game.tick(restored,.01,fresh);assert.deepEqual(domain(restored),domain(s));assert.equal(s.rng,rng);assert.equal(s.workers[0].hits,hits);continued++;
 }
 assert.ok(continued>=2,'Actual continuing non-collision contact spans multiple frames');
 let steps=0;
 while((s.raid||restored.raid)&&steps++<3000){Game.tick(s,.05,nav);Game.tick(restored,.05,fresh);assert.deepEqual(domain(restored),domain(s));}
 assert.equal(s.raid,null);assert.equal(restored.raid,null);assert.equal(serialize(restored),serialize(s));
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
