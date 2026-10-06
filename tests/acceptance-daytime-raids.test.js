import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {planDay} from '../src/simulation/raids.js';
import {attraction,nextRandom} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
const cost={warthog:1,hyena:3,buffalo:5,lion:7,rhino:10};
function navigation(s){const n=new Navigation(s.seed,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function add(s,nav,id,species){const i=s.plants.length;Game.plant(s,id,species,8+i%7*2,8+Math.floor(i/7)*2,nav);}
function fixture(culture,seed,value){
 const s=Game.newGame({culture,seed,slotId:`day-${culture}-${seed}-${value}`});Game.resume(s,'intro');s.ledger.balance=rational(20000);const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);
 s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';
 // Exact boundary fixtures at revised prices: 37*267 + 11*11 = 10000;
 // 37*267 + 4*13 + 4*17 = 9999. Keep the contract boundary unchanged.
 const crops=value===10000?[...Array(37).fill('platano'),...Array(11).fill('mijo')]:[...Array(37).fill('platano'),...Array(4).fill('sorgo'),...Array(4).fill('maiz')];
 crops.forEach((species,i)=>add(s,nav,'crop-'+i,species));assert.equal(attraction(s.plants),value);planDay(s);return {s,nav};
}
function saved(s){const map=new Map(),repo=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});repo.save(s);return repo.load(s.slotId);}
function finishRaid(s,nav){for(let i=0;s.raid&&i<4000&&!s.result;i++)Game.tick(s,.05,nav);assert.equal(s.raid,null);assert.equal(s.result,null);}

for(const culture of Game.CULTURES)for(const seed of [1,4,712,123456789])for(const when of ['exact','before','after'])test(`QA-102: ${culture}/${seed} crossing 10000 ${when} the real candidate is evaluated once and survives reload`,()=>{
 const {s,nav}=fixture(culture,seed,when==='exact'?10000:9999),at=s.dayPlan.at;
 assert.ok(at>=115/2.4&&at<535/2.4);Game.tick(s,at-.05,nav);assert.equal(s.dayPlan.done,false);assert.equal(s.raid,null);
 if(when==='before'){add(s,nav,'cross-before','mijo');assert.equal(attraction(s.plants),10010);}
 const probe={rng:s.rng},oldRng=s.rng,accepted=when!=='after'&&nextRandom(probe)<.1,loaded=saved(s),fresh=navigation(loaded);
 assert.equal(serialize(loaded),serialize(s));Game.tick(s,.06,nav);Game.tick(loaded,.06,fresh);assert.equal(serialize(loaded),serialize(s));assert.equal(s.dayPlan.done,true);
 assert.equal(!!s.raid,accepted);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,Number(accepted));
 if(when==='after'){assert.equal(s.rng,oldRng);add(s,nav,'cross-after','mijo');assert.equal(attraction(s.plants),10010);}
 else if(!accepted)assert.equal(s.rng,probe.rng);
 if(accepted){assert.equal(s.raid.daytime,true);const spent=s.raid.animals.reduce((n,a)=>n+cost[a.species],0);assert.ok(spent>=6&&spent<=10);}
 const count=s.events.filter(e=>e.type==='RaidSpawned').length,rng=s.rng;
 Game.tick(s,1,nav);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,count);assert.equal(s.dayPlan.done,true);if(!s.raid)assert.equal(s.rng,rng);
 if(when==='after'){Game.tick(s,299-s.time,nav);assert.equal(s.raid,null);assert.equal(s.rng,rng);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,0);}
});

for(const culture of Game.CULTURES)for(const seed of [1,4])test(`QA-103: ${culture}/${seed} the same real day has independent daytime and nighttime raids`,()=>{
 const {s,nav}=fixture(culture,seed,10000);Game.tick(s,s.dayPlan.at+.01,nav);assert.equal(s.raid.daytime,true);const firstId=s.raid.id,group=s.raid.animals.map(a=>a.species);
 finishRaid(s,nav);assert.equal(s.day,3);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);assert.ok(s.time<300);
 Game.tick(s,300.01-s.time,nav);assert.equal(s.nightPlan.done,false);assert.ok(s.nightPlan.group.length>0);assert.equal(s.nightPlan.attraction,attraction(s.plants));
 const loaded=saved(s),fresh=navigation(loaded),remaining=s.nightPlan.at-s.time+.01;
 Game.tick(s,remaining,nav);Game.tick(loaded,remaining,fresh);assert.equal(serialize(loaded),serialize(s));assert.ok(s.raid);assert.equal(s.raid.daytime,false);assert.notEqual(s.raid.id,firstId);
 assert.equal(s.day,3);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,2);assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);assert.equal(s.dayPlan.done,true);assert.ok(group.length>0);
 finishRaid(s,nav);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,2);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,2);assert.equal(s.result,null);
});
